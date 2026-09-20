-- ==============================================================================
-- INE Product Price Tracker - Supabase (PostgreSQL) Schema
-- Run this SQL in your Supabase project's SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. Tracked Products Table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  category VARCHAR(255),
  sku VARCHAR(100),
  description TEXT,
  current_price NUMERIC(10, 2),
  mrp NUMERIC(10, 2),
  current_stock INTEGER,
  stock_status VARCHAR(50) DEFAULT 'in_stock',
  stock_label VARCHAR(100),
  is_tracked BOOLEAN DEFAULT TRUE,
  scrape_frequency_hours INTEGER DEFAULT 2,
  last_scraped_at TIMESTAMPTZ,
  last_scrape_status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Price History Table (Time-Series)
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2),
  stock INTEGER,
  stock_status VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'INR',
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_date 
  ON price_history(product_id, scraped_at DESC);

-- 3. Scrape Attempt Audit Logs (Honest Audit Trail)
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'RETRIED', 'FAILED'
  error_message TEXT,
  duration_ms INTEGER NOT NULL,
  price_extracted NUMERIC(10, 2),
  stock_extracted INTEGER,
  mode VARCHAR(50) DEFAULT 'headless',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_date 
  ON scrape_logs(product_id, created_at DESC);

-- 4. Alerts & Notifications (Price drops, stock recovery, layout changes)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'PRICE_DROP', 'PRICE_INCREASE', 'BACK_IN_STOCK', 'OUT_OF_STOCK'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  old_value NUMERIC(10, 2),
  new_value NUMERIC(10, 2),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at 
  ON alerts(created_at DESC);

-- Row Level Security (RLS) policies for open public read/write if using anon key
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for price_history" ON price_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for scrape_logs" ON scrape_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
