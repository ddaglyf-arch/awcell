import { Context, Telegraf } from "telegraf";
import { config } from "../config";
import {
  getAllProducts,
  getCategories,
  getAllOrders,
  getOrderStats,
} from "../services/orderService";
import { createCategory, createProduct } from "../services/productService";
import supabase from "../database";
import { logger } from "../utils/logger";
import {
  getUserConversationState,
  updateUserConversationState,
  clearUserConversationState,
  logAdminAction,
} from "../services/adminConversationService";
import { getUserByTelegramId } from "../database";

// ===== ADMIN PANEL =====
export async function handleAdminPanel(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      logger.warn("Unauthorized admin access attempt", { telegramId: ctx.from?.id });
      await ctx.reply("🔐 Você não tem permissão para acessar o painel de administração.");
      return;
    }

    logger.info("Admin panel accessed", { adminId: ctx.from.id });

    const adminMenu = `
🔐 PAINEL ADMINISTRATIVO

Bem-vindo! Selecione uma opção:
`;

    await ctx.reply(adminMenu, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Produtos", callback_data: "admin_products" }],
          [{ text: "🗂️ Categorias", callback_data: "admin_categories" }],
          [{ text: "🛒 Pedidos", callback_data: "admin_orders" }],
          [{ text: "📊 Estatísticas", callback_data: "admin_stats" }],
          [{ text: "📋 Logs", callback_data: "admin_logs" }],
          [{ text: "🏠 Voltar", callback_data: "back_to_menu" }],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in handleAdminPanel", error, { telegramId: ctx.from?.id });
    try {
      await ctx.reply("⚠️ Ocorreu um erro ao acessar o painel.");
    } catch (replyError) {
      logger.warn("Could not send admin panel error message", {
        telegramId: ctx.from?.id,
        error: replyError instanceof Error ? replyError.message : String(replyError),
      });
    }
  }
}

// ===== PRODUCTS MANAGEMENT =====
export async function handleAdminProducts(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Products menu accessed", { adminId: ctx.from.id });

    const productsMenu = `
📦 ADMINISTRAÇÃO DE PRODUTOS

Selecione uma opção:
`;

    await ctx.reply(productsMenu, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Criar Produto", callback_data: "admin_create_product" }],
          [{ text: "📋 Listar Produtos", callback_data: "admin_list_products" }],
          [{ text: "✏️ Editar Produto", callback_data: "admin_edit_product" }],
          [{ text: "🗑️ Excluir Produto", callback_data: "admin_delete_product" }],
          [{ text: "📦 Alterar Estoque", callback_data: "admin_stock_product" }],
          [{ text: "⬅️ Voltar", callback_data: "admin_panel" }],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in handleAdminProducts", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro.");
  }
}

export async function handleCreateProduct(ctx: Context) {
  try {
    if (!ctx.from) return;

    const user = await getUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("⚠️ Usuário não encontrado.");
      return;
    }

    logger.info("Create product flow started", { adminId: ctx.from.id });

    await updateUserConversationState(user.id, ctx.from.id, "create_product_name", {});

    await logAdminAction(ctx.from.id, "create_product_start", "Iniciou criação de produto", "pending");

    await ctx.reply(
      "📝 Digite o nome do produto:\n\nExemplo: iPhone 15 Pro",
      {
        reply_markup: {
          force_reply: true,
        },
      }
    );
  } catch (error) {
    logger.error("Error in handleCreateProduct", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro ao iniciar a criação de produto.");
  }
}

export async function handleListProducts(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Listing products", { adminId: ctx.from.id });

    const products = await getAllProducts();

    if (products.length === 0) {
      await ctx.reply("📦 Nenhum produto cadastrado ainda.");
      return;
    }

    let message = `📦 PRODUTOS CADASTRADOS (${products.length})\n\n`;

    products.slice(0, 10).forEach((product: any, index: number) => {
      message += `${index + 1}. ${product.name}\n`;
      message += `   💰 R$ ${(product.price / 100).toFixed(2)}\n`;
      message += `   📦 Estoque: ${product.stock}\n`;
      message += `   ${product.active ? "✅" : "❌"} ${product.active ? "Ativo" : "Inativo"}\n\n`;
    });

    if (products.length > 10) {
      message += `... e mais ${products.length - 10} produtos`;
    }

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Voltar", callback_data: "admin_products" }],
        ],
      },
    });

    logger.info("Products listed successfully", { count: products.length, adminId: ctx.from.id });
  } catch (error) {
    logger.error("Error in handleListProducts", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro ao listar produtos.");
  }
}

export async function handleSelectProductCategory(ctx: Context, categoryId: string) {
  if (!ctx.from || ctx.from.id !== config.telegram.adminId) return;

  const user = await getUserByTelegramId(ctx.from.id);
  if (!user) {
    await ctx.reply("⚠️ Usuário não encontrado.");
    return;
  }

  const state = await getUserConversationState(user.id, ctx.from.id);
  if (!state || state.state !== "create_product_category") {
    await ctx.reply("⚠️ O cadastro do produto expirou. Comece novamente.");
    return;
  }

  await updateUserConversationState(user.id, ctx.from.id, "create_product_stock", {
    ...state.data,
    categoryId,
  });
  await ctx.reply("📦 Digite a quantidade em estoque:", { reply_markup: { force_reply: true } });
}

// ===== CATEGORIES MANAGEMENT =====
export async function handleAdminCategories(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Categories menu accessed", { adminId: ctx.from.id });

    const categoriesMenu = `
🗂️ ADMINISTRAÇÃO DE CATEGORIAS

Selecione uma opção:
`;

    await ctx.reply(categoriesMenu, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Criar Categoria", callback_data: "admin_create_category" }],
          [{ text: "📋 Listar Categorias", callback_data: "admin_list_categories" }],
          [{ text: "✏️ Editar Categoria", callback_data: "admin_edit_category" }],
          [{ text: "🗑️ Excluir Categoria", callback_data: "admin_delete_category" }],
          [{ text: "⬅️ Voltar", callback_data: "admin_panel" }],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in handleAdminCategories", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro.");
  }
}

export async function handleCreateCategory(ctx: Context) {
  try {
    if (!ctx.from) return;

    const user = await getUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("⚠️ Usuário não encontrado.");
      return;
    }

    logger.info("Create category flow started", { adminId: ctx.from.id });

    await updateUserConversationState(user.id, ctx.from.id, "create_category_name", {});

    await logAdminAction(ctx.from.id, "create_category_start", "Iniciou criação de categoria", "pending");

    await ctx.reply(
      "📝 Digite o nome da categoria:\n\nExemplo: Eletrônicos",
      {
        reply_markup: {
          force_reply: true,
        },
      }
    );
  } catch (error) {
    logger.error("Error in handleCreateCategory", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro ao iniciar a criação de categoria.");
  }
}

export async function handleListCategories(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Listing categories", { adminId: ctx.from.id });

    const categories = await getCategories();

    if (categories.length === 0) {
      await ctx.reply("🗂️ Nenhuma categoria cadastrada ainda.");
      return;
    }

    let message = `🗂️ CATEGORIAS CADASTRADAS (${categories.length})\n\n`;

    categories.forEach((cat: any, index: number) => {
      message += `${index + 1}. ${cat.name}\n`;
      message += `   ${cat.active ? "✅" : "❌"} ${cat.active ? "Ativa" : "Inativa"}\n\n`;
    });

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Voltar", callback_data: "admin_categories" }],
        ],
      },
    });

    logger.info("Categories listed successfully", { count: categories.length, adminId: ctx.from.id });
  } catch (error) {
    logger.error("Error in handleListCategories", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro ao listar categorias.");
  }
}

// ===== ORDERS MANAGEMENT =====
export async function handleAdminOrders(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Orders menu accessed", { adminId: ctx.from.id });

    const ordersMenu = `
🛒 ADMINISTRAÇÃO DE PEDIDOS

Selecione um filtro:
`;

    await ctx.reply(ordersMenu, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Todos", callback_data: "admin_orders_all" }],
          [{ text: "✅ Pagos", callback_data: "admin_orders_paid" }],
          [{ text: "⏳ Pendentes", callback_data: "admin_orders_pending" }],
          [{ text: "❌ Cancelados", callback_data: "admin_orders_cancelled" }],
          [{ text: "📦 Entregues", callback_data: "admin_orders_delivered" }],
          [{ text: "⬅️ Voltar", callback_data: "admin_panel" }],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in handleAdminOrders", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro.");
  }
}

export async function handleAdminOrdersList(ctx: Context, filter?: string) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Listing orders", { adminId: ctx.from.id, filter });

    const allOrders = await getAllOrders();
    let orders = allOrders;

    if (filter && filter !== "all") {
      orders = allOrders.filter((order: any) =>
        filter === "paid"
          ? order.payment_status === "approved"
          : filter === "pending"
            ? order.payment_status === "pending"
            : filter === "delivered"
              ? order.status === "delivered"
              : filter === "cancelled"
                ? order.status === "cancelled"
                : true
      );
    }

    if (orders.length === 0) {
      await ctx.reply("🛒 Nenhum pedido encontrado neste filtro.");
      return;
    }

    let message = `🛒 PEDIDOS (${orders.length})\n\n`;

    orders.slice(0, 5).forEach((order: any, index: number) => {
      const statusEmoji = order.status === "delivered" ? "📦" : "⏳";
      const paymentEmoji = order.payment_status === "approved" ? "✅" : "⏳";
      message += `${index + 1}. #${order.id.substring(0, 8)}\n`;
      message += `   ${paymentEmoji} Pagamento: ${order.payment_status}\n`;
      message += `   ${statusEmoji} Status: ${order.status}\n`;
      message += `   💰 Total: R$ ${(order.total / 100).toFixed(2)}\n\n`;
    });

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Voltar", callback_data: "admin_orders" }],
        ],
      },
    });

    logger.info("Orders listed successfully", { count: orders.length, adminId: ctx.from.id });
  } catch (error) {
    logger.error("Error in handleAdminOrdersList", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro ao listar pedidos.");
  }
}

// ===== STATS =====
export async function handleAdminStats(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Accessing stats", { adminId: ctx.from.id });

    const stats = await getOrderStats();
    const products = await getAllProducts();
    const categories = await getCategories();

    let message = `
📊 ESTATÍSTICAS GERAIS

👥 DADOS:
  • Total de pedidos: ${stats.total_orders}
  • Produtos cadastrados: ${products.length}
  • Categorias: ${categories.length}

💰 VENDAS:
  • Pedidos pagos: ${stats.paid_orders}
  • Pedidos pendentes: ${stats.pending_orders}
  • Faturamento total: R$ ${(stats.total_revenue / 100).toFixed(2)}

📈 MÉDIA:
  • Ticket médio: R$ ${stats.paid_orders > 0 ? (stats.total_revenue / stats.paid_orders / 100).toFixed(2) : "0.00"}
`;

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Voltar", callback_data: "admin_panel" }],
        ],
      },
    });

    logger.info("Stats displayed successfully", { adminId: ctx.from.id });
  } catch (error) {
    logger.error("Error in handleAdminStats", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro ao carregar as estatísticas.");
  }
}

// ===== LOGS =====
export async function handleAdminLogs(ctx: Context) {
  try {
    if (!ctx.from || ctx.from.id !== config.telegram.adminId) {
      await ctx.reply("🔐 Acesso negado.");
      return;
    }

    logger.info("Accessing admin logs", { adminId: ctx.from.id });

    const { data: logs, error } = await supabase
      .from("admin_logs")
      .select("*")
      .eq("admin_id", ctx.from.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logger.error("Error fetching logs", error);
      await ctx.reply("⚠️ Erro ao buscar logs.");
      return;
    }

    if (!logs || logs.length === 0) {
      await ctx.reply("📋 Nenhum log encontrado.");
      return;
    }

    let message = `📋 ÚLTIMAS AÇÕES (${logs.length})\n\n`;

    logs.forEach((log: any, index: number) => {
      const statusEmoji = log.status === "success" ? "✅" : log.status === "error" ? "❌" : "⏳";
      const date = new Date(log.created_at).toLocaleString("pt-BR");
      message += `${index + 1}. ${log.action}\n`;
      message += `   ${statusEmoji} ${log.status} - ${date}\n`;
      if (log.description) message += `   📝 ${log.description}\n`;
      if (log.error_message) message += `   ❌ Erro: ${log.error_message}\n`;
      message += "\n";
    });

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Voltar", callback_data: "admin_panel" }],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in handleAdminLogs", error, { telegramId: ctx.from?.id });
    await ctx.reply("⚠️ Ocorreu um erro ao carregar os logs.");
  }
}

export function registerAdminHandlers(bot: Telegraf<Context>) {
  bot.command("admin", handleAdminPanel);

  // Handle text messages for conversations
  bot.on("message", async (ctx) => {
    if (!ctx.from) return;

    try {
      const user = await getUserByTelegramId(ctx.from.id);
      if (!user) return;

      const state = await getUserConversationState(user.id, ctx.from.id);
      if (!state) return;

      const hasText = "text" in ctx.message;
      const text = hasText ? ctx.message.text : "";

      if (state.state === "create_product_image") {
        const imageUrl = text === "/skip" ? null : text.trim();
        if (imageUrl !== null) {
          try {
            const parsedUrl = new URL(imageUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
              throw new Error("Invalid protocol");
            }
          } catch {
            await ctx.reply("❌ Link inválido. Digite uma URL iniciando com http:// ou https://, ou /skip.");
            return;
          }
        }

        if (imageUrl === "") {
          await ctx.reply("🔗 Digite o link da imagem do produto ou /skip para continuar sem imagem.");
          return;
        }

        const product = await createProduct(
          state.data.name,
          state.data.description,
          state.data.price,
          state.data.categoryId,
          state.data.stock,
          imageUrl,
          "physical"
        );
        await clearUserConversationState(user.id);
        await logAdminAction(ctx.from.id, "create_product", `Produto '${product.name}' criado`, "success");
        await ctx.reply("✅ Produto criado com sucesso! Ele já está disponível na loja.");
        return;
      }

      if (state.state === "create_product_stock") {
        const stock = Number.parseInt(text, 10);
        if (!Number.isInteger(stock) || stock < 0) {
          await ctx.reply("❌ Estoque inválido. Digite um número inteiro maior ou igual a zero.");
          return;
        }

        await updateUserConversationState(user.id, ctx.from.id, "create_product_image", {
          ...state.data,
          stock,
        });
        await ctx.reply("🔗 Agora digite o link da imagem do produto.\n\nExemplo: https://site.com/imagem.jpg\n\nSe preferir, digite /skip para continuar sem imagem.", {
          reply_markup: { force_reply: true },
        });
        return;
      }

      // Handle product name input
      if (state.state === "create_product_name") {
        await updateUserConversationState(user.id, ctx.from.id, "create_product_description", {
          name: text,
        });

        await ctx.reply(
          "📝 Digite a descrição do produto:\n\nExemplo: Smartphone de alta performance com câmera profissional",
          {
            reply_markup: {
              force_reply: true,
            },
          }
        );

        logger.info("Product name received", { adminId: ctx.from.id });
        return;
      }

      // Handle product description input
      if (state.state === "create_product_description") {
        await updateUserConversationState(user.id, ctx.from.id, "create_product_price", {
          ...state.data,
          description: text,
        });

        await ctx.reply(
          "💰 Digite o preço do produto em REAIS:\n\nExemplo: 1999.99",
          {
            reply_markup: {
              force_reply: true,
            },
          }
        );

        logger.info("Product description received", { adminId: ctx.from.id });
        return;
      }

      // Handle product price input
      if (state.state === "create_product_price") {
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await ctx.reply("❌ Preço inválido. Digite um valor numérico positivo.");
          return;
        }

        const categories = await getCategories();

        await updateUserConversationState(user.id, ctx.from.id, "create_product_category", {
          ...state.data,
          price: Math.round(price * 100), // Convert to cents
        });

        let categoryMessage = "🗂️ Selecione a categoria do produto:\n\n";
        const keyboard = categories.map((cat: any) => [
          { text: cat.name, callback_data: `select_category_${cat.id}` },
        ]);

        await ctx.reply(categoryMessage, {
          reply_markup: {
            inline_keyboard: keyboard,
          },
        });

        logger.info("Product price received", { adminId: ctx.from.id, price });
        return;
      }

      // Handle category name input
      if (state.state === "create_category_name") {
        await updateUserConversationState(user.id, ctx.from.id, "create_category_description", {
          name: text,
        });

        await ctx.reply(
          "📝 Digite a descrição da categoria (opcional):\n\nOu digite /skip para pular",
          {
            reply_markup: {
              force_reply: true,
            },
          }
        );

        logger.info("Category name received", { adminId: ctx.from.id });
        return;
      }

      // Handle category description input
      if (state.state === "create_category_description") {
        if (text === "/skip") {
          const result = await createCategory(state.data.name, "");
          if (result) {
            await logAdminAction(ctx.from.id, "create_category", `Categoria '${state.data.name}' criada`, "success");
            logger.info("Category created successfully", { adminId: ctx.from.id, category: state.data.name });
            await ctx.reply("✅ Categoria criada com sucesso!");
          } else {
            await logAdminAction(ctx.from.id, "create_category", `Erro ao criar categoria '${state.data.name}'`, "error");
            logger.error("Failed to create category", new Error("Unknown error"), { adminId: ctx.from.id });
            await ctx.reply("❌ Erro ao criar categoria.");
          }
        } else {
          const result = await createCategory(state.data.name, text);
          if (result) {
            await logAdminAction(ctx.from.id, "create_category", `Categoria '${state.data.name}' criada`, "success");
            logger.info("Category created successfully", { adminId: ctx.from.id, category: state.data.name });
            await ctx.reply("✅ Categoria criada com sucesso!");
          } else {
            await logAdminAction(ctx.from.id, "create_category", `Erro ao criar categoria '${state.data.name}'`, "error");
            logger.error("Failed to create category", new Error("Unknown error"), { adminId: ctx.from.id });
            await ctx.reply("❌ Erro ao criar categoria.");
          }
        }

        await clearUserConversationState(user.id);
        return;
      }
    } catch (error) {
      logger.error("Error handling text message", error, { telegramId: ctx.from?.id });
    }
  });
}
