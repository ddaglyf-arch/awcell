-- Multi-Tenant Database Schema for Shop Management System
-- Supports up to 50 shops in a single database
-- Each shop has complete isolation of data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SHOPS TABLE (Master Tenant Table)
-- ============================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_number INT UNIQUE NOT NULL CHECK (shop_number >= 1 AND shop_number <= 50), -- loja1 to loja50
  shop_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  owner_phone VARCHAR(20) NOT NULL,
  owner_username VARCHAR(255) NOT NULL, -- Login username for owner
  owner_password_hash VARCHAR(255) NOT NULL, -- Hashed password
  dashboard_password_hash VARCHAR(255) NOT NULL, -- Separate dashboard password
  plan_type VARCHAR(50) DEFAULT 'starter' CHECK (plan_type IN ('starter', 'pro', 'premium')), -- Plan type
  plan_duration_days INT DEFAULT 30, -- Duration of the plan in days
  plan_expires_at TIMESTAMP NOT NULL, -- Expiration date
  is_active BOOLEAN DEFAULT TRUE, -- Shop is active or expired
  api_token VARCHAR(255) UNIQUE, -- For external API access
  api_secret VARCHAR(255), -- For webhook verification
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SHOP ADMINS TABLE (Multi-admin per shop)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'editor')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, username)
);

-- ============================================
-- SHOP USERS TABLE (End users who buy from the shop)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(20) UNIQUE NOT NULL, -- No email, using CPF as unique identifier
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, cpf)
);

-- ============================================
-- SHOP CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, name)
);

-- ============================================
-- SHOP PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES shop_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0), -- Price in cents
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN DEFAULT TRUE,
  delivery_type VARCHAR(20) DEFAULT 'physical' CHECK (delivery_type IN ('digital', 'physical')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, name)
);

-- ============================================
-- SHOP PRODUCT DELIVERIES (Digital content)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_product_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID UNIQUE NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('link', 'code', 'text', 'file')),
  delivery_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SHOP CART ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- ============================================
-- SHOP ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE,
  total INTEGER NOT NULL CHECK (total >= 0), -- Total in cents
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  delivery_token VARCHAR(32) UNIQUE,
  delivery_notified_at TIMESTAMP,
  tracking_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SHOP ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0), -- Price in cents
  subtotal INTEGER NOT NULL CHECK (subtotal > 0), -- Total in cents
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SHOP PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  mercado_pago_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  amount INTEGER NOT NULL CHECK (amount > 0), -- Amount in cents
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id)
);

-- ============================================
-- SHOP CUSTOMER ADDRESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(255),
  neighborhood VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SHOP CONFIGURATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID UNIQUE NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  banner_image_url TEXT,
  logo_url TEXT,
  welcome_message TEXT DEFAULT 'Bem-vindo à nossa loja!',
  payment_approved_message TEXT DEFAULT 'Seu pagamento foi aprovado! Obrigado pela compra.',
  payment_pending_message TEXT DEFAULT 'Seu pagamento está sendo processado. Aguarde...',
  payment_rejected_message TEXT DEFAULT 'Seu pagamento foi recusado. Tente novamente.',
  support_message TEXT DEFAULT 'Entre em contato conosco para suporte.',
  whatsapp_number VARCHAR(20),
  whatsapp_display VARCHAR(50),
  email_support VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SHOP ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES shop_admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TELEGRAM BOT USERS TABLE (For bot integration)
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_bot_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'shop_owner')),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL, -- Link to shop if shop owner
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active);
CREATE INDEX IF NOT EXISTS idx_shops_expires ON shops(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_shops_api_token ON shops(api_token);
CREATE INDEX IF NOT EXISTS idx_shop_admins_shop ON shop_admins(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_admins_username ON shop_admins(username);
CREATE INDEX IF NOT EXISTS idx_shop_users_shop ON shop_users(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_users_cpf ON shop_users(cpf);
CREATE INDEX IF NOT EXISTS idx_shop_categories_shop ON shop_categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_shop ON shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products(category_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(active);
CREATE INDEX IF NOT EXISTS idx_shop_cart_items_shop ON shop_cart_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_cart_items_user ON shop_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_shop ON shop_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_payment_status ON shop_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_payments_shop ON shop_payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_payments_order ON shop_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_customer_addresses_user ON shop_customer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_activity_logs_shop ON shop_activity_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_telegram_bot_users_telegram_id ON telegram_bot_users(telegram_id);

-- ============================================
-- UPDATE TIMESTAMP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_admins_updated_at BEFORE UPDATE ON shop_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_users_updated_at BEFORE UPDATE ON shop_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_categories_updated_at BEFORE UPDATE ON shop_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_products_updated_at BEFORE UPDATE ON shop_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_cart_items_updated_at BEFORE UPDATE ON shop_cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_orders_updated_at BEFORE UPDATE ON shop_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_payments_updated_at BEFORE UPDATE ON shop_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_customer_addresses_updated_at BEFORE UPDATE ON shop_customer_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_configs_updated_at BEFORE UPDATE ON shop_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_product_deliveries_updated_at BEFORE UPDATE ON shop_product_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION: SCRIPT TO CREATE ALL 50 SHOPS
-- Run this once to initialize all shops (owner will configure later via admin panel)
-- ============================================
INSERT INTO shops (
  shop_number, shop_name, owner_name, owner_phone, owner_username, 
  owner_password_hash, dashboard_password_hash, plan_expires_at
) VALUES
(1, 'Loja 1', 'Owner 1', '11999999901', 'loja1', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(2, 'Loja 2', 'Owner 2', '11999999902', 'loja2', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(3, 'Loja 3', 'Owner 3', '11999999903', 'loja3', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(4, 'Loja 4', 'Owner 4', '11999999904', 'loja4', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(5, 'Loja 5', 'Owner 5', '11999999905', 'loja5', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(6, 'Loja 6', 'Owner 6', '11999999906', 'loja6', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(7, 'Loja 7', 'Owner 7', '11999999907', 'loja7', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(8, 'Loja 8', 'Owner 8', '11999999908', 'loja8', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(9, 'Loja 9', 'Owner 9', '11999999909', 'loja9', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(10, 'Loja 10', 'Owner 10', '11999999910', 'loja10', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(11, 'Loja 11', 'Owner 11', '11999999911', 'loja11', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(12, 'Loja 12', 'Owner 12', '11999999912', 'loja12', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(13, 'Loja 13', 'Owner 13', '11999999913', 'loja13', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(14, 'Loja 14', 'Owner 14', '11999999914', 'loja14', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(15, 'Loja 15', 'Owner 15', '11999999915', 'loja15', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(16, 'Loja 16', 'Owner 16', '11999999916', 'loja16', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(17, 'Loja 17', 'Owner 17', '11999999917', 'loja17', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(18, 'Loja 18', 'Owner 18', '11999999918', 'loja18', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(19, 'Loja 19', 'Owner 19', '11999999919', 'loja19', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(20, 'Loja 20', 'Owner 20', '11999999920', 'loja20', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(21, 'Loja 21', 'Owner 21', '11999999921', 'loja21', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(22, 'Loja 22', 'Owner 22', '11999999922', 'loja22', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(23, 'Loja 23', 'Owner 23', '11999999923', 'loja23', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(24, 'Loja 24', 'Owner 24', '11999999924', 'loja24', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(25, 'Loja 25', 'Owner 25', '11999999925', 'loja25', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(26, 'Loja 26', 'Owner 26', '11999999926', 'loja26', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(27, 'Loja 27', 'Owner 27', '11999999927', 'loja27', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(28, 'Loja 28', 'Owner 28', '11999999928', 'loja28', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(29, 'Loja 29', 'Owner 29', '11999999929', 'loja29', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(30, 'Loja 30', 'Owner 30', '11999999930', 'loja30', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(31, 'Loja 31', 'Owner 31', '11999999931', 'loja31', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(32, 'Loja 32', 'Owner 32', '11999999932', 'loja32', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(33, 'Loja 33', 'Owner 33', '11999999933', 'loja33', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(34, 'Loja 34', 'Owner 34', '11999999934', 'loja34', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(35, 'Loja 35', 'Owner 35', '11999999935', 'loja35', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(36, 'Loja 36', 'Owner 36', '11999999936', 'loja36', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(37, 'Loja 37', 'Owner 37', '11999999937', 'loja37', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(38, 'Loja 38', 'Owner 38', '11999999938', 'loja38', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(39, 'Loja 39', 'Owner 39', '11999999939', 'loja39', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(40, 'Loja 40', 'Owner 40', '11999999940', 'loja40', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(41, 'Loja 41', 'Owner 41', '11999999941', 'loja41', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(42, 'Loja 42', 'Owner 42', '11999999942', 'loja42', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(43, 'Loja 43', 'Owner 43', '11999999943', 'loja43', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(44, 'Loja 44', 'Owner 44', '11999999944', 'loja44', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(45, 'Loja 45', 'Owner 45', '11999999945', 'loja45', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(46, 'Loja 46', 'Owner 46', '11999999946', 'loja46', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(47, 'Loja 47', 'Owner 47', '11999999947', 'loja47', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(48, 'Loja 48', 'Owner 48', '11999999948', 'loja48', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(49, 'Loja 49', 'Owner 49', '11999999949', 'loja49', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'),
(50, 'Loja 50', 'Owner 50', '11999999950', 'loja50', '', '', CURRENT_TIMESTAMP + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- CREATE shop_configs FOR ALL 50 SHOPS
-- ============================================
INSERT INTO shop_configs (shop_id)
SELECT id FROM shops WHERE shop_id NOT IN (SELECT shop_id FROM shop_configs)
ON CONFLICT DO NOTHING;
