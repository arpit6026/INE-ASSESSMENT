import express from 'express';
import { storage } from '../db/storage.js';
import { scrapeProductPrice } from '../scraper/playwrightScraper.js';

const router = express.Router();

const CRON_SECRET = process.env.CRON_SECRET || 'ine_cron_secret_key_2026';

// Middleware to verify authorization for scheduled scrape execution
function verifyCronAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.query.secret;

  if (process.env.NODE_ENV === 'production' && token !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid cron secret token' });
  }
  next();
}

// GET /api/cron/health - Keep-alive endpoint to prevent Render instance sleep
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    storage: storage.isSupabaseConnected() ? 'supabase' : 'local_db'
  });
});

// POST /api/cron/scrape - Scheduled scraping runner triggered by external cron (e.g. cron-job.org)
router.post('/scrape', verifyCronAuth, async (req, res) => {
  const runStartTime = Date.now();
  console.log('[Cron] Triggered scheduled scrape job at', new Date().toISOString());

  try {
    const products = await storage.getProducts(true);
    if (products.length === 0) {
      return res.json({
        message: 'No tracked products found to scrape',
        count: 0,
        durationMs: Date.now() - runStartTime
      });
    }

    const results = [];

    // Process products sequentially to avoid overwhelming the mock store and respecting rate limits
    for (const product of products) {
      console.log(`[Cron] Scheduled scrape running for product ${product.id} (${product.name})...`);
      
      try {
        const scrapeResult = await scrapeProductPrice(product.id, { headed: false });
        
        // Log attempt honestly
        await storage.addScrapeLog({
          product_id: product.id,
          attempt_number: scrapeResult.attemptCount,
          status: scrapeResult.status,
          error_message: scrapeResult.errorMessage,
          duration_ms: scrapeResult.durationMs,
          price_extracted: scrapeResult.price,
          stock_extracted: scrapeResult.stock,
          mode: 'headless_cron'
        });

        if (scrapeResult.success) {
          const oldPrice = product.current_price;
          const oldStock = product.current_stock;
          const newPrice = scrapeResult.price;
          const newStock = scrapeResult.stock;

          // Update product
          await storage.upsertProduct({
            ...product,
            current_price: newPrice,
            mrp: scrapeResult.mrp,
            current_stock: newStock,
            stock_status: scrapeResult.stockStatus,
            stock_label: scrapeResult.stockLabel,
            last_scraped_at: new Date().toISOString(),
            last_scrape_status: scrapeResult.status
          });

          // Time series history
          await storage.addPriceHistory({
            product_id: product.id,
            price: newPrice,
            mrp: scrapeResult.mrp,
            stock: newStock,
            stock_status: scrapeResult.stockStatus,
            currency: 'INR',
            scraped_at: new Date().toISOString()
          });

          // Price drop alert
          if (oldPrice && newPrice < oldPrice) {
            await storage.addAlert({
              product_id: product.id,
              type: 'PRICE_DROP',
              title: `Price Drop: ${product.name}`,
              message: `Price dropped from ₹${oldPrice.toLocaleString('en-IN')} to ₹${newPrice.toLocaleString('en-IN')}`,
              old_value: oldPrice,
              new_value: newPrice
            });
          }

          results.push({ id: product.id, status: 'SUCCESS', price: newPrice, stock: newStock });
        } else {
          // Failure update
          await storage.upsertProduct({
            ...product,
            last_scraped_at: new Date().toISOString(),
            last_scrape_status: scrapeResult.status
          });
          results.push({ id: product.id, status: scrapeResult.status, error: scrapeResult.errorMessage });
        }

        // Brief delay between products to remain gentle on mock store
        await new Promise(r => setTimeout(r, 1000));

      } catch (prodErr) {
        console.error(`[Cron] Error scraping product ${product.id}:`, prodErr.message);
        await storage.addScrapeLog({
          product_id: product.id,
          attempt_number: 1,
          status: 'FAILED',
          error_message: prodErr.message,
          duration_ms: 0,
          mode: 'headless_cron'
        });
        results.push({ id: product.id, status: 'FAILED', error: prodErr.message });
      }
    }

    res.json({
      message: 'Scheduled scrape completed',
      totalProcessed: products.length,
      durationMs: Date.now() - runStartTime,
      results
    });

  } catch (err) {
    console.error('[Cron] Fatal error in scheduled scrape handler:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
