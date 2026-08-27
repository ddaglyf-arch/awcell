// User types
export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  role: "user" | "admin";
  created_at: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
  stock: number;
  active: boolean;
  delivery_type: "digital" | "physical";
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Cart types
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// Order types
export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PaymentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export interface Order {
  id: string;
  user_id: string;
  total: number;
  status: OrderStatus;
  payment_id: string | null;
  delivery_token: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Payment types
export interface Payment {
  id: string;
  order_id: string;
  mercado_pago_id: string | null;
  status: PaymentStatus;
  amount: number;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

// Store config types
export interface StoreConfig {
  id: string;
  store_name: string;
  store_description: string;
  banner_image_url: string | null;
  welcome_message: string;
  payment_approved_message: string;
  payment_pending_message: string;
  payment_rejected_message: string;
  support_message: string;
  created_at: string;
  updated_at: string;
}

// Digital delivery types
export interface DigitalDelivery {
  id: string;
  product_id: string;
  order_id: string;
  user_id: string;
  delivery_type: "link" | "code" | "text" | "file";
  delivery_content: string;
  created_at: string;
}

// Conversation state types
export enum ConversationState {
  IDLE = "idle",
  CREATE_PRODUCT_NAME = "create_product_name",
  CREATE_PRODUCT_DESCRIPTION = "create_product_description",
  CREATE_PRODUCT_PRICE = "create_product_price",
  CREATE_PRODUCT_CATEGORY = "create_product_category",
  CREATE_PRODUCT_STOCK = "create_product_stock",
  CREATE_PRODUCT_IMAGE = "create_product_image",
  CREATE_PRODUCT_CONFIRM = "create_product_confirm",
  CREATE_CATEGORY_NAME = "create_category_name",
  CREATE_CATEGORY_DESCRIPTION = "create_category_description",
  CREATE_CATEGORY_CONFIRM = "create_category_confirm",
  EDIT_PRODUCT_SELECT = "edit_product_select",
  EDIT_PRODUCT_FIELD = "edit_product_field",
  EDIT_PRODUCT_VALUE = "edit_product_value",
}

export interface UserConversationState {
  id: string;
  user_id: string;
  telegram_id: number;
  state: ConversationState;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Mercado Pago types
export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface MercadoPagoNotification {
  id: string;
  type: string;
  data: {
    id: string;
  };
  live_mode: boolean;
  timestamp: string;
  user_id: string;
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  description: string;
  amount_refunded: number;
  transaction_amount: number;
  installments: number;
  payment_method_id: string;
}

// Telegram types
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  from: TelegramUser;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_size: number;
  }>;
}
