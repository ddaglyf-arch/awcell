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
import supabase from "./database";
import { createPurchaseReceiptPdf } from "./utils/receiptPdf";

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

// API Routes
import apiRouter from "./routes/api";
app.use("/api", apiRouter);

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
      } else if (data === "admin_shops_menu") {
          const { handleAdminManageUsers } = await import("./handlers/adminShopHandlers");
          await handleAdminManageUsers(ctx);
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
      } else if (data === "admin_list_shops") {
        const { handleAdminListShops } = await import("./handlers/adminShopHandlers");
        await handleAdminListShops(ctx);
      } else if (data === "admin_create_shop_form") {
        const { handleAdminCreateShop } = await import("./handlers/adminShopHandlers");
        await handleAdminCreateShop(ctx);
      } else if (data === "admin_edit_shop") {
        const { handleAdminEditShop } = await import("./handlers/adminShopHandlers");
        await handleAdminEditShop(ctx);
      } else if (data === "admin_deactivate_shop") {
        const { handleAdminDeactivateShop } = await import("./handlers/adminShopHandlers");
        await handleAdminDeactivateShop(ctx);
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
      } else if (
        data === "admin_edit_product" ||
        data === "admin_delete_product" ||
        data === "admin_stock_product" ||
        data === "admin_edit_category" ||
        data === "admin_delete_category"
      ) {
        await ctx.reply("⚠️ Esta função está sendo preparada. Use Criar, Listar ou Voltar por enquanto.", {
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Voltar", callback_data: data.includes("category") ? "admin_categories" : "admin_products" }]],
          },
        });
      } else {
        await ctx.reply("⚠️ Opção administrativa não reconhecida.", {
          reply_markup: {
            inline_keyboard: [[{ text: "🔐 Voltar ao painel", callback_data: "admin_panel" }]],
          },
        });
      }
    } else if (data?.startsWith("select_category_")) {
      await handleSelectProductCategory(ctx, data.replace("select_category_", ""));
    }

  } catch (error) {
    console.error("❌ Erro ao processar botão:", error);
    console.error("Dados do callback:", (ctx.callbackQuery as any)?.data);
    console.error("Stack:", (error as any)?.stack);
    try {
      await ctx.answerCbQuery("Erro ao processar. Tente novamente.", { show_alert: false });
      await ctx.reply("⚠️ Erro ao processar sua ação. Tente novamente.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🏠 Voltar ao Início", callback_data: "back_to_menu" }]],
        },
      });
    } catch (replyError) {
      console.error("❌ Erro ao enviar mensagem de erro:", replyError);
    }
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
        const shouldNotifyApproved = payment.status === "approved" && !order.delivery_notified_at;

        if (!statusChanged && !shouldNotifyApproved) {
          console.log("Mercado Pago notification already processed", { orderId, paymentId });
          return;
        }

        // Process the payment
        if (statusChanged) {
          await processWebhookNotification(paymentId, orderId, order.total);
        }

        if (payment.status === "approved" && statusChanged) {
          const { decrementOrderStock } = await import("./services/orderService");
          await decrementOrderStock(orderId);
        }

        // Send notification to user
        const { data: user } = await supabase
          .from("users")
          .select("telegram_id, first_name, last_name")
          .eq("id", order.user_id)
          .single();

          if (user) {
            const { getStoreConfig } = await import("./database");
            const storeConfig = await getStoreConfig();
            const customerName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Cliente";

            let message = "";
            if (payment.status === "approved") {
              message = storeConfig?.payment_approved_message || "✅ PAGAMENTO APROVADO COM SUCESSO!";
              message += `\n${'═'.repeat(40)}\n`;
              message += `\n👤 Cliente: <b>${customerName}</b>\n`;
              message += `📋 Pedido: <code>#${orderId.substring(0, 8).toUpperCase()}</code>\n`;
              message += `💰 Valor Total: R$ ${(order.total / 100).toFixed(2)}\n`;
              message += `📅 Data: ${new Date(order.created_at).toLocaleDateString('pt-BR')}\n`;
              message += `${'═'.repeat(40)}\n`;
              message += "\n📦 PRODUTOS:\n";
              for (const item of order.order_items || []) {
                message += `  • ${item.products?.name || "Produto"}\n`;
                message += `    └─ Qtd: ${item.quantity} x R$ ${(item.unit_price / 100).toFixed(2)}\n`;
              }
              message += `\n${'═'.repeat(40)}\n`;
              message += `\n🔑 <b>TOKEN DE ENTREGA:</b>\n<code>${order.delivery_token || "CONSULTE SEU PEDIDO"}</code>\n`;
              message += `\n📲 <b>PRÓXIMO PASSO:</b>\n`;
              message += `Envie o token acima + screenshot desta tela\n`;
              message += `no WhatsApp para receber seu pedido.\n`;
              message += `\n⏱️ Tempo de entrega: Até 24 horas\n`;
            } else if (payment.status === "pending") {
              message = storeConfig?.payment_pending_message || "⏳ PAGAMENTO PENDENTE";
              message += `\n\nAguardando confirmação do pagamento...\nTente novamente em alguns instantes.`;
            } else if (payment.status === "rejected") {
              message = storeConfig?.payment_rejected_message || "❌ PAGAMENTO RECUSADO";
              message += `\n\nOcorreu um problema ao processar seu pagamento.\nTente novamente ou entre em contato conosco.`;
            }

            try {
              await bot.telegram.sendMessage(user.telegram_id, message, {
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [[
                    {
                      text: "📲 Falar no WhatsApp",
                      url: `https://wa.me/${config.support.whatsappNumber}?text=Olá, preciso do meu pedido. Token: ${order.delivery_token || "consulte o pedido"}`,
                    },
                  ]],
                },
              });

              if (payment.status === "approved") {
                try {
                  const receiptPdf = createPurchaseReceiptPdf({
                    orderId,
                    customerName,
                    customerTelegramId: user.telegram_id,
                    createdAt: order.created_at,
                    paymentMethod: "PIX / Mercado Pago",
                    total: order.total,
                    deliveryToken: order.delivery_token || "CONSULTAR PEDIDO",
                    whatsapp: config.support.whatsappDisplay,
                    items: (order.order_items || []).map((item: any) => ({
                      name: item.products?.name || "Produto",
                      quantity: item.quantity,
                      unitPrice: item.unit_price,
                      subtotal: item.subtotal || item.unit_price * item.quantity,
                    })),
                  });

                  console.log("📄 Enviando PDF do comprovante para", user.telegram_id);
                  
                  await bot.telegram.sendDocument(
                    user.telegram_id,
                    { source: receiptPdf, filename: `comprovante-${orderId.substring(0, 8)}.pdf` },
                    { 
                      caption: `📄 Comprovante da compra #${orderId.substring(0, 8)}\n\nEnvie este arquivo junto com o token de entrega (${order.delivery_token || "consultar"}) no WhatsApp para receber seu pedido.`,
                      parse_mode: "HTML"
                    },
                  );

                  console.log("✅ PDF enviado com sucesso para", user.telegram_id);
                } catch (pdfError) {
                  console.error("❌ Erro ao enviar PDF:", pdfError);
                  // Send a backup text message with the PDF info
                  try {
                    await bot.telegram.sendMessage(
                      user.telegram_id,
                      `📄 Comprovante da compra:\n\nPedido #${orderId.substring(0, 8)}\nToken: ${order.delivery_token || "CONSULTAR"}\n\nSeu comprovante foi processado! Acesse o histórico de pedidos para mais detalhes.`
                    );
                  } catch (backupError) {
                    console.error("❌ Erro ao enviar mensagem de backup:", backupError);
                  }
                }

                await supabase
                  .from("orders")
                  .update({ delivery_notified_at: new Date().toISOString() })
                  .eq("id", orderId)
                  .is("delivery_notified_at", null);
              }
            } catch (error) {
              console.error("❌ Erro ao enviar notificação de pagamento:", error);
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
