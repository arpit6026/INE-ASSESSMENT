import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
const storagePath = path.join(__dirname, '../data/storage.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrate() {
  console.log('=====================================================');
  console.log('🚀 Migrating Local Inventory Data to Supabase Database');
  console.log(`🔗 Target: ${SUPABASE_URL}`);
  console.log('=====================================================\n');

  if (!fs.existsSync(storagePath)) {
    console.error('No local storage.json found at', storagePath);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  const products = rawData.products || [];
  const priceHistory = rawData.price_history || [];
  const scrapeLogs = rawData.scrape_logs || [];
  const alerts = rawData.alerts || [];

  console.log(`Found ${products.length} products, ${priceHistory.length} price records, ${scrapeLogs.length} logs, and ${alerts.length} alerts.`);

  // 1. Migrate Products in chunks of 50
  console.log('\n[1/4] Migrating products table...');
  const chunkSize = 50;
  let migratedProducts = 0;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize).map(p => ({
      id: parseInt(p.id, 10),
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      sku: p.sku,
      description: p.description,
      current_price: p.current_price || null,
      mrp: p.mrp || null,
      current_stock: p.current_stock !== undefined ? p.current_stock : null,
      stock_status: p.stock_status || 'in_stock',
      stock_label: p.stock_label || null,
      is_tracked: p.is_tracked !== undefined ? p.is_tracked : false,
      scrape_frequency_hours: p.scrape_frequency_hours || 2,
      last_scraped_at: p.last_scraped_at || null,
      last_scrape_status: p.last_scrape_status || null,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString()
    }));

    const { error } = await supabase.from('products').upsert(chunk);
    if (error) {
      console.error(`Error migrating products batch ${i}..${i + chunkSize}:`, error.message);
    } else {
      migratedProducts += chunk.length;
      console.log(`  Progress: ${migratedProducts}/${products.length} products uploaded`);
    }
  }

  // 2. Migrate Price History
  if (priceHistory.length > 0) {
    console.log('\n[2/4] Migrating price_history table...');
    const { error } = await supabase.from('price_history').insert(priceHistory.map(ph => ({
      product_id: parseInt(ph.product_id, 10),
      price: parseFloat(ph.price),
      mrp: ph.mrp ? parseFloat(ph.mrp) : null,
      stock: ph.stock !== undefined ? ph.stock : null,
      stock_status: ph.stock_status || 'in_stock',
      currency: ph.currency || 'INR',
      scraped_at: ph.scraped_at || new Date().toISOString()
    })));
    if (error) console.warn('  Price history migration note:', error.message);
    else console.log(`  Uploaded ${priceHistory.length} price history records`);
  }

  // 3. Migrate Scrape Logs
  if (scrapeLogs.length > 0) {
    console.log('\n[3/4] Migrating scrape_logs table...');
    const { error } = await supabase.from('scrape_logs').insert(scrapeLogs.map(l => ({
      product_id: parseInt(l.product_id, 10),
      attempt_number: l.attempt_number || 1,
      status: l.status,
      error_message: l.error_message || null,
      duration_ms: l.duration_ms || 0,
      price_extracted: l.price_extracted || null,
      stock_extracted: l.stock_extracted !== undefined ? l.stock_extracted : null,
      mode: l.mode || 'headless',
      created_at: l.created_at || new Date().toISOString()
    })));
    if (error) console.warn('  Scrape logs migration note:', error.message);
    else console.log(`  Uploaded ${scrapeLogs.length} scrape log entries`);
  }

  // 4. Migrate Alerts
  if (alerts.length > 0) {
    console.log('\n[4/4] Migrating alerts table...');
    const { error } = await supabase.from('alerts').insert(alerts.map(a => ({
      product_id: parseInt(a.product_id, 10),
      type: a.type,
      title: a.title,
      message: a.message,
      old_value: a.old_value || null,
      new_value: a.new_value || null,
      is_read: a.is_read || false,
      created_at: a.created_at || new Date().toISOString()
    })));
    if (error) console.warn('  Alerts migration note:', error.message);
    else console.log(`  Uploaded ${alerts.length} alert records`);
  }

  console.log('\n=====================================================');
  console.log('🎉 SUPABASE MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('=====================================================');
}

migrate().catch(err => console.error(err));
