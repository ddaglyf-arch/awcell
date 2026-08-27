import dotenv from "dotenv";

dotenv.config();

export const DEFAULT_BANNER_IMAGE_URL = "https://i.postimg.cc/7Htz3vX9/4936162500223372332.jpg";

const configuredPublicUrl = process.env.PUBLIC_URL?.trim();
const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
const isExampleUrl = configuredPublicUrl?.includes("seu-app") || configuredPublicUrl?.includes("example.com");
const rawPublicUrl =
  !isExampleUrl && configuredPublicUrl
    ? configuredPublicUrl
    : railwayPublicDomain
      ? `https://${railwayPublicDomain}`
      : "http://localhost:3000";
const publicUrl = /^https?:\/\//i.test(rawPublicUrl) ? rawPublicUrl : `https://${rawPublicUrl}`;

type Config = {
  telegram: {
    token: string;
    adminId: number;
    webhookSecret: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  mercadopago: {
    accessToken: string;
    webhookSecret: string;
  };
  support: {
    whatsappNumber: string;
    whatsappDisplay: string;
  };
  server: {
    port: number;
    publicUrl: string;
    webhookPath: string;
    nodeEnv: string;
  };
};

export const config: Config = {
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
  support: {
    whatsappNumber: process.env.WHATSAPP_NUMBER || "5521997898338",
    whatsappDisplay: process.env.WHATSAPP_DISPLAY || "(21) 99789-8338",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    publicUrl,
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
