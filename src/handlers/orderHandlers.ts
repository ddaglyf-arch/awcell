import { Context, Telegraf } from "telegraf";
import { getUserOrders } from "../services/orderService";
import { getUserByTelegramId } from "../database";
import { PaymentStatus, OrderStatus } from "../types";

const paymentStatusEmojis: Record<string, string> = {
  [PaymentStatus.PENDING]: "⏳",
  [PaymentStatus.APPROVED]: "✅",
  [PaymentStatus.REJECTED]: "❌",
  [PaymentStatus.CANCELLED]: "🚫",
  [PaymentStatus.EXPIRED]: "⏰",
};

const orderStatusEmojis: Record<string, string> = {
  [OrderStatus.PENDING]: "⏳",
  [OrderStatus.PAID]: "✅",
  [OrderStatus.DELIVERED]: "📦",
  [OrderStatus.CANCELLED]: "❌",
};

export async function handleViewOrders(ctx: Context) {
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

    const orders = await getUserOrders(user.id);

    if (orders.length === 0) {
      await ctx.reply("📦 Você ainda não tem pedidos.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🛍️ Ver Produtos", callback_data: "view_products" }]],
        },
      });
      return;
    }

    let message = "📦 MEUS PEDIDOS\n\n";

    for (const order of orders) {
      const createdDate = new Date(order.created_at).toLocaleDateString("pt-BR");
      const paymentStatusEmoji = paymentStatusEmojis[order.payment_status];
      const orderStatusEmoji = orderStatusEmojis[order.status];

      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Pedido: #${order.id.substring(0, 8)}\n`;
      message += `Data: ${createdDate}\n`;
      message += `${orderStatusEmoji} Status: ${order.status}\n`;
      message += `${paymentStatusEmoji} Pagamento: ${order.payment_status}\n`;
      message += `💰 Total: R$ ${(order.total / 100).toFixed(2)}\n`;
      message += `📦 Itens: ${order.order_items?.length || 0}\n\n`;
    }

    const keyboard = orders.slice(0, 5).map((order) => [
      { text: `Pedido #${order.id.substring(0, 8)}`, callback_data: `order_${order.id}` },
    ]);

    keyboard.push([{ text: "🏠 Voltar", callback_data: "back_to_menu" }]);

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  } catch (error) {
    console.error("Error in handleViewOrders:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao carregar seus pedidos.");
  }
}

export async function handleOrderDetail(ctx: Context, orderId: string) {
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

    const { getOrderById } = await import("../services/orderService");
    const order = await getOrderById(orderId);

    if (!order || order.user_id !== user.id) {
      await ctx.reply("📦 Pedido não encontrado.");
      return;
    }

    const createdDate = new Date(order.created_at).toLocaleDateString("pt-BR");
    const paymentStatusEmoji = paymentStatusEmojis[order.payment_status];
    const orderStatusEmoji = orderStatusEmojis[order.status];

    let message = `📦 DETALHES DO PEDIDO\n\n`;
    message += `Pedido: #${order.id.substring(0, 8)}\n`;
    message += `Data: ${createdDate}\n`;
    message += `${orderStatusEmoji} Status: ${order.status}\n`;
    message += `${paymentStatusEmoji} Pagamento: ${order.payment_status}\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `PRODUTOS:\n\n`;

    for (const item of order.order_items || []) {
      message += `📦 ${item.products.name}\n`;
      message += `   Quantidade: ${item.quantity}\n`;
      message += `   Unitário: R$ ${(item.unit_price / 100).toFixed(2)}\n`;
      message += `   Subtotal: R$ ${(item.subtotal / 100).toFixed(2)}\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 TOTAL: R$ ${(order.total / 100).toFixed(2)}\n`;

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          ...(order.payment_status !== PaymentStatus.APPROVED
            ? [[{ text: "💳 Pagar Agora", callback_data: `pay_order_${orderId}` }]]
            : []),
          [{ text: "⬅️ Voltar", callback_data: "view_orders" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleOrderDetail:", error);
    await ctx.reply("⚠️ Ocorreu um erro ao carregar o pedido.");
  }
}

export function registerOrderHandlers(bot: Telegraf<Context>) {
  bot.command("pedidos", handleViewOrders);
}
