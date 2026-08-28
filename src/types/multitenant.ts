// Types for Multi-Tenant System
export interface Shop {
  id: string;
  shop_number: number; // 1-50
  shop_name: string;
  owner_name: string;
  owner_phone: string;
  owner_username: string;
  owner_password_hash: string;
  dashboard_password_hash: string;
  plan_type: "starter" | "pro" | "premium";
  plan_duration_days: number;
  plan_expires_at: Date;
  is_active: boolean;
  api_token?: string;
  api_secret?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ShopAdmin {
  id: string;
  shop_id: string;
  username: string;
  password_hash: string;
  email?: string;
  full_name: string;
  role: "owner" | "admin" | "editor";
  permissions: Record<string, any>;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ShopUser {
  id: string;
  shop_id: string;
  full_name: string;
  cpf: string;
  password_hash: string;
  phone?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ShopCategory {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ShopProduct {
  id: string;
  shop_id: string;
  category_id?: string;
  name: string;
  description: string;
  price: number; // in cents
  image_url?: string;
  stock: number;
  active: boolean;
  delivery_type: "digital" | "physical";
  created_at: Date;
  updated_at: Date;
}

export interface ShopOrder {
  id: string;
  shop_id: string;
  user_id: string;
  total: number; // in cents
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_id?: string;
  payment_status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  delivery_token?: string;
  delivery_notified_at?: Date;
  tracking_number?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ShopConfig {
  id: string;
  shop_id: string;
  banner_image_url?: string;
  logo_url?: string;
  welcome_message: string;
  payment_approved_message: string;
  payment_pending_message: string;
  payment_rejected_message: string;
  support_message: string;
  whatsapp_number?: string;
  whatsapp_display?: string;
  email_support?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TelegramBotUser {
  id: string;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  role: "user" | "admin" | "shop_owner";
  shop_id?: string; // Link to shop if owner
  created_at: Date;
  updated_at: Date;
}

// Context type for request (includes tenant info)
export interface TenantContext {
  shop_id: string;
  shop_number: number;
  admin_id?: string; // If logged in as admin/owner
  user_id?: string; // If logged in as customer
}
