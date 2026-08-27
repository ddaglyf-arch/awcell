import dotenv from "dotenv";

dotenv.config();

export const DEFAULT_BANNER_IMAGE_URL = "https://i.postimg.cc/7Htz3vX9/4936162500223372332.jpg";

export const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    adminId: parseInt(process.env.ADMIN_TELEGRAM_ID || "0", 10),
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
  mercadopago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || "",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    publicUrl:
      process.env.PUBLIC_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : "http://localhost:3000"),
    webhookPath: process.env.TELEGRAM_WEBHOOK_PATH || "/telegram/webhook",
    nodeEnv: process.env.NODE_ENV || "development",
  },
};

// Validate required environment variables
const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "ADMIN_TELEGRAM_ID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MERCADOPAGO_ACCESS_TOKEN",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
