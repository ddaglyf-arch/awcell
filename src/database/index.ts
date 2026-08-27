import { createClient } from "@supabase/supabase-js";
import config from "../config";

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

export default supabase;

// Helper functions for database operations
export async function getUserByTelegramId(telegramId: number) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function createOrUpdateUser(
  telegramId: number,
  username: string | null,
  firstName: string,
  lastName: string | null
) {
  const existingUser = await getUserByTelegramId(telegramId);

  if (existingUser) {
    const { data, error } = await supabase
      .from("users")
      .update({
        username,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      last_name: lastName,
      role: "user",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStoreConfig() {
  const { data, error } = await supabase
    .from("store_config")
    .select("*")
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function updateStoreConfig(updates: Record<string, any>) {
  const config = await getStoreConfig();

  if (!config) {
    const { data, error } = await supabase
      .from("store_config")
      .insert(updates)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("store_config")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", config.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
