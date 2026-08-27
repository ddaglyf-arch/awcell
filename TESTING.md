# 🧪 Guia de Teste

## Testando o Bot Localmente

### 1. Preparar Ambiente

```bash
# Instalar dependências
npm install

# Criar arquivo .env com dados de teste
cp .env.example .env

# Editar .env com credenciais de teste
# Use credenciais SANDBOX do Mercado Pago
```

### 2. Executar o Bot

```bash
# Em desenvolvimento
npm run dev

# Logs devem mostrar: "✅ Bot started successfully"
```

### 3. Testar Funcionalidades

#### 3.1 Iniciar o Bot

1. Abra o Telegram
2. Procure por seu bot (usando o @username)
3. Envie `/start`
4. Você deve ver o menu inicial

#### 3.2 Ver Produtos

1. Clique em "🛍️ Ver Produtos"
2. Veja a lista de produtos disponíveis

#### 3.3 Adicionar ao Carrinho

1. Clique em um produto
2. Clique em "🛒 Adicionar ao Carrinho"
3. Veja a confirmação

#### 3.4 Finalizar Compra

1. Clique em "🛒 Meu Carrinho"
2. Veja o resumo dos itens
3. Clique em "💳 Finalizar Compra"
4. Você receberá um link para pagar

## Cartões de Teste Mercado Pago

### Teste Sandbox

Use as credenciais SANDBOX do Mercado Pago para testes.

**Cartões válidos:**

| Bandeira    | Número              | CVV | Data Expiração |
|------------|---------------------|-----|----------------|
| Visa       | 4111111111111111    | 123 | 11/25          |
| Mastercard | 5555555555554444    | 123 | 11/25          |
| Visa       | 4009180084714445    | 123 | 11/25          |
| Mastercard | 5031433215406351    | 123 | 11/25          |

**Status de teste:**

- Aprovado: Final do número = 6
  - Ex: 4111111111111116

- Recusado: Final do número = 7
  - Ex: 4111111111111117

- Pendente: Final do número = 8
  - Ex: 4111111111111118

### Dados Pessoais (qualquer valor válido)

- **Nome**: Qualquer nome
- **Email**: Qualquer email válido
- **CPF**: 12345678901 (pode ser qualquer número)
- **Telefone**: Qualquer número

## Testes Administrativos

### Acessar Painel Admin

1. Envie `/admin`
2. Você deve ver o menu administrativo
   - Nota: Apenas administradores conseguem acessar

### Criar Categoria

1. Clique em "🗂️ Categorias"
2. Clique em "➕ Criar Categoria"
3. Responda as perguntas:
   - Nome da categoria
   - Descrição (opcional)
4. Confirme

### Criar Produto

1. Clique em "📦 Produtos"
2. Clique em "➕ Criar Produto"
3. Responda as perguntas em sequência
4. Revise o resumo
5. Confirme a criação

### Ver Estatísticas

1. Clique em "📊 Estatísticas"
2. Veja os números de vendas

## Verificar Logs

### Terminal Local

Os logs aparecem no terminal onde você rodou `npm run dev`

```
[2024-01-15T10:30:45.123Z] [INFO] Bot started successfully
[2024-01-15T10:31:02.456Z] [INFO] User 123456789 started the bot
```

### Verificar Webhook

O webhook do Mercado Pago será chamado em:
```
POST http://localhost:3000/webhooks/mercadopago
```

Para testar webhook localmente, use ferramentas como:
- **ngrok**: https://ngrok.com
- **Webhook.site**: https://webhook.site

Exemplo com ngrok:
```bash
# Terminal 1: Iniciar bot
npm run dev

# Terminal 2: Expor localmente
ngrok http 3000

# Copiar URL do ngrok (ex: https://abc123.ngrok.io)
# Usar em MERCADOPAGO_WEBHOOK_SECRET
```

## Testes Checklist

- [ ] Bot responde a `/start`
- [ ] Menu inicial mostra opções
- [ ] Consegue ver produtos
- [ ] Consegue adicionar ao carrinho
- [ ] Carrinho mostra itens corretos
- [ ] Valor total está correto
- [ ] Link de pagamento é gerado
- [ ] Pagamento é processado (Mercado Pago)
- [ ] Webhook atualiza pedido
- [ ] Cliente recebe notificação
- [ ] Admin consegue acessar painel
- [ ] Admin consegue criar categoria
- [ ] Admin consegue criar produto
- [ ] Estatísticas mostram dados corretos
- [ ] Pedidos aparecem no admin
- [ ] Filtros de pedidos funcionam

## Problemas Comuns

### Bot não responde

1. Verifique se está rodando: `npm run dev`
2. Verifique TELEGRAM_BOT_TOKEN em .env
3. Envie `/start` novamente

### Erro ao adicionar ao carrinho

1. Produto pode estar indisponível
2. Estoque pode estar zerado
3. Verifique logs: `npm run dev`

### Pagamento não processa

1. Credenciais Mercado Pago incorretas
2. Webhook não está configurado
3. Verifique logs de erro

### Banco de dados vazio

1. Execute: `node -r ts-node/register scripts/seed.ts`
2. Ou crie produtos via `/admin`

## Modo Produção

Para testar em produção (Railway):

1. Deploy para Railway
2. Configurar variáveis de produção
3. Configurar webhook do Mercado Pago com URL do Railway
4. Testar com cartões reais (valores pequenos)
5. Verificar logs no Railway

---

**Dicas:**
- Use valores pequenos para testes
- Guarde os IDs dos testes para referência
- Limpe dados de teste regularmente
- Backup do banco antes de testes importantes
