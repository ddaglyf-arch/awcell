import supabase from "../database";
import { DigitalDelivery } from "../types";

export async function createDigitalDelivery(
  productId: string,
  orderId: string,
  userId: string,
  deliveryType: "link" | "code" | "text" | "file",
  deliveryContent: string
) {
  const { data, error } = await supabase
    .from("digital_deliveries")
    .insert({
      product_id: productId,
      order_id: orderId,
      user_id: userId,
      delivery_type: deliveryType,
      delivery_content: deliveryContent,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDeliveryByOrderAndProduct(
  orderId: string,
  productId: string
): Promise<DigitalDelivery | null> {
  const { data, error } = await supabase
    .from("digital_deliveries")
    .select("*")
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function getUserDeliveries(userId: string) {
  const { data, error } = await supabase
    .from("digital_deliveries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDeliveryById(deliveryId: string): Promise<DigitalDelivery | null> {
  const { data, error } = await supabase
    .from("digital_deliveries")
    .select("*")
    .eq("id", deliveryId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function createProductDeliveryTemplate(
  productId: string,
  deliveryType: "link" | "code" | "text" | "file",
  deliveryContent: string
) {
  const { data, error } = await supabase
    .from("product_deliveries")
    .insert({
      product_id: productId,
      delivery_type: deliveryType,
      delivery_content: deliveryContent,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProductDeliveryTemplate(productId: string) {
  const { data, error } = await supabase
    .from("product_deliveries")
    .select("*")
    .eq("product_id", productId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function updateProductDeliveryTemplate(
  productId: string,
  updates: { delivery_type?: string; delivery_content?: string }
) {
  const { data, error } = await supabase
    .from("product_deliveries")
    .update(updates)
    .eq("product_id", productId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
