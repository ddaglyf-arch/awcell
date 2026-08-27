import { Context, Telegraf } from "telegraf";
import { getActiveProducts, getProductById, getActiveCategories } from "../services/productService";
import { addToCart } from "../services/cartService";
import { getUserByTelegramId } from "../database";
import { handleCheckout } from "./checkoutHandlers";
import { DEFAULT_BANNER_IMAGE_URL } from "../config";

export async function handleViewProducts(ctx: Context) {
  try {
    const products = await getActiveProducts();

    if (products.length === 0) {
      await ctx.reply("📦 Nenhum produto disponível no momento.");
      return;
    }

    await ctx.reply(`🛍️ LOJA\n\n${products.length} produto(s) disponível(is). Escolha um item:`, {
      reply_markup: { inline_keyboard: [[{ text: "🏠 Voltar", callback_data: "back_to_menu" }]] },
    });

    await ctx.replyWithPhoto(DEFAULT_BANNER_IMAGE_URL, {
      caption: "🛍️ Confira nosso catálogo",
    });

    for (const product of products) {
      const caption = `🛍️ ${product.name}\n\n${product.description}\n\n💰 R$ ${(product.price / 100).toFixed(2)}\n📦 Estoque: ${product.stock}`;
      const keyboard = {
        inline_keyboard: [
          [{ text: "💳 Comprar agora via PIX", callback_data: `buy_now_${product.id}` }],
          [{ text: "🛒 Adicionar ao carrinho", callback_data: `add_to_cart_${product.id}_1` }],
          [{ text: "🔎 Ver detalhes", callback_data: `product_${product.id}` }],
        ],
      };
      if (product.image_url) {
        await ctx.replyWithPhoto(product.image_url, { caption, reply_markup: keyboard });
      } else {
        await ctx.reply(caption, { reply_markup: keyboard });
      }
    }
  } catch (error) {
    console.error("Error in handleViewProducts:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao carregar os produtos.");
  }
}

export async function handleProductDetail(ctx: Context, productId: string) {
  try {
    const product = await getProductById(productId);

    if (!product) {
      await ctx.reply("📦 Produto não encontrado.");
      return;
    }

    let message = `\n🖼️ ${product.name}\n\n`;
    message += `📝 ${product.description}\n\n`;
    message += `💰 Preço: R$ ${(product.price / 100).toFixed(2)}\n`;
    message += `📦 Em estoque: ${product.stock} unidades\n`;

    if (product.image_url) {
      try {
        await ctx.replyWithPhoto(product.image_url, {
          caption: message,
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛒 Adicionar ao Carrinho", callback_data: `add_to_cart_${productId}_1` }],
              [{ text: "💳 Comprar Agora", callback_data: `buy_now_${productId}` }],
              [{ text: "⬅️ Voltar", callback_data: "view_products" }],
            ],
          },
        });
        return;
      } catch (error) {
        console.error("Error sending product photo:", error);
      }
    }

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Adicionar ao Carrinho", callback_data: `add_to_cart_${productId}_1` }],
          [{ text: "💳 Comprar Agora", callback_data: `buy_now_${productId}` }],
          [{ text: "⬅️ Voltar", callback_data: "view_products" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleProductDetail:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao carregar o produto.");
  }
}

export async function handleAddToCart(ctx: Context, productId: string, quantity: number = 1) {
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

    const product = await getProductById(productId);
    if (!product) {
      await ctx.reply("📦 Produto não encontrado.");
      return;
    }

    if (product.stock < quantity) {
      await ctx.reply("⚠️ Estoque insuficiente para este produto.");
      return;
    }

    await addToCart(user.id, productId, quantity);
    await ctx.reply(`✅ ${product.name} adicionado ao carrinho!`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Ver Carrinho", callback_data: "view_cart" }],
          [{ text: "🛍️ Continuar Comprando", callback_data: "view_products" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleAddToCart:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao adicionar o produto ao carrinho.");
  }
}

export async function handleBuyNow(ctx: Context, productId: string) {
  try {
    if (!ctx.from) return;
    const user = await getUserByTelegramId(ctx.from.id);
    const product = await getProductById(productId);
    if (!user || !product) {
      await ctx.reply("⚠️ Produto ou usuário não encontrado.");
      return;
    }
    if (!product.active || product.stock < 1) {
      await ctx.reply("⚠️ Este produto está sem estoque no momento.");
      return;
    }
    await handleCheckout(ctx, productId);
  } catch (error) {
    console.error("Error in handleBuyNow:", error);
    await ctx.reply("⚠️ Não foi possível gerar o PIX. Tente novamente.");
  }
}

export function registerProductHandlers(bot: Telegraf<Context>) {
  bot.command("produtos", handleViewProducts);
  bot.command("loja", handleViewProducts);
}
