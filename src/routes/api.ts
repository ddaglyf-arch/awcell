import { Request, Response, Router } from "express";
import { createHash } from "crypto";
import supabase from "../database";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

router.use((req: Request, res: Response, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || "*";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function generateToken(shopId: string, userId: string, userType: "owner" | "customer"): string {
  return jwt.sign(
    { shop_id: shopId, user_id: userId, user_type: userType },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Middleware to verify token
export function verifyToken(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ============================================
// AUTH ROUTES
// ============================================

// Login route
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { shop_number, username, password, type } = req.body;

    if (!shop_number || !username || !password || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get shop
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("shop_number", shop_number)
      .single();

    if (shopError || !shop) {
      return res.status(401).json({ error: "Shop not found" });
    }

    // Check if shop is active
    if (!shop.is_active || new Date(shop.plan_expires_at) < new Date()) {
      return res.status(403).json({ error: "Shop is not active or expired" });
    }

    if (type === "owner") {
      // Owner login
      if (!verifyPassword(password, shop.owner_password_hash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(shop.id, shop.id, "owner");

      return res.json({
        token,
        user: {
          id: shop.id,
          username: shop.owner_username,
          name: shop.owner_name,
          role: "owner",
        },
        shop,
      });
    } else if (type === "customer") {
      // Customer login
      const { data: customer, error: customerError } = await supabase
        .from("shop_users")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("cpf", username)
        .single();

      if (customerError || !customer) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!verifyPassword(password, customer.password_hash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(shop.id, customer.id, "customer");

      return res.json({
        token,
        user: {
          id: customer.id,
          name: customer.full_name,
          cpf: customer.cpf,
          role: "customer",
        },
        shop,
      });
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/dashboard", verifyToken, async (req: Request, res: Response) => {
  try {
    const { shop_id, user_type } = req.user;
    const { password } = req.body;

    if (user_type !== "owner" || !password) {
      return res.status(403).json({ error: "Dashboard access denied" });
    }

    const { data: shop, error } = await supabase
      .from("shops")
      .select("dashboard_password_hash, is_active, plan_expires_at")
      .eq("id", shop_id)
      .single();

    if (error || !shop || !shop.is_active || new Date(shop.plan_expires_at) < new Date()) {
      return res.status(403).json({ error: "Shop is not active or expired" });
    }

    if (!verifyPassword(password, shop.dashboard_password_hash)) {
      return res.status(401).json({ error: "Invalid dashboard password" });
    }

    res.json({ access: true });
  } catch (error) {
    console.error("Dashboard authentication error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { shop_number, full_name, cpf, password, phone } = req.body;
    if (!shop_number || !full_name || !cpf || !password || password.length < 6) {
      return res.status(400).json({ error: "Nome, CPF e senha de pelo menos 6 caracteres são obrigatórios" });
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id, shop_name, shop_number, is_active, plan_expires_at")
      .eq("shop_number", shop_number)
      .single();

    if (!shop || !shop.is_active || new Date(shop.plan_expires_at) < new Date()) {
      return res.status(403).json({ error: "Loja não encontrada ou plano expirado" });
    }

    const { data: customer, error } = await supabase
      .from("shop_users")
      .insert({ shop_id: shop.id, full_name, cpf: String(cpf).replace(/\D/g, ""), password_hash: hashPassword(password), phone })
      .select("id, full_name, cpf, shop_id")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "CPF já cadastrado nesta loja" });
      throw error;
    }

    res.status(201).json({
      token: generateToken(shop.id, customer.id, "customer"),
      user: { id: customer.id, name: customer.full_name, cpf: customer.cpf, role: "customer" },
      shop,
    });
  } catch (error) {
    console.error("Customer registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// PRODUCT ROUTES
// ============================================

// Get all products for the shop
router.get("/products", verifyToken, async (req: Request, res: Response) => {
  try {
    const { shop_id } = req.user;

    const { data: products, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("shop_id", shop_id)
      .eq("active", true);

    if (error) throw error;

    res.json(products || []);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new product
router.post("/products", verifyToken, async (req: Request, res: Response) => {
  try {
    const { shop_id, user_type } = req.user;

    if (user_type !== "owner") {
      return res.status(403).json({ error: "Only owners can create products" });
    }

    const { name, description, price, stock, category_id } = req.body;

    const { data: product, error } = await supabase
      .from("shop_products")
      .insert({
        shop_id,
        name,
        description,
        price,
        stock,
        category_id,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a product
router.delete("/products/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const { shop_id, user_type } = req.user;
    const { id } = req.params;

    if (user_type !== "owner") {
      return res.status(403).json({ error: "Only owners can delete products" });
    }

    const { error } = await supabase
      .from("shop_products")
      .delete()
      .eq("id", id)
      .eq("shop_id", shop_id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// SHOP ROUTES
// ============================================

// Get all active shops
router.get("/shops", async (req: Request, res: Response) => {
  try {
    const { data: shops, error } = await supabase
      .from("shops")
      .select("*")
      .eq("is_active", true)
      .gte("plan_expires_at", new Date().toISOString());

    if (error) throw error;

    // Get config for each shop
    const shopsWithConfig = await Promise.all(
      (shops || []).map(async (shop: any) => {
        const { data: config } = await supabase
          .from("shop_configs")
          .select("*")
          .eq("shop_id", shop.id)
          .single();

        return { ...shop, config };
      })
    );

    res.json(shopsWithConfig);
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get products for a specific shop
router.get("/shops/:id/products", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("id", id)
      .eq("is_active", true)
      .gte("plan_expires_at", new Date().toISOString())
      .single();

    if (shopError || !shop) return res.status(404).json({ error: "Shop not found" });

    const { data: products, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("shop_id", id)
      .eq("active", true);

    if (error) throw error;

    res.json(products || []);
  } catch (error) {
    console.error("Error fetching shop products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/categories", verifyToken, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("shop_categories")
    .select("*")
    .eq("shop_id", req.user.shop_id)
    .eq("active", true)
    .order("display_order");
  if (error) return res.status(500).json({ error: "Internal server error" });
  res.json(data || []);
});

router.patch("/products/:id", verifyToken, async (req: Request, res: Response) => {
  if (req.user.user_type !== "owner") return res.status(403).json({ error: "Only owners can edit products" });
  const allowed = ["name", "description", "price", "stock", "image_url", "category_id", "active"];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const { data, error } = await supabase.from("shop_products").update(updates).eq("id", req.params.id).eq("shop_id", req.user.shop_id).select().single();
  if (error) return res.status(500).json({ error: "Internal server error" });
  res.json(data);
});

// ============================================
// ORDER ROUTES
// ============================================

// Get orders for the authenticated user
router.get("/orders", verifyToken, async (req: Request, res: Response) => {
  try {
    const { shop_id, user_id, user_type } = req.user;

    let query = supabase.from("shop_orders").select("*").eq("shop_id", shop_id);

    if (user_type === "customer") {
      query = query.eq("user_id", user_id);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    res.json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// STATS ROUTES
// ============================================

// Get shop stats
router.get("/stats", verifyToken, async (req: Request, res: Response) => {
  try {
    const { shop_id, user_type } = req.user;

    if (user_type !== "owner") {
      return res.status(403).json({ error: "Only owners can view stats" });
    }

    // Get total products
    const { count: totalProducts } = await supabase
      .from("shop_products")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop_id);

    // Get orders this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);

    const { count: ordersThisMonth } = await supabase
      .from("shop_orders")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop_id)
      .gte("created_at", firstDayOfMonth.toISOString());

    // Get sales this month
    const { data: salesData } = await supabase
      .from("shop_orders")
      .select("total")
      .eq("shop_id", shop_id)
      .eq("payment_status", "approved")
      .gte("created_at", firstDayOfMonth.toISOString());

    const salesThisMonth = (salesData || []).reduce((sum: number, order: { total?: number }) => sum + (order.total || 0), 0);

    res.json({
      totalProducts,
      ordersThisMonth,
      salesThisMonth,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// CHECKOUT ROUTES
// ============================================

// Create checkout
router.post("/checkout", verifyToken, async (req: Request, res: Response) => {
  try {
    const { shop_id, user_id } = req.user;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total
    let total = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from("shop_products")
        .select("*")
        .eq("id", item.product_id)
        .single();

      if (!product) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }

      const subtotal = product.price * item.quantity;
      total += subtotal;

      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal,
      });
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("shop_orders")
      .insert({
        shop_id,
        user_id,
        total,
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    for (const item of orderItems) {
      await supabase.from("shop_order_items").insert({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      });
    }

    // TODO: Generate payment with Mercado Pago
    // For now, return a mock payment URL

    res.json({
      order,
      payment_url: `https://mercadopago.com/checkout/payment?order=${order.id}`,
    });
  } catch (error) {
    console.error("Error creating checkout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
