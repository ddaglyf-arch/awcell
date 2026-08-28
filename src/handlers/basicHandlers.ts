import { Context, Telegraf } from "telegraf";
import { getUserByTelegramId } from "../database";
import { getStoreConfig } from "../database";
import { getActiveProducts } from "../services/productService";
import { getCartSummary } from "../services/cartService";
import { getUserOrders } from "../services/orderService";
import { DEFAULT_BANNER_IMAGE_URL } from "../config";

export async function handleStart(ctx: Context) {
  if (!ctx.from) {
    return;
  }

  try {
    const storeConfig = await getStoreConfig();
    const user = await getUserByTelegramId(ctx.from.id);

    let welcomeText = "🏪 MINHA LOJA\n\n";

    if (storeConfig) {
      welcomeText += `${storeConfig.welcome_message}\n\n`;

      const bannerImageUrl = storeConfig.banner_image_url || DEFAULT_BANNER_IMAGE_URL;
      if (bannerImageUrl) {
        try {
          await ctx.replyWithPhoto(bannerImageUrl, {
            caption: `${storeConfig.store_name}\n\n${welcomeText}`,
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛍️ Ver Produtos", callback_data: "view_products" }],
                [{ text: "🛒 Meu Carrinho", callback_data: "view_cart" }],
                [{ text: "📦 Meus Pedidos", callback_data: "view_orders" }],
                [{ text: "ℹ️ Suporte", callback_data: "view_support" }],
                ...(user?.role === "admin"
                  ? [[{ text: "🔐 Painel ADM", callback_data: "admin_panel" }]]
                  : []),
              ],
            },
          });
          return;
        } catch (error) {
          console.error("Error sending photo:", error);
        }
      }
    }

    welcomeText += "Bem-vindo à nossa loja!\n\n";

    await ctx.reply(welcomeText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍️ Ver Produtos", callback_data: "view_products" }],
          [{ text: "🛒 Meu Carrinho", callback_data: "view_cart" }],
          [{ text: "📦 Meus Pedidos", callback_data: "view_orders" }],
          [{ text: "ℹ️ Suporte", callback_data: "view_support" }],
          ...(user?.role === "admin"
            ? [[{ text: "🔐 Painel ADM", callback_data: "admin_panel" }]]
            : []),
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleStart:", error);
    await ctx.reply("⚠️ Ocorreu um erro. Tente novamente em alguns instantes.");
  }
}

export async function handleHelp(ctx: Context) {
  const helpText = `
📖 AJUDA

/start - Ir para o início
/help - Ver este menu
/loja - Ver informações da loja
/produtos - Ver todos os produtos
/carrinho - Ver meu carrinho
/pedidos - Ver meus pedidos
/suporte - Falar com suporte

Comandos para administrador:
/admin - Acessar painel de administração
/gerenciar - Gerenciar lojas
`;

  await ctx.reply(helpText);
}

export async function handleAdmin(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply("⚠️ Erro ao identificar usuário.");
    return;
  }

  try {
    const { handleAdminPanel } = await import("./adminHandlers");
    await handleAdminPanel(ctx);
  } catch (error) {
    console.error("Error in handleAdmin:", error);
  }
}

export async function handleHome(ctx: Context) {
  if (!ctx.from) {
    return;
  }

  try {
    const user = await getUserByTelegramId(ctx.from.id);

    const homeText = `
🏠 INÍCIO

Bem-vindo à nossa loja!

Escolha uma opção:
`;

    await ctx.reply(homeText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍️ Ver Produtos", callback_data: "view_products" }],
          [{ text: "🛒 Meu Carrinho", callback_data: "view_cart" }],
          [{ text: "📦 Meus Pedidos", callback_data: "view_orders" }],
          [{ text: "ℹ️ Suporte", callback_data: "view_support" }],
          ...(user?.role === "admin"
            ? [[{ text: "🔐 Painel ADM", callback_data: "admin_panel" }]]
            : []),
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleHome:", error);
    await ctx.reply("⚠️ Ocorreu um erro. Tente novamente em alguns instantes.");
  }
}

export function registerBasicHandlers(bot: Telegraf<Context>) {
  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("home", handleHome);
  bot.command("início", handleHome);
  bot.command("admin", handleAdmin);
}
