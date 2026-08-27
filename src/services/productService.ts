import supabase from "../database";
import { Product, Category } from "../types";

export async function getActiveProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProductById(productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("id", productId)
    .single();

  if (error) throw error;
  return data;
}

export async function getProductsByCategory(categoryId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createProduct(
  name: string,
  description: string,
  price: number,
  categoryId: string,
  stock: number,
  imageUrl: string | null,
  deliveryType: "digital" | "physical"
) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      description,
      price,
      category_id: categoryId,
      stock,
      image_url: imageUrl,
      delivery_type: deliveryType,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(
  productId: string,
  updates: Partial<Product>
) {
  const { data, error } = await supabase
    .from("products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw error;
}

export async function toggleProductActive(
  productId: string,
  active: boolean
) {
  return updateProduct(productId, { active });
}

export async function updateProductStock(productId: string, newStock: number) {
  return updateProduct(productId, { stock: newStock });
}

export async function decrementProductStock(productId: string, quantity: number) {
  const product = await getProductById(productId);

  if (!product) throw new Error("Product not found");
  if (product.stock < quantity)
    throw new Error("Insufficient stock available");

  return updateProductStock(productId, product.stock - quantity);
}

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCategoryById(categoryId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  if (error) throw error;
  return data;
}

export async function createCategory(
  name: string,
  description: string | null = null
) {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      description,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<Category>
) {
  const { data, error } = await supabase
    .from("categories")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) throw error;
}

export async function toggleCategoryActive(categoryId: string, active: boolean) {
  return updateCategory(categoryId, { active });
}
