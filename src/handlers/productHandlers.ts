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

    // Enviar banner com primeiro produto
    const firstProduct = products[0];
    const caption = `🛍️ ${firstProduct.name}\n\n${firstProduct.description}\n\n💰 R$ ${(firstProduct.price / 100).toFixed(2)}\n📦 Estoque: ${firstProduct.stock}`;
    const keyboard = {
      inline_keyboard: [
        [{ text: "💳 Comprar agora via PIX", callback_data: `buy_now_${firstProduct.id}` }],
        [{ text: "🛒 Adicionar ao carrinho", callback_data: `add_to_cart_${firstProduct.id}_1` }],
        [{ text: "🔎 Ver detalhes", callback_data: `product_${firstProduct.id}` }],
      ],
    };

    if (firstProduct.image_url) {
      await ctx.replyWithPhoto(firstProduct.image_url, { caption, reply_markup: keyboard });
    } else {
      await ctx.reply(caption, { reply_markup: keyboard });
    }

    // Enviar resto dos produtos em grupos de 3 (para não bombard)
    const batchSize = 3;
    for (let i = 1; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      let productsList = "🛍️ MAIS PRODUTOS\n\n";
      
      for (const product of batch) {
        productsList += `📦 ${product.name}\n`;
        productsList += `💰 R$ ${(product.price / 100).toFixed(2)} | 📊 Estoque: ${product.stock}\n`;
        productsList += `ID: <code>${product.id}</code>\n\n`;
      }

      const batchKeyboard = {
        inline_keyboard: batch.map((product) => [
          { text: `${product.name} - R$ ${(product.price / 100).toFixed(2)}`, callback_data: `product_${product.id}` },
        ]),
      };

      await ctx.reply(productsList, {
        reply_markup: batchKeyboard,
        parse_mode: "HTML",
      });

      // Pequeno delay entre batches para evitar rate limit
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await ctx.reply("🛍️ FIM DO CATÁLOGO", {
      reply_markup: { inline_keyboard: [[{ text: "🏠 Voltar", callback_data: "back_to_menu" }]] },
    });
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
