import { Context } from "telegraf";
import config from "../config";
import { getUserByTelegramId, createOrUpdateUser } from "../database";

export async function ensureUserExists(ctx: Context, next: () => Promise<void>) {
  try {
    if (!ctx.from) {
      return next();
    }

    const telegramId = ctx.from.id;
    const username = ctx.from.username || null;
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name || null;

    await createOrUpdateUser(telegramId, username, firstName, lastName);

    return next();
  } catch (error) {
    console.error("Error in ensureUserExists middleware:", error);
    return next();
  }
}

export async function isAdminMiddleware(ctx: Context, next: () => Promise<void>) {
  if (!ctx.from) {
    await ctx.reply("⚠️ Erro ao identificar o usuário.");
    return;
  }

  const isAdmin = ctx.from.id === config.telegram.adminId;

  if (!isAdmin) {
    await ctx.reply("🔐 Você não tem permissão para acessar este recurso.");
    return;
  }

  return next();
}

export function createAdminMiddleware(ctx: Context, next: () => Promise<void>) {
  if (!ctx.from) {
    return;
  }

  const isAdmin = ctx.from.id === config.telegram.adminId;

  if (!isAdmin) {
    return;
  }

  return next();
}

export async function errorHandler(ctx: Context) {
  try {
    console.error("Unexpected error:", ctx);
    await ctx.reply("⚠️ Ocorreu um erro inesperado. Tente novamente em alguns instantes.");
  } catch (error) {
    console.error("Error in error handler:", error);
  }
}
