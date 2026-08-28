import { Context, Telegraf } from "telegraf";
import { createHash } from "crypto";
import supabase from "../database";

interface ConversationState {
  step: string;
  shopData?: Partial<any>;
}

const conversationStates = new Map<number, ConversationState>();

export function hasShopConversation(telegramId: number): boolean {
  return conversationStates.has(telegramId);
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function generateApiToken(): string {
  return createHash("sha256").update(Math.random().toString() + Date.now()).digest("hex");
}

export async function handleAdminCreateShop(ctx: Context) {
  const adminId = ctx.from?.id;
  if (!adminId) return;

  const message = `
🏪 CRIAR NOVA LOJA

Vou guiá-lo passo a passo para criar uma nova loja.

1️⃣ Qual será o número da loja? (1-50)
   Exemplo: 5 (para Loja 5)

Digite o número:
  `.trim();

  await ctx.reply(message);
  conversationStates.set(adminId, { step: "shop_number" });
}

export async function handleAdminListShops(ctx: Context) {
  try {
    const { data: shops, error } = await supabase.from("shops").select("*").order("shop_number");

    if (error) {
      await ctx.reply("❌ Erro ao carregar lojas.");
      return;
    }

    if (!shops || shops.length === 0) {
      await ctx.reply("📭 Nenhuma loja cadastrada ainda.");
      return;
    }

    let message = "📋 LOJAS CADASTRADAS\n\n";
    for (const shop of shops) {
      const status = shop.is_active ? "✅ Ativa" : "❌ Expirada";
      const expiresDate = new Date(shop.plan_expires_at).toLocaleDateString("pt-BR");
      message += `🏪 Loja ${shop.shop_number}\n`;
      message += `   Nome: ${shop.shop_name}\n`;
      message += `   Dono: ${shop.owner_name}\n`;
      message += `   Status: ${status}\n`;
      message += `   Plano expira: ${expiresDate}\n`;
      message += `   Usuário: ${shop.owner_username}\n\n`;
    }

    await ctx.reply(message);
  } catch (error) {
    console.error("Erro ao listar lojas:", error);
    await ctx.reply("❌ Erro ao listar lojas.");
  }
}

export async function handleAdminManageUsers(ctx: Context) {
  const message = `
👥 GERENCIAR USUÁRIOS LOJISTAS

Escolha uma opção:

1️⃣ Listar todas as lojas
2️⃣ Criar nova loja
3️⃣ Editar loja existente
4️⃣ Desativar loja
5️⃣ Voltar ao menu

Envie o número da opção:
  `.trim();

  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Listar Lojas", callback_data: "admin_list_shops" }],
        [{ text: "➕ Criar Loja", callback_data: "admin_create_shop_form" }],
        [{ text: "🔄 Editar Loja", callback_data: "admin_edit_shop" }],
        [{ text: "❌ Desativar Loja", callback_data: "admin_deactivate_shop" }],
        [{ text: "🏠 Voltar", callback_data: "back_to_menu" }],
      ],
    },
  });
}

export async function handleAdminEditShop(ctx: Context) {
  const adminId = ctx.from?.id;
  if (!adminId) return;

  const message = "Qual é o número da loja que deseja editar? (1-50)\n\nDigite o número:";
  await ctx.reply(message);
  conversationStates.set(adminId, { step: "edit_shop_number" });
}

export async function handleAdminDeactivateShop(ctx: Context) {
  const adminId = ctx.from?.id;
  if (!adminId) return;

  const message = "Qual é o número da loja que deseja desativar? (1-50)\n\nDigite o número:";
  await ctx.reply(message);
  conversationStates.set(adminId, { step: "deactivate_shop_number" });
}

// Process text messages for shop creation flow
export async function processShopCreationFlow(ctx: Context) {
  const adminId = ctx.from?.id;
  if (!adminId || ctx.chat?.type !== "private") return;

  const text = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const state = conversationStates.get(adminId);

  if (!state) return;

  try {
    switch (state.step) {
      case "shop_number": {
        const shopNumber = parseInt(text, 10);
        if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 50) {
          await ctx.reply("❌ Número inválido. Digite um número entre 1 e 50.");
          return;
        }

        // Check if shop already exists and is configured
        const { data: existingShop } = await supabase
          .from("shops")
          .select("*")
          .eq("shop_number", shopNumber)
          .single();

        if (existingShop && existingShop.owner_password_hash) {
          await ctx.reply(`❌ Loja ${shopNumber} já foi configurada anteriormente.`);
          conversationStates.delete(adminId);
          return;
        }

        conversationStates.set(adminId, {
          step: "shop_name",
          shopData: { shop_number: shopNumber },
        });

        await ctx.reply(`✅ Loja ${shopNumber} selecionada.\n\n2️⃣ Qual é o nome da loja?\n\nExemplo: Loja do João`);
        break;
      }

      case "shop_name": {
        const shopName = text;
        if (shopName.length < 3) {
          await ctx.reply("❌ Nome muito curto. Mínimo 3 caracteres.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.shop_name = shopName;
        }

        await ctx.reply(`✅ Nome da loja: ${shopName}\n\n3️⃣ Qual é o nome completo do dono?\n\nExemplo: João Silva`);
        conversationStates.set(adminId, { ...state, step: "owner_name" } as any);
        break;
      }

      case "owner_name": {
        const ownerName = text;
        if (ownerName.length < 3) {
          await ctx.reply("❌ Nome muito curto. Mínimo 3 caracteres.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.owner_name = ownerName;
        }

        await ctx.reply(
          `✅ Dono: ${ownerName}\n\n4️⃣ Qual é o telefone do dono?\n\nExemplo: 21997898338 (sem espaços ou caracteres especiais)`
        );
        conversationStates.set(adminId, { ...state, step: "owner_phone" } as any);
        break;
      }

      case "owner_phone": {
        const ownerPhone = text.replace(/\D/g, "");
        if (ownerPhone.length < 10) {
          await ctx.reply("❌ Telefone inválido. Mínimo 10 dígitos.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.owner_phone = ownerPhone;
        }

        await ctx.reply(
          `✅ Telefone: ${ownerPhone}\n\n5️⃣ Qual será o nome de usuário para login?\n\nExemplo: joao_silva (sem espaços, minúsculas)`
        );
        conversationStates.set(adminId, { ...state, step: "owner_username" } as any);
        break;
      }

      case "owner_username": {
        const username = text.toLowerCase().replace(/\s/g, "_");
        if (username.length < 3) {
          await ctx.reply("❌ Usuário muito curto. Mínimo 3 caracteres.");
          return;
        }

        // Check if username already exists
        const { data: existingUser } = await supabase
          .from("shops")
          .select("*")
          .eq("owner_username", username)
          .single();

        if (existingUser) {
          await ctx.reply("❌ Este usuário já existe. Escolha outro.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.owner_username = username;
        }

        await ctx.reply(`✅ Usuário: ${username}\n\n6️⃣ Qual será a senha para login da loja?\n\nMínimo 6 caracteres`);
        conversationStates.set(adminId, { ...state, step: "owner_password" } as any);
        break;
      }

      case "owner_password": {
        const password = text;
        if (password.length < 6) {
          await ctx.reply("❌ Senha muito curta. Mínimo 6 caracteres.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.owner_password = password;
        }

        await ctx.reply(
          `✅ Senha de login definida.\n\n7️⃣ Qual será a senha do DASHBOARD (painel de controle)?\n\nMínimo 6 caracteres`
        );
        conversationStates.set(adminId, { ...state, step: "dashboard_password" } as any);
        break;
      }

      case "dashboard_password": {
        const dashboardPassword = text;
        if (dashboardPassword.length < 6) {
          await ctx.reply("❌ Senha muito curta. Mínimo 6 caracteres.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.dashboard_password = dashboardPassword;
        }

        await ctx.reply(
          `✅ Senha do dashboard definida.\n\n8️⃣ Qual será o tipo de plano?\n\n1 - Starter (R$ 99/mês)\n2 - Pro (R$ 199/mês)\n3 - Premium (R$ 499/mês)`
        );
        conversationStates.set(adminId, { ...state, step: "plan_type" } as any);
        break;
      }

      case "plan_type": {
        const planChoice = text;
        const planMap: Record<string, { type: string; duration: number }> = {
          "1": { type: "starter", duration: 30 },
          "2": { type: "pro", duration: 30 },
          "3": { type: "premium", duration: 30 },
        };

        if (!planMap[planChoice]) {
          await ctx.reply("❌ Opção inválida. Digite 1, 2 ou 3.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.plan_type = planMap[planChoice].type;
          state.shopData.plan_duration_days = planMap[planChoice].duration;
        }

        await ctx.reply(
          `✅ Plano: ${planMap[planChoice].type}\n\n9️⃣ Quantos dias de acesso? (padrão 30)\n\nDigite o número de dias:`
        );
        conversationStates.set(adminId, { ...state, step: "plan_duration" } as any);
        break;
      }

      case "plan_duration": {
        const days = parseInt(text, 10);
        if (isNaN(days) || days < 1) {
          await ctx.reply("❌ Valor inválido. Digite um número maior que 0.");
          return;
        }

        const state = conversationStates.get(adminId);
        if (state?.shopData) {
          state.shopData.plan_duration_days = days;
        }

        // Prepare data and save
        const shopData = state?.shopData;
        if (!shopData) {
          await ctx.reply("❌ Erro ao processar dados. Tente novamente.");
          conversationStates.delete(adminId);
          return;
        }

        const ownerPasswordHash = hashPassword(shopData.owner_password);
        const dashboardPasswordHash = hashPassword(shopData.dashboard_password);
        const apiToken = generateApiToken();
        const apiSecret = generateApiToken();
        const planExpiresAt = new Date();
        planExpiresAt.setDate(planExpiresAt.getDate() + shopData.plan_duration_days);

        const { error } = await supabase.from("shops").update({
          shop_name: shopData.shop_name,
          owner_name: shopData.owner_name,
          owner_phone: shopData.owner_phone,
          owner_username: shopData.owner_username,
          owner_password_hash: ownerPasswordHash,
          dashboard_password_hash: dashboardPasswordHash,
          plan_type: shopData.plan_type,
          plan_duration_days: shopData.plan_duration_days,
          plan_expires_at: planExpiresAt.toISOString(),
          api_token: apiToken,
          api_secret: apiSecret,
          is_active: true,
        })
        .eq("shop_number", shopData.shop_number);

        if (error) {
          console.error("Erro ao criar loja:", error);
          await ctx.reply("❌ Erro ao criar loja. Tente novamente.");
          conversationStates.delete(adminId);
          return;
        }

        // Create shop config
        const { data: shopRecord } = await supabase
          .from("shops")
          .select("id")
          .eq("shop_number", shopData.shop_number)
          .single();

        if (shopRecord) {
          await supabase.from("shop_configs").insert({
            shop_id: shopRecord.id,
            welcome_message: `Bem-vindo à ${shopData.shop_name}!`,
          });
        }

        const expiresDate = planExpiresAt.toLocaleDateString("pt-BR");
        const confirmMessage = `
✅ LOJA CRIADA COM SUCESSO!

🏪 Loja ${shopData.shop_number}
📛 Nome: ${shopData.shop_name}
👤 Dono: ${shopData.owner_name}
📱 Telefone: ${shopData.owner_phone}

🔑 Credenciais:
   Usuário: ${shopData.owner_username}
   Senha de login: ${shopData.owner_password}
   Senha dashboard: ${shopData.dashboard_password}

📅 Plano: ${shopData.plan_type} (${shopData.plan_duration_days} dias)
⏰ Expira em: ${expiresDate}

🔐 Token API: ${apiToken.substring(0, 16)}...
      `.trim();

        await ctx.reply(confirmMessage);
        conversationStates.delete(adminId);
        break;
      }

      default:
        conversationStates.delete(adminId);
        break;
    }
  } catch (error) {
    console.error("Erro ao processar fluxo de criação de loja:", error);
    await ctx.reply("❌ Erro ao processar. Tente novamente.");
    conversationStates.delete(adminId);
  }
}

export function registerAdminShopHandlers(bot: Telegraf<Context>) {
  // These will be called from the main callback handler
  // See index.ts for integration
}
