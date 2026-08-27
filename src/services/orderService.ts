import supabase from "../database";
import { Order, OrderStatus, PaymentStatus } from "../types";
import { randomBytes } from "crypto";

export async function createOrder(
  userId: string,
  total: number,
  cartItems: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>
) {
  // Create order
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      total,
      status: OrderStatus.PENDING,
      payment_status: PaymentStatus.PENDING,
      delivery_token: randomBytes(8).toString("hex").toUpperCase(),
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = cartItems.map((item) => ({
    order_id: orderData.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.unit_price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return orderData;
}

export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function decrementOrderStock(orderId: string) {
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (itemsError) throw itemsError;

  for (const item of items || []) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single();

    if (productError) throw productError;
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${item.product_id}`);
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: product.stock - item.quantity, updated_at: new Date().toISOString() })
      .eq("id", item.product_id);

    if (updateError) throw updateError;
  }
}

export async function getUserOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(name, image_url))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { data, error } = await supabase
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentId?: string
) {
  const updates: any = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };

  if (paymentId) {
    updates.payment_id = paymentId;
  }

  if (paymentStatus === PaymentStatus.APPROVED) {
    updates.status = OrderStatus.PAID;
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrdersByPaymentStatus(paymentStatus: PaymentStatus) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_status", paymentStatus)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*, users(first_name, last_name, username), order_items(*, products(name))")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOrderStats() {
  // Total orders
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact" });

  // Paid orders
  const { count: paidOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("payment_status", PaymentStatus.APPROVED);

  // Total revenue
  const { data: orderData } = await supabase
    .from("orders")
    .select("total")
    .eq("payment_status", PaymentStatus.APPROVED);

  const totalRevenue = orderData?.reduce((sum, order) => sum + order.total, 0) || 0;

  // Pending orders
  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("payment_status", PaymentStatus.PENDING);

  return {
    total_orders: totalOrders || 0,
    paid_orders: paidOrders || 0,
    pending_orders: pendingOrders || 0,
    total_revenue: totalRevenue,
  };
}

export async function getOrdersByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .eq("payment_status", PaymentStatus.APPROVED)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}
