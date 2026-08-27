import { Telegraf, Context } from "telegraf";
import express, { Request, Response } from "express";
import config from "./config";
import { ensureUserExists, isAdminMiddleware } from "./middlewares";
import { registerBasicHandlers } from "./handlers/basicHandlers";
import { registerProductHandlers } from "./handlers/productHandlers";
import { registerCartHandlers } from "./handlers/cartHandlers";
import { registerOrderHandlers } from "./handlers/orderHandlers";
import { registerAdminHandlers } from "./handlers/adminHandlers";
import {
  handleViewProducts,
  handleProductDetail,
  handleAddToCart,
  handleBuyNow,
} from "./handlers/productHandlers";
import { handleViewCart, handleRemoveFromCart, handleClearCart } from "./handlers/cartHandlers";
import { handleViewOrders, handleOrderDetail } from "./handlers/orderHandlers";
import {
  handleAdminPanel,
  handleAdminProducts,
  handleAdminCategories,
  handleAdminOrders,
  handleAdminOrdersList,
  handleAdminStats,
  handleAdminLogs,
  handleCreateProduct,
  handleListProducts,
  handleCreateCategory,
  handleListCategories,
  handleSelectProductCategory,
} from "./handlers/adminHandlers";
import { handleCheckout, handleCancelCheckout } from "./handlers/checkoutHandlers";
import { processWebhookNotification } from "./services/paymentService";
import { decrementOrderStock } from "./services/orderService";
import supabase from "./database";

// Initialize Express and Bot
const app = express();
const bot = new Telegraf<Context>(config.telegram.token);

bot.catch((error, ctx) => {
  console.error("Unhandled bot update error:", error, {
    updateId: ctx.update.update_id,
    telegramId: ctx.from?.id,
  });
});

// Middleware
app.use(express.json());

// Bot middleware
bot.use(ensureUserExists);

// Register command handlers
registerBasicHandlers(bot);
registerProductHandlers(bot);
registerCartHandlers(bot);
registerOrderHandlers(bot);
registerAdminHandlers(bot);

// Handle callback queries (inline buttons)
bot.on("callback_query", async (ctx) => {
  try {
    const data = (ctx.callbackQuery as any)?.data || "";

    // Confirm the button click before database calls or message sending.
    await ctx.answerCbQuery();

    if (data === "view_products") {
      await handleViewProducts(ctx);
    } else if (data === "view_cart") {
      await handleViewCart(ctx);
    } else if (data === "view_orders") {
      await handleViewOrders(ctx);
    } else if (data === "view_support") {
      const { getStoreConfig } = await import("./database");
      const storeConfig = await getStoreConfig();
      const supportText = storeConfig?.support_message || "Entre em contato conosco para suporte.";
      await ctx.reply(`ℹ️ SUPORTE\n\n${supportText}`);
    } else if (data === "back_to_menu" || data === "admin_panel") {
      if (data === "admin_panel") {
        if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
          await ctx.reply("🔐 Acesso negado.");
        } else {
          await handleAdminPanel(ctx);
        }
      } else {
        const { handleHome } = await import("./handlers/basicHandlers");
        await handleHome(ctx);
      }
    } else if (data?.startsWith("product_")) {
      const productId = data.replace("product_", "");
      await handleProductDetail(ctx, productId);
    } else if (data?.startsWith("add_to_cart_")) {
      const parts = data.replace("add_to_cart_", "").split("_");
      const productId = parts[0];
      const quantity = parseInt(parts[1]) || 1;
      await handleAddToCart(ctx, productId, quantity);
    } else if (data?.startsWith("remove_cart_")) {
      const cartItemId = data.replace("remove_cart_", "");
      await handleRemoveFromCart(ctx, cartItemId);
    } else if (data?.startsWith("delete_cart_")) {
      const cartItemId = data.replace("delete_cart_", "");
      await handleRemoveFromCart(ctx, cartItemId);
    } else if (data === "clear_cart") {
      await handleClearCart(ctx);
    } else if (data === "checkout") {
      await handleCheckout(ctx);
    } else if (data?.startsWith("buy_now_")) {
      await handleBuyNow(ctx, data.replace("buy_now_", ""));
    } else if (data === "cancel_checkout") {
      await handleCancelCheckout(ctx);
    } else if (data?.startsWith("order_")) {
      const orderId = data.replace("order_", "");
      await handleOrderDetail(ctx, orderId);
    } else if (data?.startsWith("admin_")) {
      if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
        await ctx.reply("🔐 Acesso negado.");
      } else if (data === "admin_products") {
        await handleAdminProducts(ctx);
      } else if (data === "admin_categories") {
        await handleAdminCategories(ctx);
      } else if (data === "admin_orders") {
        await handleAdminOrders(ctx);
      } else if (data === "admin_stats") {
        await handleAdminStats(ctx);
      } else if (data === "admin_logs") {
        await handleAdminLogs(ctx);
      } else if (data === "admin_create_product") {
        await handleCreateProduct(ctx);
      } else if (data === "admin_list_products") {
        await handleListProducts(ctx);
      } else if (data === "admin_create_category") {
        await handleCreateCategory(ctx);
      } else if (data === "admin_list_categories") {
        await handleListCategories(ctx);
      } else if (data === "admin_orders_all") {
        await handleAdminOrdersList(ctx, "all");
      } else if (data === "admin_orders_paid") {
        await handleAdminOrdersList(ctx, "paid");
      } else if (data === "admin_orders_pending") {
        await handleAdminOrdersList(ctx, "pending");
      } else if (data === "admin_orders_cancelled") {
        await handleAdminOrdersList(ctx, "cancelled");
      } else if (data === "admin_orders_delivered") {
        await handleAdminOrdersList(ctx, "delivered");
      }
    } else if (data?.startsWith("select_category_")) {
      await handleSelectProductCategory(ctx, data.replace("select_category_", ""));
    }

  } catch (error) {
    console.error("Error handling callback query:", error);
  }
});

// Webhook endpoint for Mercado Pago
app.post("/webhooks/mercadopago", async (req: Request, res: Response) => {
  try {
    const { action, type, data } = req.body;
    const paymentId = data?.id || req.body.id;

    if (!(action === "payment.created" || action === "payment.updated" || type === "payment") || !paymentId) {
      res.json({ received: true });
      return;
    }

    res.json({ received: true });

    // Log the webhook
    const { error: logError } = await supabase.from("webhook_logs").insert({
      provider: "mercado_pago",
      event_type: action || type || "payment",
      payload: data,
      processed: false,
    });

    if (logError) {
      console.error("Error logging webhook:", logError);
    }

    // Process the payment after acknowledging the notification.
    const { getPaymentStatus } = await import("./services/paymentService");
    const payment = await getPaymentStatus(paymentId);

    if (payment) {
      const orderId = payment.external_reference;

      // Get order from database
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, order_items(quantity, products(name))")
        .eq("id", orderId)
        .single();

      if (!orderError && order) {
        const statusChanged = order.payment_status !== payment.status;

        if (!statusChanged) {
          console.log("Mercado Pago notification already processed", { orderId, paymentId });
          return;
        }

        // Process the payment
        await processWebhookNotification(paymentId, orderId, order.total);

        if (payment.status === "approved") {
          await decrementOrderStock(orderId);
        }

        // Send notification to user
        const { data: user } = await supabase
          .from("users")
          .select("telegram_id")
          .eq("id", order.user_id)
          .single();

          if (user) {
            const { getStoreConfig } = await import("./database");
            const storeConfig = await getStoreConfig();

            let message = "";
            if (payment.status === "approved") {
              message = storeConfig?.payment_approved_message || "Pagamento aprovado!";
              message += `\n\n✅ Pedido #${orderId.substring(0, 8)}\n💰 Total: R$ ${(order.total / 100).toFixed(2)}`;
              message += "\n\n📦 Produtos:\n";
              for (const item of order.order_items || []) {
                message += `• ${item.products?.name || "Produto"} x${item.quantity}\n`;
              }
              message += `\n🔑 Token de entrega: ${order.delivery_token || "consulte o pedido"}`;
              message += `\n\n📲 Para receber o produto, fale no WhatsApp ${config.support.whatsappDisplay}.`;
              message += "\nEnvie o token e um print desta tela de pagamento aprovado.";
            } else if (payment.status === "pending") {
              message = storeConfig?.payment_pending_message || "Pagamento pendente.";
            } else if (payment.status === "rejected") {
              message = storeConfig?.payment_rejected_message || "Pagamento recusado.";
            }

            try {
              await bot.telegram.sendMessage(user.telegram_id, message, {
                reply_markup: {
                  inline_keyboard: [[
                    {
                      text: "📲 Falar no WhatsApp",
                      url: `https://wa.me/${config.support.whatsappNumber}`,
                    },
                  ]],
                },
              });
            } catch (error) {
              console.error("Error sending Telegram message:", error);
            }
          }
        }
      }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Register Telegram webhook before accepting requests.
const telegramWebhookHandler = bot.webhookCallback(config.server.webhookPath);
app.post(config.server.webhookPath, (req, res, next) => {
  if (
    config.telegram.webhookSecret &&
    req.header("x-telegram-bot-api-secret-token") !== config.telegram.webhookSecret
  ) {
    res.sendStatus(401);
    return;
  }

  console.log("📨 Telegram update received", {
    updateId: req.body?.update_id,
    path: req.path,
  });
  return telegramWebhookHandler(req, res, next);
});

// Start server and register Telegram webhook.
const PORT = config.server.port || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    if (config.server.nodeEnv === "production" && !config.server.publicUrl.startsWith("https://")) {
      throw new Error(
        "Defina PUBLIC_URL com o domínio https:// da Railway ou gere um domínio público para preencher RAILWAY_PUBLIC_DOMAIN."
      );
    }

    const webhookUrl = `${config.server.publicUrl.replace(/\/$/, "")}${config.server.webhookPath}`;
    await bot.telegram.setWebhook(webhookUrl, {
      ...(config.telegram.webhookSecret
        ? { secret_token: config.telegram.webhookSecret }
        : {}),
    });
    console.log(`✅ Telegram webhook registered at ${webhookUrl}`);
  } catch (error) {
    console.error("Error registering Telegram webhook:", error);
    process.exit(1);
  }
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

export default bot;
