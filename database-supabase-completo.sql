-- ============================================================
-- BANCO COMPLETO: BOT TELEGRAM + SITE MULTI-TENANT
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- Pode executar novamente sem duplicar lojas ou configuracoes.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================== BOT LEGADO ===========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255), first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT, active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL, price INTEGER NOT NULL CHECK (price > 0), image_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL, stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN DEFAULT TRUE, delivery_type VARCHAR(20) DEFAULT 'physical' CHECK (delivery_type IN ('digital','physical')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total INTEGER NOT NULL CHECK (total >= 0), status VARCHAR(20) DEFAULT 'pending', payment_id VARCHAR(255),
  delivery_token VARCHAR(32) UNIQUE, delivery_notified_at TIMESTAMP,
  payment_status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_token VARCHAR(32);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notified_at TIMESTAMP;
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0), subtotal INTEGER NOT NULL CHECK (subtotal > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mercado_pago_id VARCHAR(255), status VARCHAR(20) DEFAULT 'pending', amount INTEGER NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS digital_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_type VARCHAR(20) NOT NULL, delivery_content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS product_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delivery_type VARCHAR(20) NOT NULL, delivery_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS store_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), store_name VARCHAR(255) DEFAULT 'Minha Loja',
  store_description TEXT, banner_image_url TEXT, welcome_message TEXT DEFAULT 'Bem-vindo à nossa loja!',
  payment_approved_message TEXT, payment_pending_message TEXT, payment_rejected_message TEXT,
  support_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), admin_id BIGINT NOT NULL, action VARCHAR(100) NOT NULL,
  description TEXT, status VARCHAR(20) DEFAULT 'success', error_message TEXT, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_conversation_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL, state VARCHAR(80) DEFAULT 'idle', data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), provider VARCHAR(50) NOT NULL, event_type VARCHAR(100),
  payload JSONB, processed BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================== LOJAS 1 A 50 =========================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_number INT UNIQUE NOT NULL CHECK (shop_number BETWEEN 1 AND 50),
  shop_name VARCHAR(255) NOT NULL, owner_name VARCHAR(255) NOT NULL, owner_phone VARCHAR(20) NOT NULL,
  owner_username VARCHAR(255) NOT NULL, owner_password_hash VARCHAR(255) NOT NULL,
  dashboard_password_hash VARCHAR(255) NOT NULL, plan_type VARCHAR(50) DEFAULT 'starter',
  plan_duration_days INT DEFAULT 30, plan_expires_at TIMESTAMP NOT NULL, is_active BOOLEAN DEFAULT TRUE,
  api_token VARCHAR(255) UNIQUE, api_secret VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shop_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL, email VARCHAR(255), full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin', permissions JSONB DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, username)
);
CREATE TABLE IF NOT EXISTS shop_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL, cpf VARCHAR(20) NOT NULL, password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255), phone VARCHAR(20), is_active BOOLEAN DEFAULT TRUE, last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, cpf)
);
CREATE TABLE IF NOT EXISTS shop_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, description TEXT, image_url TEXT, display_order INT DEFAULT 0, active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(shop_id, name)
);
CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES shop_categories(id) ON DELETE SET NULL, name VARCHAR(255) NOT NULL, description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0), image_url TEXT, stock INTEGER DEFAULT 0 CHECK (stock >= 0), active BOOLEAN DEFAULT TRUE,
  delivery_type VARCHAR(20) DEFAULT 'physical', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, compare_at_price INTEGER, promotion_label VARCHAR(100), UNIQUE(shop_id, name)
);
CREATE TABLE IF NOT EXISTS shop_product_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID UNIQUE NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('manual','automatic')), delivery_content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shop_delivery_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  content TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','delivered')),
  order_id UUID, delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shop_delivery_stock_available ON shop_delivery_stock(product_id, status);
CREATE TABLE IF NOT EXISTS shop_cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, product_id)
);
CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE, total INTEGER NOT NULL CHECK (total >= 0),
  status VARCHAR(20) DEFAULT 'pending', payment_id VARCHAR(255), payment_status VARCHAR(20) DEFAULT 'pending',
  delivery_token VARCHAR(32) UNIQUE, delivery_notified_at TIMESTAMP, tracking_number VARCHAR(100),
  checkout_key VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS checkout_key VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_orders_checkout_key ON shop_orders(shop_id, user_id, checkout_key) WHERE checkout_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id), quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0), subtotal INTEGER NOT NULL CHECK (subtotal > 0), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shop_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID UNIQUE NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE, mercado_pago_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', amount INTEGER NOT NULL CHECK (amount > 0), payment_method VARCHAR(50),
  qr_code TEXT, qr_code_base64 TEXT, ticket_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shop_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE, delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('manual','automatic')),
  content TEXT, status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','delivered')), delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE shop_payments ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE shop_payments ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT;
ALTER TABLE shop_payments ADD COLUMN IF NOT EXISTS ticket_url TEXT;
CREATE TABLE IF NOT EXISTS shop_customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE, street VARCHAR(255) NOT NULL, number VARCHAR(20) NOT NULL,
  complement VARCHAR(255), neighborhood VARCHAR(255) NOT NULL, city VARCHAR(255) NOT NULL, state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL, is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shop_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID UNIQUE NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  banner_image_url TEXT, logo_url TEXT, welcome_message TEXT DEFAULT 'Bem-vindo à nossa loja!',
  payment_approved_message TEXT, payment_pending_message TEXT, payment_rejected_message TEXT, support_message TEXT,
  whatsapp_number VARCHAR(20), whatsapp_display VARCHAR(50), email_support VARCHAR(255),
  theme_primary_color VARCHAR(20) DEFAULT '#102A43', theme_accent_color VARCHAR(20) DEFAULT '#E76F51',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS compare_at_price INTEGER;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS promotion_label VARCHAR(100);
ALTER TABLE shop_configs ADD COLUMN IF NOT EXISTS theme_primary_color VARCHAR(20) DEFAULT '#102A43';
ALTER TABLE shop_configs ADD COLUMN IF NOT EXISTS theme_accent_color VARCHAR(20) DEFAULT '#E76F51';
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE shop_payments ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE shop_payments ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT;
ALTER TABLE shop_payments ADD COLUMN IF NOT EXISTS ticket_url TEXT;
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint WHERE conrelid = 'shop_product_deliveries'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE shop_product_deliveries DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
  UPDATE shop_product_deliveries SET delivery_type = 'manual'
  WHERE delivery_type NOT IN ('manual', 'automatic');
  ALTER TABLE shop_product_deliveries ADD CONSTRAINT shop_product_deliveries_type_check CHECK (delivery_type IN ('manual','automatic'));
END $$;
CREATE TABLE IF NOT EXISTS shop_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES shop_admins(id) ON DELETE SET NULL, action VARCHAR(100) NOT NULL, description TEXT,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS telegram_bot_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), telegram_id BIGINT UNIQUE NOT NULL, username VARCHAR(255),
  first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255), role VARCHAR(20) DEFAULT 'user',
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================== INDICES =============================
CREATE INDEX IF NOT EXISTS idx_shop_products_shop ON shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(active);
CREATE INDEX IF NOT EXISTS idx_shop_users_shop ON shop_users(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_shop ON shop_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active);
CREATE INDEX IF NOT EXISTS idx_shops_expires ON shops(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- ====================== TRIGGERS =============================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','categories','products','cart_items','orders','payments','product_deliveries','store_config','user_conversation_states','shops','shop_admins','shop_users','shop_categories','shop_products','shop_product_deliveries','shop_cart_items','shop_orders','shop_payments','shop_customer_addresses','shop_configs','telegram_bot_users'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'updated_at_' || table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'updated_at_' || table_name, table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION decrement_shop_product_stock(product_id_input UUID, quantity_input INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE shop_products SET stock = stock - quantity_input
  WHERE id = product_id_input AND stock >= quantity_input;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION claim_shop_delivery_item(product_id_input UUID, order_id_input UUID)
RETURNS TABLE(content TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE shop_delivery_stock
  SET status = 'delivered', order_id = order_id_input, delivered_at = CURRENT_TIMESTAMP
  WHERE id = (
    SELECT id FROM shop_delivery_stock
    WHERE product_id = product_id_input AND status = 'available'
    ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
  )
  RETURNING shop_delivery_stock.content;
END;
$$ LANGUAGE plpgsql;

-- Configuracao legada do bot
INSERT INTO store_config (store_name, store_description, banner_image_url, welcome_message)
VALUES ('Minha Loja','Bem-vindo à nossa loja virtual!','https://i.postimg.cc/7Htz3vX9/4936162500223372332.jpg','Olá! Bem-vindo à nossa loja.')
ON CONFLICT DO NOTHING;

-- Reserva as 50 lojas para configuracao pelo comando /admin.
-- Senhas vazias impedem login ate o administrador configurar a loja.
INSERT INTO shops (shop_number, shop_name, owner_name, owner_phone, owner_username, owner_password_hash, dashboard_password_hash, plan_expires_at)
SELECT number, 'Loja ' || number, 'Owner ' || number, '119999999' || LPAD(number::TEXT, 2, '0'), 'loja' || number, '', '', CURRENT_TIMESTAMP + INTERVAL '30 days'
FROM generate_series(1, 50) AS number
ON CONFLICT (shop_number) DO NOTHING;
INSERT INTO shop_configs (shop_id)
SELECT id FROM shops WHERE id NOT IN (SELECT shop_id FROM shop_configs)
ON CONFLICT DO NOTHING;

-- O backend usa service role, portanto estas tabelas ficam acessiveis apenas por ele.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
