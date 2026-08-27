import supabase from "../database";
import { CartItem } from "../types";
import { getProductById } from "./productService";

export async function getCartItems(userId: string) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*, products(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity: number
) {
  // Check if item already exists in cart
  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .single();

  if (existing) {
    // Update quantity
    const { data, error } = await supabase
      .from("cart_items")
      .update({
        quantity: existing.quantity + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Create new cart item
  const { data, error } = await supabase
    .from("cart_items")
    .insert({
      user_id: userId,
      product_id: productId,
      quantity,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFromCart(cartItemId: string) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId);

  if (error) throw error;
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
) {
  if (quantity <= 0) {
    await removeFromCart(cartItemId);
    return null;
  }

  const { data, error } = await supabase
    .from("cart_items")
    .update({
      quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cartItemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function clearCart(userId: string) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

export async function calculateCartTotal(userId: string) {
  const items = await getCartItems(userId);

  let total = 0;
  for (const item of items) {
    total += item.products.price * item.quantity;
  }

  return total;
}

export async function getCartSummary(userId: string) {
  const items = await getCartItems(userId);
  let total = 0;
  let itemCount = 0;

  const summary = items.map((item) => {
    const subtotal = item.products.price * item.quantity;
    total += subtotal;
    itemCount += item.quantity;

    return {
      id: item.id,
      product_id: item.product_id,
      product_name: item.products.name,
      quantity: item.quantity,
      unit_price: item.products.price,
      subtotal,
    };
  });

  return {
    items: summary,
    total,
    item_count: itemCount,
  };
}
