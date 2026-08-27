import { Context } from "telegraf";
import { getUserByTelegramId } from "../database";
import { getCartSummary, clearCart } from "../services/cartService";
import { getProductById } from "../services/productService";
import { createOrder } from "../services/orderService";
import { createPixPayment } from "../services/paymentService";

export async function handleCheckout(ctx: Context, onlyProductId?: string) {
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

    const cartSummary = onlyProductId ? null : await getCartSummary(user.id);
    const checkoutItems = onlyProductId
      ? await getDirectCheckoutItem(onlyProductId)
      : cartSummary?.items || [];

    if (checkoutItems.length === 0) {
      await ctx.reply("🛒 Seu carrinho está vazio.");
      return;
    }

    // Create order
    const orderItems = checkoutItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const checkoutTotal = checkoutItems.reduce((total, item) => total + item.subtotal, 0);
    const order = await createOrder(user.id, checkoutTotal, orderItems);
    const amountInReais = checkoutTotal / 100;
    
    console.log("📦 Criando pagamento PIX para ordem:", order.id);
    const payment = await createPixPayment(
      order.id,
      user.id,
      amountInReais
    );
    console.log("✅ Pagamento criado:", payment.id);

    // Send payment link to user
    let confirmMessage = "💳 RESUMO DO PEDIDO\n\n";

    for (const item of checkoutItems) {
      confirmMessage += `📦 ${item.product_name}\n`;
      confirmMessage += `   Qtd: ${item.quantity} x R$ ${(item.unit_price / 100).toFixed(2)}\n`;
      confirmMessage += `   Subtotal: R$ ${(item.subtotal / 100).toFixed(2)}\n\n`;
    }

    confirmMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    confirmMessage += `💰 TOTAL: R$ ${(checkoutTotal / 100).toFixed(2)}\n\n`;
    confirmMessage += "Escaneie o QR Code ou copie e cole o código PIX abaixo.\n";
    confirmMessage += "O pedido será confirmado após a aprovação do pagamento.";

    console.log("📤 Enviando mensagem de confirmação");
    await ctx.reply(confirmMessage, {
      reply_markup: {
        inline_keyboard: [
          ...(payment.ticketUrl ? [[{ text: "📲 Abrir pagamento", url: payment.ticketUrl }]] : []),
          [{ text: "❌ Cancelar", callback_data: "cancel_checkout" }],
        ],
      },
    });
    console.log("✅ Mensagem de confirmação enviada");

    if (payment.qrCodeBase64) {
      console.log("📸 Enviando QR Code");
      try {
        await ctx.replyWithPhoto(
          { source: Buffer.from(payment.qrCodeBase64, "base64") },
          { caption: "📲 QR CODE PIX\nAponte a câmera do seu banco para pagar." }
        );
        console.log("✅ QR Code enviado");
      } catch (photoError) {
        console.error("❌ Erro ao enviar QR Code:", photoError);
      }
    }

    if (payment.qrCode) {
      console.log("📋 Enviando código PIX");
      try {
        await ctx.reply(
          `📋 PIX copia e cola:\n\n<code>${payment.qrCode}</code>\n\nToque no código para copiar e cole no aplicativo do seu banco.`,
          { parse_mode: "HTML" }
        );
        console.log("✅ Código PIX enviado");
      } catch (codeError) {
        console.error("❌ Erro ao enviar código PIX:", codeError);
      }
    }

    // Direct purchases do not use the cart. Clear it only for regular checkout.
    if (!onlyProductId) {
      await clearCart(user.id);
    }
    
    console.log("✅ Checkout completado com sucesso");
  } catch (error) {
    console.error("❌ Erro em handleCheckout:", error);
    console.error("Stack:", (error as any).stack);
    try {
      await ctx.reply("⚠️ Ocorreu um erro ao processar sua compra.\n\nTente novamente ou fale conosco no WhatsApp.");
    } catch (replyError) {
      console.error("❌ Erro ao enviar mensagem de erro:", replyError);
    }
  }
}

async function getDirectCheckoutItem(productId: string) {
  const product = await getProductById(productId);
  if (!product || !product.active || product.stock < 1) return [];

  return [{
    id: "direct-checkout",
    product_id: product.id,
    product_name: product.name,
    quantity: 1,
    unit_price: product.price,
    subtotal: product.price,
  }];
}

export async function handleCancelCheckout(ctx: Context) {
  try {
    await ctx.reply("❌ Compra cancelada.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍️ Ver Produtos", callback_data: "view_products" }],
          [{ text: "🛒 Ver Carrinho", callback_data: "view_cart" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleCancelCheckout:", error);
    await ctx.reply("⚠️ Ocorreu um erro.");
  }
}
