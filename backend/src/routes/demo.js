import express from 'express';
import { scrapeProductPrice } from '../scraper/playwrightScraper.js';
import { storage } from '../db/storage.js';

const router = express.Router();

// POST /api/demo/headed-run - Trigger observable run on server
router.post('/headed-run', async (req, res) => {
  let { productId } = req.body || {};
  if (!productId) {
    const tracked = await storage.getProducts(true);
    if (tracked && tracked.length > 0) {
      productId = tracked[0].id;
    } else {
      const allProds = await storage.getProducts(false);
      productId = (allProds && allProds.length > 0) ? allProds[0].id : 1;
    }
  }
  const logs = [];

  try {
    const result = await scrapeProductPrice(productId, {
      headed: process.env.ENABLE_HEADED_BROWSER === 'true',
      slowMo: 120,
      onLog: (entry) => logs.push(entry)
    });

    if (result.success) {
      const product = await storage.getProductById(productId);
      if (product) {
        await storage.addPriceHistory({
          product_id: productId,
          price: result.price,
          mrp: result.mrp,
          stock: result.stock,
          stock_status: result.stockStatus,
          currency: 'INR'
        });
      }
    }

    await storage.addScrapeLog({
      product_id: productId,
      attempt_number: result.attemptCount,
      status: result.status,
      error_message: result.errorMessage,
      duration_ms: result.durationMs,
      price_extracted: result.price,
      stock_extracted: result.stock,
      mode: 'headed_demo'
    });

    res.json({
      success: result.success,
      result,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message, logs });
  }
});

export default router;
