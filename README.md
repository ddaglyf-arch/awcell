# 🤖 Bot de Vendas para Telegram

Bot de vendas profissional para Telegram integrado com Supabase e Mercado Pago. Totalmente preparado para produção no Railway.

## 📋 Características

- ✅ Loja virtual dentro do Telegram
- ✅ Gerenciamento de produtos e categorias
- ✅ Carrinho de compras
- ✅ Integração Mercado Pago
- ✅ Painel administrativo no Telegram
- ✅ Webhook automático de pagamentos
- ✅ Entrega digital de produtos
- ✅ Estatísticas de vendas
- ✅ Sistema de estoque
- ✅ Usuários e pedidos
- ✅ Configurações personalizáveis

## 🛠️ Stack Tecnológica

- **Node.js** + TypeScript
- **Telegram Bot API** (via Telegraf)
- **Supabase** (PostgreSQL)
- **Mercado Pago API**
- **Express.js** (webhooks)
- **Railway** (hospedagem)

## 📦 Instalação

### 1. Criar o Bot no BotFather

1. Abra o Telegram e procure por [@BotFather](https://t.me/botfather)
2. Envie o comando `/newbot`
3. Escolha um nome para o bot
4. Escolha um username único
5. Copie o token fornecido (você precisará dele depois)

### 2. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New project"
3. Escolha uma organização e nome do projeto
4. Escolha uma senha para o banco
5. Selecione a região mais próxima
6. Aguarde a criação do projeto
7. Copie a URL do projeto e a chave de serviço

**Executar SQL:**

1. Na seção "SQL Editor", clique em "New query"
2. Copie todo o conteúdo do arquivo `database.sql`
3. Cole no editor
4. Clique em "Run"

### 3. Configurar Mercado Pago

1. Acesse [mercadopago.com.br](https://mercadopago.com.br)
2. Crie uma conta ou faça login
3. Vá para Configurações > Credenciais
4. Copie o **Access Token** de produção
5. Copie o **Webhook secret** (se disponível)

### 4. Descobrir ID do Telegram Admin

1. Envie uma mensagem para o bot (qualquer mensagem)
2. Os logs do servidor mostrarão seu Telegram ID
3. Ou acesse [@userinfobot](https://t.me/userinfobot) para descobrir seu ID

### 5. Clonar e Configurar o Projeto

```bash
# Clonar o repositório
git clone <seu-repositorio>
cd bot

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env

# Editar .env com suas credenciais
nano .env
```

### 6. Arquivo `.env`

```bash
# Telegram
TELEGRAM_BOT_TOKEN=seu_token_aqui
ADMIN_TELEGRAM_ID=seu_id_aqui

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_token_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_secret_aqui

# Server
PORT=3000
PUBLIC_URL=https://seu-dominio.com
NODE_ENV=production
```

## 🚀 Executar Localmente

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start
```

## 📱 Usar o Bot

### Comandos do Cliente

```
/start - Ir para o início
/help - Ver ajuda
/loja - Ver informações
/produtos - Ver produtos
/carrinho - Ver carrinho
/pedidos - Ver pedidos
/suporte - Falar com suporte
```

### Comandos do Administrador

```
/admin - Acessar painel administrativo
```

## 🏪 Painel Administrativo

No painel administrativo (/admin), o administrador pode:

1. **Produtos**
   - ➕ Criar produtos
   - ✏️ Editar produtos
   - 🗑️ Excluir produtos
   - 📋 Listar produtos
   - 📦 Alterar estoque

2. **Categorias**
   - ➕ Criar categorias
   - ✏️ Editar categorias
   - 🗑️ Excluir categorias
   - 📋 Listar categorias

3. **Pedidos**
   - 📋 Ver todos os pedidos
   - ✅ Filtrar pagos
   - ⏳ Filtrar pendentes
   - ❌ Filtrar cancelados
   - 📦 Filtrar entregues

4. **Estatísticas**
   - 📊 Total de vendas
   - 💰 Faturamento
   - 🛒 Total de pedidos
   - ⏳ Pedidos pendentes

5. **Configurações**
   - Nome da loja
   - Descrição
   - Banner/imagem
   - Mensagens personalizadas

## 💳 Fluxo de Pagamento

1. Cliente adiciona produtos ao carrinho
2. Cliente clica em "Finalizar Compra"
3. Sistema cria um pedido no banco
4. Sistema cria uma preferência de pagamento no Mercado Pago
5. Cliente é redirecionado para pagar
6. Mercado Pago envia webhook quando pagamento é processado
7. Sistema atualiza o pedido com status
8. Cliente recebe notificação no Telegram

## 🌐 Deploy no Railway

### 1. Conectar ao GitHub

1. Faça commit e push do código para GitHub
2. Acesse [railway.app](https://railway.app)
3. Clique em "New Project"
4. Selecione "Deploy from GitHub"
5. Escolha seu repositório

### 2. Configurar Variáveis

No Railway:

1. Abra seu projeto
2. Vá para "Variables"
3. Adicione todas as variáveis de `.env`:
   - TELEGRAM_BOT_TOKEN
   - ADMIN_TELEGRAM_ID
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - MERCADOPAGO_ACCESS_TOKEN
   - MERCADOPAGO_WEBHOOK_SECRET
   - RAILWAY_PUBLIC_DOMAIN (gerada pela Railway) ou PUBLIC_URL (domínio próprio)
   - NODE_ENV=production

### 3. Configurar Webhook no Mercado Pago

1. Vá para Configurações > Webhooks no Mercado Pago
2. Adicione a URL: `https://seu-dominio-railway.com/webhooks/mercadopago`
3. Selecione eventos:
   - payment.created
   - payment.updated

### 4. Deploy

1. Railway automaticamente detecta `package.json`
2. Instala dependências
3. Executa `npm start`
4. Seu bot está em produção! 🎉

## 📊 Criar Primeiro Produto

1. Envie `/admin` para o bot
2. Clique em "📦 Produtos"
3. Clique em "➕ Criar Produto"
4. Responda as perguntas:
   - Nome do produto
   - Descrição
   - Preço (em reais)
   - Categoria
   - Quantidade em estoque
   - Link da imagem (URL `http://` ou `https://`, ou `/skip`)
5. Confirme a criação

## 🔍 Verificar Logs

Para o passo a passo completo da hospedagem com webhook Telegram, consulte [`RAILWAY.md`](RAILWAY.md).

### Railway

1. Vá para seu projeto no Railway
2. Clique na seção "Logs"
3. Veja logs em tempo real

### Local

```bash
npm run dev
# Os logs aparecem no terminal
```

## 🧪 Testar Pagamento

### Modo Teste (Sandbox)

1. No arquivo de configuração, use credenciais de teste do Mercado Pago
2. Acesse a URL de sandbox para testar pagamentos

### Cartões de Teste

- **Visa**: 4111111111111111
- **Mastercard**: 5555555555554444
- **Data de expiração**: 11/25
- **CVV**: 123

## 🐛 Troubleshooting

### Bot não responde

1. Verifique se o TELEGRAM_BOT_TOKEN está correto
2. Verificou se o servidor está rodando?
3. Confira os logs de erro

### Pagamento não atualiza

1. Verifique se o webhook está configurado
2. Confira se PUBLIC_URL está correto
3. Verifique logs do Mercado Pago

### Erro de banco de dados

1. Verifique conexão com Supabase
2. Confira se o SQL foi executado
3. Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY

## 📁 Estrutura do Projeto

```
src/
├── config/              # Configurações
├── database/            # Conexão Supabase
├── handlers/            # Handlers do bot
│   ├── basicHandlers.ts
│   ├── productHandlers.ts
│   ├── cartHandlers.ts
│   ├── orderHandlers.ts
│   ├── checkoutHandlers.ts
│   └── adminHandlers.ts
├── middlewares/         # Middlewares
├── services/            # Lógica de negócio
│   ├── productService.ts
│   ├── cartService.ts
│   ├── orderService.ts
│   ├── paymentService.ts
│   ├── deliveryService.ts
│   └── conversationService.ts
├── types/               # Tipos TypeScript
└── index.ts             # Arquivo principal
```

## 📝 Licença

MIT

## 🤝 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

## 🎯 Próximos Passos

1. Personalize as mensagens e cores
2. Adicione mais categorias de produtos
3. Configure entregas digitais
4. Implemente análise de dados
5. Adicione suporte a cupons/descontos
6. Integre com sistema de frete

---

**Feito com ❤️ para vendedores no Telegram**
