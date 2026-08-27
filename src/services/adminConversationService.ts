import supabase from "../database";
import { logger } from "../utils/logger";

export interface ConversationState {
  state: string;
  data: Record<string, any>;
}

export async function getUserConversationState(
  userId: string,
  telegramId: number
): Promise<ConversationState | null> {
  try {
    const { data, error } = await supabase
      .from("user_conversation_states")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("Error fetching conversation state", error, { userId });
      throw error;
    }

    return data
      ? { state: data.state, data: data.data || {} }
      : { state: "idle", data: {} };
  } catch (error) {
    logger.error("Failed to get conversation state", error, { userId });
    return null;
  }
}

export async function updateUserConversationState(
  userId: string,
  telegramId: number,
  state: string,
  data: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_conversation_states")
      .upsert(
        {
          user_id: userId,
          telegram_id: telegramId,
          state,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      logger.error("Error updating conversation state", error, { userId, state });
      return false;
    }

    logger.debug("Conversation state updated", { userId, state });
    return true;
  } catch (error) {
    logger.error("Failed to update conversation state", error, { userId });
    return false;
  }
}

export async function clearUserConversationState(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_conversation_states")
      .update({ state: "idle", data: {} })
      .eq("user_id", userId);

    if (error) {
      logger.error("Error clearing conversation state", error, { userId });
      return false;
    }

    logger.debug("Conversation state cleared", { userId });
    return true;
  } catch (error) {
    logger.error("Failed to clear conversation state", error, { userId });
    return false;
  }
}

export async function logAdminAction(
  adminId: number,
  action: string,
  description: string,
  status: "success" | "error" | "pending" = "pending",
  errorMessage?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase.from("admin_logs").insert({
      admin_id: adminId,
      action,
      description,
      status,
      error_message: errorMessage || null,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error("Error logging admin action", error, { adminId, action });
      return false;
    }

    logger.info(`Admin action logged: ${action}`, { adminId, status });
    return true;
  } catch (error) {
    logger.error("Failed to log admin action", error, { adminId, action });
    return false;
  }
}

export async function getAdminLogs(
  adminId: number,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("admin_logs")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error fetching admin logs", error, { adminId });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Failed to fetch admin logs", error, { adminId });
    return [];
  }
}
