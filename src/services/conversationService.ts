import supabase from "../database";
import { ConversationState, UserConversationState } from "../types";

export async function getUserConversationState(userId: string) {
  const { data, error } = await supabase
    .from("user_conversation_states")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function setUserConversationState(
  userId: string,
  telegramId: number,
  state: ConversationState,
  data: Record<string, any> = {}
) {
  const existingState = await getUserConversationState(userId);

  if (existingState) {
    const { data: updatedState, error } = await supabase
      .from("user_conversation_states")
      .update({
        state,
        data,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return updatedState;
  }

  const { data: newState, error } = await supabase
    .from("user_conversation_states")
    .insert({
      user_id: userId,
      telegram_id: telegramId,
      state,
      data,
    })
    .select()
    .single();

  if (error) throw error;
  return newState;
}

export async function clearUserConversationState(userId: string) {
  const { error } = await supabase
    .from("user_conversation_states")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateConversationStateData(
  userId: string,
  key: string,
  value: any
) {
  const state = await getUserConversationState(userId);

  if (!state) {
    throw new Error("No conversation state found for user");
  }

  const updatedData = {
    ...state.data,
    [key]: value,
  };

  const { data, error } = await supabase
    .from("user_conversation_states")
    .update({
      data: updatedData,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationStateData(userId: string, key: string) {
  const state = await getUserConversationState(userId);
  return state?.data[key] || null;
}
