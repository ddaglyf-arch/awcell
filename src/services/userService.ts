import supabase from "../database";
import { User } from "../types";

export async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserStats() {
  const { data, error } = await supabase
    .from("users")
    .select("*", { count: "exact" });

  if (error) throw error;

  return {
    total_users: data?.length || 0,
  };
}

export async function searchUsers(query: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserRole(userId: string, role: "user" | "admin") {
  const { data, error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserWithOrders(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*, orders(count)")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
