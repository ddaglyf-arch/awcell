# 🤖 Telegram Sales Bot - Guia Completo

## ✨ Recursos Implementados

### 🔐 Painel de Administração
- **Menu Principal**: `/admin` para acessar o painel
- **Criar Produtos**: Fluxo conversacional para adicionar novos produtos
- **Criar Categorias**: Sistema interativo para gerenciar categorias
- **Listar Produtos e Categorias**: Visualizar todos os cadastros
- **Gerenciar Pedidos**: Filtros por status (pagos, pendentes, entregues, cancelados)
- **Estatísticas Completas**: Dashboard com métricas de vendas
- **Logs Detalhados**: Histórico de todas as ações do admin

### 🛒 Funcionalidades de Usuário
- Ver produtos por categoria
- Adicionar/remover itens do carrinho
- Finalizar compra
- Histórico de pedidos
- Notificações de pagamento (Mercado Pago)

### 📊 Sistema de Logging
Todos os comandos admin são registrados em tempo real:
- Ações realizadas
- Status (sucesso/erro)
- Data e hora
- Detalhes da operação
- Mensagens de erro

## 🚀 Como Usar

### Iniciar o Bot

```bash
.\start.bat
```

O script vai:
1. ✅ Verificar Node.js
2. ✅ Instalar dependências npm
3. ✅ Compilar TypeScript
4. ✅ Iniciar o bot

### Acessar o Painel Admin

No Telegram, envie:
```
/admin
```

### Criar um Produto

1. Acesse o painel: `/admin`
2. Clique em "📦 Produtos"
3. Clique em "➕ Criar Produto"
4. Siga o fluxo conversacional:
   - Digite o nome do produto
   - Digite a descrição
   - Digite o preço em REAIS (ex: 99.99)
   - Selecione a categoria
   - Confirme a criação

### Criar uma Categoria

1. Acesse o painel: `/admin`
2. Clique em "🗂️ Categorias"
3. Clique em "➕ Criar Categoria"
4. Digite o nome da categoria
5. Digite a descrição (ou `/skip` para pular)

### Ver Logs de Ações

1. Acesse o painel: `/admin`
2. Clique em "📋 Logs"
3. Visualize as últimas 10 ações com status e erros

## 📋 Database Schema

### Tabelas Principais

**users**
- id (UUID)
- telegram_id (BIGINT)
- username, first_name, last_name
- role (user/admin)
- timestamps

**categories**
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- active (BOOLEAN)
- timestamps

**products**
- id (UUID)
- name, description
- price (em centavos)
- category_id (FK)
- stock
- image_url
- delivery_type (digital/physical)
- active
- timestamps

**orders**
- id (UUID)
- user_id (FK)
- total (em centavos)
- status (pending/paid/delivered/cancelled)
- payment_status (pending/approved/rejected/cancelled/expired)
- timestamps

**admin_logs** ⭐ (NOVO)
- id (UUID)
- admin_id (BIGINT)
- action (VARCHAR)
- description (TEXT)
- status (success/error/pending)
- error_message (TEXT)
- metadata (JSONB)
- created_at

**user_conversation_states** ⭐ (NOVO)
- Rastreia o estado da conversa de cada usuário
- Armazena dados temporários do formulário
- Permite criar fluxos conversacionais

## 🐛 Debugging

### Ver Logs
Todos os erros são logados com timestamp e detalhes:

```
[2026-08-25T19:38:20.817Z] [ERROR] Failed to create category | adminId: 8736687945 | Error: Duplicate category name
```

### Verificar Admin Logs no BD

No Supabase, consulte:
```sql
SELECT * FROM admin_logs 
WHERE admin_id = 8736687945 
ORDER BY created_at DESC 
LIMIT 20;
```

### Verificar Estado da Conversa

```sql
SELECT * FROM user_conversation_states 
WHERE telegram_id = 8736687945;
```

## 🔑 Variáveis de Ambiente

Configuradas em `.env`:

```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
ADMIN_TELEGRAM_ID=seu_id_telegram

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui

MERCADOPAGO_ACCESS_TOKEN=seu_token_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_secret_aqui

PUBLIC_URL=https://seu-app.up.railway.app
PORT=3000
NODE_ENV=production
```

## 🛠️ Estrutura de Arquivos

```
src/
├── handlers/
│   ├── adminHandlers.ts    ⭐ Handlers de admin (MELHORADO)
│   ├── basicHandlers.ts
│   ├── cartHandlers.ts
│   ├── checkoutHandlers.ts
│   ├── orderHandlers.ts
│   └── productHandlers.ts
├── services/
│   ├── adminConversationService.ts  ⭐ NOVO
│   ├── cartService.ts
│   ├── conversationService.ts
│   ├── deliveryService.ts
│   ├── orderService.ts
│   ├── paymentService.ts
│   ├── productService.ts
│   └── userService.ts
├── utils/
│   ├── helpers.ts
│   └── logger.ts
├── config/
│   └── index.ts
├── database/
│   └── index.ts
└── types/
    └── index.ts
```

## ⚙️ Configuração Supabase

### 1. Executar o Schema SQL

Copie o conteúdo de `database.sql` e execute no Supabase SQL Editor.

### 2. Configurar Row Level Security (RLS)

Para tabelas públicas (produtos, categorias):
```sql
-- Permitir SELECT para todos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON products FOR SELECT USING (active = true);
```

### 3. Configurar Webhooks (Mercado Pago)

URL: `{PUBLIC_URL}/webhooks/mercadopago`

## 🚀 Deploy no Railway

1. Conectar GitHub
2. Selecionar repositório
3. Configurar variáveis de ambiente
4. Deploy automático

## 📞 Suporte

Para erros, verifique:
1. Logs do bot (console)
2. Admin logs (tabela `admin_logs`)
3. Console do Supabase (SQL queries)

---

**Última atualização**: 2026-08-25  
**Status**: ✅ Todos os comandos admin funcionando com logging completo
