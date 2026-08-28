import { Request, Response, Router } from "express";
import { createHash, randomBytes } from "crypto";
import supabase from "../database";
import jwt from "jsonwebtoken";
import { createShopPixPayment } from "../services/paymentService";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

router.use((req: Request, res: Response, next) => {
  const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const requestOrigin = req.header("Origin")?.replace(/\/$/, "");

  if (requestOrigin && (allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin))) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
    res.header("Vary", "Origin");
  }
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
    const { shop_number, full_name, cpf, password, phone, email } = req.body;
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
      .insert({ shop_id: shop.id, full_name, cpf: String(cpf).replace(/\D/g, ""), password_hash: hashPassword(password), phone, email })
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

    const { name, description, price, stock, category_id, image_url, compare_at_price, promotion_label, delivery_type, delivery_content, delivery_items } = req.body;

    const { data: product, error } = await supabase
      .from("shop_products")
      .insert({
        shop_id,
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        compare_at_price,
        promotion_label,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: deliveryError } = await supabase.from("shop_product_deliveries").upsert({
      product_id: product.id,
      delivery_type: delivery_type === "automatic" ? "automatic" : "manual",
      delivery_content: delivery_content || "Entrega manual pelo lojista",
    }, { onConflict: "product_id" });
    if (deliveryError) throw deliveryError;
    const stockItems = Array.isArray(delivery_items) ? delivery_items.filter((item: unknown): item is string => typeof item === "string" && item.trim()).map((item: string) => ({ product_id: product.id, content: item.trim() })) : [];
    if (stockItems.length) {
      const { error: stockError } = await supabase.from("shop_delivery_stock").insert(stockItems);
      if (stockError) throw stockError;
    }

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

router.get("/purchases", verifyToken, async (req: Request, res: Response) => {
  if (req.user.user_type !== "customer") return res.status(403).json({ error: "Only customers can view purchases" });
  const { data, error } = await supabase.from("shop_orders").select("*, shop_order_items(*, shop_products(name, image_url)), shop_deliveries(*)").eq("shop_id", req.user.shop_id).eq("user_id", req.user.user_id).order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Internal server error" });
  res.json(data || []);
});

router.get("/orders/:id/payment", verifyToken, async (req: Request, res: Response) => {
  const { data: order, error } = await supabase.from("shop_orders").select("id, status, payment_status, delivery_token, delivery_notified_at").eq("id", req.params.id).eq("shop_id", req.user.shop_id).eq("user_id", req.user.user_id).single();
  if (error || !order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

router.get("/shop", verifyToken, async (req: Request, res: Response) => {
  const { data: shop, error } = await supabase.from("shops").select("*, shop_configs(*)").eq("id", req.user.shop_id).single();
  if (error || !shop) return res.status(404).json({ error: "Shop not found" });
  res.json(shop);
});

router.get("/customers", verifyToken, async (req: Request, res: Response) => {
  if (req.user.user_type !== "owner") return res.status(403).json({ error: "Only owners can view customers" });
  const { data, error } = await supabase.from("shop_users").select("id, full_name, cpf, phone, is_active, created_at, last_login").eq("shop_id", req.user.shop_id).order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Internal server error" });
  res.json(data || []);
});

router.patch("/shop/config", verifyToken, async (req: Request, res: Response) => {
  if (req.user.user_type !== "owner") return res.status(403).json({ error: "Only owners can edit shop settings" });
  const allowed = ["banner_image_url", "logo_url", "welcome_message", "support_message", "whatsapp_number", "whatsapp_display", "theme_primary_color", "theme_accent_color"];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const { data, error } = await supabase.from("shop_configs").upsert({ shop_id: req.user.shop_id, ...updates }, { onConflict: "shop_id" }).select().single();
  if (error) return res.status(500).json({ error: "Could not save shop settings" });
  res.json(data);
});

router.get("/cart", verifyToken, async (req: Request, res: Response) => {
  if (req.user.user_type !== "customer") return res.status(403).json({ error: "Only customers have a cart" });
  const { data, error } = await supabase.from("shop_cart_items").select("*, shop_products(*)").eq("shop_id", req.user.shop_id).eq("user_id", req.user.user_id);
  if (error) return res.status(500).json({ error: "Internal server error" });
  res.json(data || []);
});

router.post("/cart", verifyToken, async (req: Request, res: Response) => {
  if (req.user.user_type !== "customer") return res.status(403).json({ error: "Only customers have a cart" });
  const { product_id, quantity = 1 } = req.body;
  const { data: product } = await supabase.from("shop_products").select("id, stock").eq("id", product_id).eq("shop_id", req.user.shop_id).eq("active", true).single();
  if (!product || quantity < 1 || quantity > product.stock) return res.status(400).json({ error: "Produto indisponível ou quantidade inválida" });
  const { data, error } = await supabase.from("shop_cart_items").upsert({ shop_id: req.user.shop_id, user_id: req.user.user_id, product_id, quantity }, { onConflict: "user_id,product_id" }).select("*, shop_products(*)").single();
  if (error) return res.status(500).json({ error: "Could not update cart" });
  res.status(201).json(data);
});

router.delete("/cart/:productId", verifyToken, async (req: Request, res: Response) => {
  const { error } = await supabase.from("shop_cart_items").delete().eq("shop_id", req.user.shop_id).eq("user_id", req.user.user_id).eq("product_id", req.params.productId);
  if (error) return res.status(500).json({ error: "Could not remove cart item" });
  res.json({ success: true });
});

router.patch("/products/:id", verifyToken, async (req: Request, res: Response) => {
  if (req.user.user_type !== "owner") return res.status(403).json({ error: "Only owners can edit products" });
  const allowed = ["name", "description", "price", "stock", "image_url", "category_id", "active", "compare_at_price", "promotion_label"];
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

    let query = supabase.from("shop_orders").select("*, shop_order_items(*, shop_products(name, image_url)), shop_deliveries(*)").eq("shop_id", shop_id);

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
    const { items, checkout_key } = req.body;

    if (req.user.user_type !== "customer") {
      return res.status(403).json({ error: "Only customers can checkout" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    if (!checkout_key || typeof checkout_key !== "string") {
      return res.status(400).json({ error: "Checkout key is required" });
    }

    const { data: existingOrder } = await supabase.from("shop_orders").select("*, shop_payments(*)").eq("shop_id", shop_id).eq("user_id", user_id).eq("checkout_key", checkout_key).maybeSingle();
    if (existingOrder) {
      const existingPayment = Array.isArray(existingOrder.shop_payments) ? existingOrder.shop_payments[0] : existingOrder.shop_payments;
      return res.json({ order: existingOrder, payment: existingPayment ? { id: existingPayment.mercado_pago_id, qrCode: existingPayment.qr_code, qrCodeBase64: existingPayment.qr_code_base64, ticketUrl: existingPayment.ticket_url } : null, payment_url: existingPayment?.ticket_url || null, reused: true });
    }

    // Calculate total
    let total = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from("shop_products")
        .select("*")
        .eq("id", item.product_id)
        .eq("shop_id", shop_id)
        .eq("active", true)
        .single();

      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock) {
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
        delivery_token: randomBytes(16).toString("hex").toUpperCase(),
        checkout_key,
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

    const { data: customer } = await supabase.from("shop_users").select("email").eq("id", user_id).eq("shop_id", shop_id).single();
    const payment = await createShopPixPayment(order.id, customer?.email, total / 100, shop_id);
    await supabase.from("shop_cart_items").delete().eq("shop_id", shop_id).eq("user_id", user_id);

    res.json({
      order,
      payment,
      payment_url: payment.ticketUrl,
    });
  } catch (error) {
    console.error("Error creating checkout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
