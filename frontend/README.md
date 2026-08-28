# Frontend da plataforma

Esta pasta e uma SPA estatica e pode ser publicada em Netlify, Vercel, GitHub Pages ou qualquer hospedagem de frontend.

## Conexao com o backend

Por padrao, o navegador usa `http://localhost:3000/api`. Antes de publicar, abra o console do navegador e configure:

```js
localStorage.setItem('api_base', 'https://SEU-DOMINIO-RAILWAY.up.railway.app/api')
```

No Railway, configure `FRONTEND_URL` com a URL publicada do frontend. O frontend nao deve receber `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN` ou qualquer outro segredo.

Abra `index.html` diretamente para testar localmente ou sirva esta pasta com qualquer servidor estatico.