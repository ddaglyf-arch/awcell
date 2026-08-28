# 🏪 SISTEMA MULTI-TENANT COMPLETO - SETUP E DEPLOYMENT

Parabéns! Seu sistema de 50 lojas está pronto! Aqui está como configurar tudo.

## 📋 RESUMO DO QUE FOI CRIADO

```
✅ Backend Multi-Tenant (Node.js)
   - 50 lojas pré-configuradas (loja1 até loja50)
   - API REST para dashboard
   - Integração Telegram (/admin para criar lojas)
   - Webhook Mercado Pago
   - Database com isolamento de dados

✅ Dashboard Frontend (React/Next.js)
   - Login de lojista (usuário + senha)
   - Login de cliente (CPF + senha)
   - Gerenciar produtos, pedidos, vendas
   - Visualizar todas as lojas
   - Carrinho de compras e checkout

✅ Painel Admin Telegram
   - /admin para abrir menu
   - Criar nova loja (preencher todos os dados)
   - Listar lojas
   - Editar/desativar lojas
```

## 🔧 PASSO 1: PREPARAR O BANCO DE DADOS

### 1.1 Executar SQL das Lojas

Você tem duas opções:

#### Opção A: Via Supabase Dashboard (Recomendado)
1. Abra [supabase.com](https://supabase.com)
2. Selecione seu projeto
3. Vá para "SQL Editor"
4. Clique "+ New Query"
5. Cole todo o conteúdo de `database-multitenant.sql`
6. Clique "Run"

#### Opção B: Via CLI Supabase
```bash
# Instale Supabase CLI se não tiver
npm install -g supabase

# Login
supabase login

# Execute o SQL
supabase db push database-multitenant.sql
```

### 1.2 Verificar Criação

Execute esta query no Supabase para confirmar:

```sql
SELECT shop_number, shop_name, is_active FROM shops ORDER BY shop_number LIMIT 5;
```

Deve retornar:
```
1 | Loja 1 | false
2 | Loja 2 | false
3 | Loja 3 | false
...
```

---

## 🚀 PASSO 2: DEPLOYMENT DO BACKEND (Railway)

### 2.1 Verificar Código

O backend está atualizado com:
- ✅ Database multi-tenant
- ✅ API REST (`src/routes/api.ts`)
- ✅ Admin handlers para Telegram (`src/handlers/adminShopHandlers.ts`)
- ✅ Nova estrutura de tipos (`src/types/multitenant.ts`)

### 2.2 Commits Realizados

```bash
cd C:\Users\grsmart\Desktop\bot
git log --oneline

# Deve mostrar:
# "feat: multi-tenant system - 50 shops..."
```

### 2.3 Deploy Automático

Railway já está configurado para fazer deploy automático. Apenas confirme que:

1. GitHub está conectado ao Railway
2. Branch `main` é o default
3. Variáveis de ambiente estão setadas:

```
TELEGRAM_BOT_TOKEN=seu_token
ADMIN_TELEGRAM_ID=sua_id_admin
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_secreta
MERCADOPAGO_ACCESS_TOKEN=seu_token_mp
JWT_SECRET=gera_uma_string_aleatoria_longa
```

**Para gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Verificar Build

No Railway Dashboard:
1. Vá para seu projeto
2. Selecione "Deployments"
3. Deve ter um novo deployment com status ✅
4. Confira os logs: "Build successful"

---

## 🎨 PASSO 3: DEPLOYMENT DO FRONTEND (Vercel/Netlify)

### 3.1 Criar Projeto Vercel

```bash
# Opção 1: Via CLI
npm i -g vercel
cd C:\Users\grsmart\Desktop\bot-frontend
vercel

# Opção 2: Via Vercel Dashboard
# 1. Vá para vercel.com
# 2. Clique "New Project"
# 3. Selecione repositório (ou upload pasta bot-frontend)
# 4. Deploy
```

### 3.2 Configurar Variáveis de Ambiente

**No Vercel Dashboard:**
1. Project → Settings → Environment Variables
2. Adicione:

```
NEXT_PUBLIC_API_URL = https://seu-backend-railway.railway.app/api
```

(Substitua `seu-backend-railway` pela URL do seu projeto Railway)

### 3.3 Verificar Deploy

```bash
# Vercel mostra URL automaticamente após deploy
# Exemplo: https://seu-projeto.vercel.app
```

---

## 🤖 PASSO 4: TESTAR TELEGRAM ADMIN

### 4.1 Abrir Telegram

1. Abra seu bot no Telegram
2. Digite: `/admin`

Deve aparecer menu com opções:
```
🔐 PAINEL ADMINISTRATIVO

[🏪 Gerenciar Lojas]
[📦 Produtos]
[🗂️ Categorias]
...
```

### 4.2 Criar Primeira Loja

1. Clique "🏪 Gerenciar Lojas"
2. Clique "➕ Criar Loja"
3. Preencha passo a passo:

```
📝 Número da loja? → 5

📝 Nome da loja? → Loja do João

📝 Dono? → João Silva

📝 Telefone? → 21997898338

📝 Usuário? → joao_silva

📝 Senha login? → senha123

📝 Senha dashboard? → admin@123

📝 Plano? → 2 (Pro)

📝 Dias? → 30
```

✅ Deve aparecer:
```
✅ LOJA CRIADA COM SUCESSO!

🏪 Loja 5
📛 Nome: Loja do João
👤 Dono: João Silva
...
```

---

## 🌐 PASSO 5: TESTAR DASHBOARD LOJISTA

### 5.1 Acessar Login

Abra: `https://seu-frontend.vercel.app/login`

### 5.2 Fazer Login como Lojista

Preencha:
```
Tipo de Acesso: 🔘 Lojista (Dashboard)
Número da Loja: 5
Usuário: joao_silva
Senha: senha123
```

Clique "Entrar"

### 5.3 Gerenciar Loja

Deve aparecer Dashboard com:
- ✅ Nome da loja
- ✅ Botão "Novo Produto"
- ✅ Estatísticas (0 produtos, 0 pedidos)
- ✅ Abas: Visão Geral | Produtos | Pedidos

**Testar:**
1. Clique "Novo Produto"
2. Preencha:
   - Nome: Camiseta Azul
   - Descrição: Camiseta de qualidade
   - Preço: 49.90
   - Estoque: 10
3. Clique "Adicionar Produto"

✅ Produto deve aparecer na lista

---

## 🛍️ PASSO 6: TESTAR PLATAFORMA DE COMPRAS

### 6.1 Criar Cliente de Teste

Você precisa criar um cliente na loja 5. Via SQL no Supabase:

```sql
INSERT INTO shop_users (shop_id, full_name, cpf, password_hash, is_active)
SELECT id, 'José Silva', '12345678901', 
       encode(digest('cliente123', 'sha256'), 'hex'),
       true
FROM shops WHERE shop_number = 5;
```

### 6.2 Fazer Login como Cliente

Abra: `https://seu-frontend.vercel.app/login`

Preencha:
```
Tipo de Acesso: 🔘 Cliente (Compras)
Número da Loja: 5
CPF: 12345678901
Senha: cliente123
```

### 6.3 Navegação de Compra

Deve aparecer:
1. ✅ Todas as lojas disponíveis
2. Clique em "Loja 5"
3. ✅ Produtos que você criou aparecem
4. ✅ Clique em "Adicionar ao Carrinho"
5. ✅ Carrinho mostra quantidade
6. ✅ Clique "Finalizar Compra"

(Mercado Pago será testado depois)

---

## 📊 PASSO 7: TESTAR ISOLAMENTO DE DADOS

### 7.1 Criar Segunda Loja

Pelo Telegram `/admin`:
1. Clique "🏪 Gerenciar Lojas"
2. "➕ Criar Loja"
3. Número: 7
4. Nome: Loja da Maria
5. ... (preencha outros dados)

### 7.2 Verificar Isolamento

**No Dashboard:**
1. Login como `loja5` (João)
2. Crie produto: "Camiseta Vermelha"
3. Logout
4. Login como `loja7` (Maria)
5. ❌ NÃO deve ver "Camiseta Vermelha"
6. ✅ Deve ter estoque 0 (ou seus próprios produtos)

---

## ⚙️ PASSO 8: CONFIGURAÇÕES ADICIONAIS

### 8.1 Customizar Loja

No Dashboard → Configurações:
```
Logo URL: https://link-da-logo.jpg
Mensagem Boas-vindas: Bem-vindo à nossa loja!
WhatsApp: 21997898338
Email: suporte@loja.com
```

### 8.2 Definir Categorias

No Dashboard → Nova Categoria:
```
Nome: Camisetas
Descrição: Camisetas variadas
```

### 8.3 Produtos com Categorias

Ao criar produto, selecione a categoria criada

---

## 🔒 PASSO 9: SEGURANÇA EM PRODUÇÃO

### 9.1 Variáveis Secretas

Nunca commite:
```
JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
MERCADOPAGO_ACCESS_TOKEN
```

Use Railway/Vercel para salvar estas.

### 9.2 CORS

No backend, configure CORS para seu domínio frontend:

```typescript
app.use(cors({
  origin: 'https://seu-frontend.vercel.app'
}));
```

### 9.3 Rate Limiting

Implemente rate limiting nas rotas de login:

```typescript
app.post('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // 5 tentativas por 15min
}), authHandler);
```

---

## 📈 PRÓXIMOS PASSOS

### Adicionar a Sistema:

- [ ] Integração Mercado Pago completa (pagamento real)
- [ ] Email de confirmação de pedido
- [ ] SMS com tracking de entrega
- [ ] Relatório de vendas em Excel
- [ ] Backup automático do banco
- [ ] Analytics e métricas avançadas
- [ ] App mobile (React Native)
- [ ] Chat com suporte
- [ ] Sistema de cupons/promoções

---

## 🆘 TROUBLESHOOTING

### "Erro ao fazer login"
```
Verifique:
1. JWT_SECRET está configurado no Railway
2. Usuário/senha foram criados corretamente
3. Loja está ativa (is_active = true)
```

### "Shop não encontrado"
```
1. Verifique shop_number (1-50)
2. Execute: SELECT * FROM shops WHERE shop_number = 5;
3. Confirme is_active = true
```

### "Erro 401 Unauthorized"
```
1. Token JWT expirou (7 dias) - faça login novamente
2. Verifique Authorization header
3. Confirme JWT_SECRET é o mesmo no backend
```

### API retorna 404
```
1. Verifique NEXT_PUBLIC_API_URL
2. Confirme Railway backend está online
3. Cheque Railway logs: railway logs
```

### Loja não cria via Telegram
```
1. Confirme você é admin (ADMIN_TELEGRAM_ID)
2. Verifique logs: railway logs | grep -i "shop creation"
3. Confirme database SUPABASE_* estão corretos
```

---

## 📞 COMANDOS ÚTEIS

```bash
# Railway
railway logs          # Ver logs em tempo real
railway env          # Ver variáveis
railway up           # Deploy manual

# Vercel
vercel deploy        # Deploy manual
vercel env           # Ver variáveis

# Local Development
npm run dev          # Backend
npm run build        # Build TypeScript
cd bot-frontend && npm run dev  # Frontend
```

---

## 🎯 CHECKLIST FINAL

- [ ] Database atualizado com 50 lojas
- [ ] Backend deployado no Railway
- [ ] Frontend deployado no Vercel
- [ ] Bot Telegram respondendo a `/admin`
- [ ] Criada loja 5 via Telegram
- [ ] Login de lojista funciona
- [ ] Login de cliente funciona
- [ ] Produtos isolados por loja
- [ ] Carrinho funciona
- [ ] Mercado Pago pronto (testar depois)
- [ ] Todas as 50 lojas disponíveis

---

## ✅ SUCESSO!

Você agora tem um sistema profissional de e-commerce multi-tenant! 🎉

**O que você consegue fazer:**
- Vender para até 50 lojistas
- Cada lojista gerencia sua própria loja
- Clientes podem comprar de qualquer loja
- Tudo integrado em uma plataforma

**Próximo passo:** Vender acesso aos lojistas! 💰

---

*Sistema desenvolvido com ❤️ para sucesso comercial.*
