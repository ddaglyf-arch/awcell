# Deploy na Railway

Este projeto usa um servidor Express com webhook do Telegram. A Railway fornece o dominio publico e o bot registra o webhook automaticamente ao iniciar.

O runtime de producao e Node.js 22, exigido pelas versoes atuais do Supabase.

## 1. Preparar o banco

1. Crie um projeto no [Supabase](https://supabase.com).
2. Abra **SQL Editor** e execute todo o arquivo [`database.sql`](database.sql).
3. Copie a URL do projeto e a chave `service_role` em **Project Settings > API**.

## 2. Criar o servico

1. Suba este projeto para um repositorio GitHub.
2. Na Railway, selecione **New Project > Deploy from GitHub Repo**.
3. Escolha o repositorio. A Railway detecta o `Dockerfile` e cria o build automaticamente.
4. Em **Settings > Networking**, gere um dominio publico. Ele sera usado como URL do webhook.

Sem um dominio publico gerado, o bot encerra o startup em producao para evitar registrar o webhook em `localhost`.

## 3. Variaveis da Railway

Adicione estas variaveis em **Variables**:

```env
TELEGRAM_BOT_TOKEN=token_do_BotFather
ADMIN_TELEGRAM_ID=id_numerico_do_admin
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=chave_service_role
MERCADOPAGO_ACCESS_TOKEN=access_token_do_mercado_pago
MERCADOPAGO_WEBHOOK_SECRET=segredo_opcional
NODE_ENV=production
```

`PORT` e `RAILWAY_PUBLIC_DOMAIN` sao fornecidos pela Railway. O bot usa automaticamente `https://RAILWAY_PUBLIC_DOMAIN` para registrar o webhook.

Se preferir um dominio proprio, defina tambem:

```env
PUBLIC_URL=https://bot.seudominio.com
```

Nao deixe `PUBLIC_URL=https://seu-app.up.railway.app`: esse e apenas um exemplo. Use o dominio real mostrado em **Settings > Networking**. Se `PUBLIC_URL` nao for definido, o bot usa `RAILWAY_PUBLIC_DOMAIN` automaticamente.

Opcionalmente, defina um caminho e um segredo para o webhook do Telegram:

```env
TELEGRAM_WEBHOOK_PATH=/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=um_segredo_com_1_a_256_caracteres
```

## 4. Webhooks de pagamento

No Mercado Pago, configure a notificacao para:

```text
https://SEU_DOMINIO_RAILWAY/webhooks/mercadopago
```

Use os eventos `payment.created` e `payment.updated`. Essa rota ja existe no bot e atualiza o pedido apos a notificacao.

## 5. Conferir o deploy

Abra no navegador:

```text
https://SEU_DOMINIO_RAILWAY/health
```

A resposta esperada e:

```json
{"status":"ok"}
```

Nos logs da Railway deve aparecer `Telegram webhook registered`. Depois envie `/start` para o bot no Telegram.

## Observacoes

- Nao use `npm run dev` em producao; a Railway executa `npm start` pelo `Procfile`.
- Nunca publique `SUPABASE_SERVICE_ROLE_KEY`, tokens ou secrets no GitHub.
- As imagens dos produtos sao salvas como URLs no campo `products.image_url`.
- O banner padrao esta no codigo e tambem e aplicado ao `store_config` pelo `database.sql`.