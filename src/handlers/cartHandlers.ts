import { Context, Telegraf } from "telegraf";
import { getCartSummary, clearCart, removeFromCart, updateCartItemQuantity } from "../services/cartService";
import { getUserByTelegramId } from "../database";

export async function handleViewCart(ctx: Context) {
  try {
    if (!ctx.from) {
      await ctx.reply("⚠️ Erro ao identificar o usuário.");
      return;
    }

    const user = await getUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("⚠️ Usuário não encontrado.");
      return;
    }

    const cartSummary = await getCartSummary(user.id);

    if (cartSummary.items.length === 0) {
      await ctx.reply("🛒 Seu carrinho está vazio.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🛍️ Ver Produtos", callback_data: "view_products" }]],
        },
      });
      return;
    }

    let message = "🛒 SEU CARRINHO\n\n";

    for (const item of cartSummary.items) {
      message += `📦 ${item.product_name}\n`;
      message += `   Quantidade: ${item.quantity}\n`;
      message += `   Preço unitário: R$ ${(item.unit_price / 100).toFixed(2)}\n`;
      message += `   Subtotal: R$ ${(item.subtotal / 100).toFixed(2)}\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 TOTAL: R$ ${(cartSummary.total / 100).toFixed(2)}\n`;
    message += `📍 Itens: ${cartSummary.item_count}\n`;

    const keyboard: any[] = [];

    for (const item of cartSummary.items) {
      keyboard.push([
        { text: `➖ ${item.product_name}`, callback_data: `remove_cart_${item.id}` },
        { text: "❌", callback_data: `delete_cart_${item.id}` },
      ]);
    }

    keyboard.push([{ text: "💳 Finalizar Compra", callback_data: "checkout" }]);
    keyboard.push([
      { text: "🛒 Limpar Carrinho", callback_data: "clear_cart" },
      { text: "🛍️ Continuar", callback_data: "view_products" },
    ]);

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  } catch (error) {
    console.error("Error in handleViewCart:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao carregar o carrinho.");
  }
}

export async function handleRemoveFromCart(ctx: Context, cartItemId: string) {
  try {
    await removeFromCart(cartItemId);
    await ctx.reply("✅ Produto removido do carrinho.");
    await handleViewCart(ctx);
  } catch (error) {
    console.error("Error in handleRemoveFromCart:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao remover o produto.");
  }
}

export async function handleClearCart(ctx: Context) {
  try {
    if (!ctx.from) {
      await ctx.reply("⚠️ Erro ao identificar o usuário.");
      return;
    }

    const user = await getUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("⚠️ Usuário não encontrado.");
      return;
    }

    await clearCart(user.id);
    await ctx.reply("✅ Carrinho esvaziado.", {
      reply_markup: {
        inline_keyboard: [[{ text: "🛍️ Ver Produtos", callback_data: "view_products" }]],
      },
    });
  } catch (error) {
    console.error("Error in handleClearCart:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao limpar o carrinho.");
  }
}

export function registerCartHandlers(bot: Telegraf<Context>) {
  bot.command("carrinho", handleViewCart);
}
