import express from 'express';
import { storage } from '../db/storage.js';
import { getProductDetails } from '../scraper/catalogService.js';
import { scrapeProductPrice } from '../scraper/playwrightScraper.js';

const router = express.Router();

// GET /api/products - Get all tracked products
router.get('/', async (req, res) => {
  try {
    const trackedOnly = req.query.all !== 'true';
    const products = await storage.getProducts(trackedOnly);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await storage.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found in tracker' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/track - Start tracking a product
router.post('/:id/track', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    let existing = await storage.getProductById(id);

    if (existing) {
      const updated = await storage.updateProductTracking(id, true);
      return res.json({ message: 'Product tracking resumed', product: updated });
    }

    // Fetch product info from mock store
    const details = await getProductDetails(id);
    if (!details) {
      return res.status(404).json({ error: 'Product not found in mock store' });
    }

    const newProduct = {
      id: details.id,
      slug: details.slug,
      name: details.name,
      brand: details.brand,
      category: details.category,
      sku: details.sku,
      description: details.description,
      is_tracked: true,
      scrape_frequency_hours: req.body.frequency || 2
    };

    const saved = await storage.upsertProduct(newProduct);
    res.status(201).json({ message: 'Product added to tracking', product: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id/track - Stop tracking a product
router.delete('/:id/track', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await storage.updateProductTracking(id, false);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product untracked successfully', product: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/products/:id/frequency - Update scrape frequency
router.patch('/:id/frequency', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { hours } = req.body;
    if (!hours || isNaN(hours)) {
      return res.status(400).json({ error: 'Invalid frequency hours' });
    }
    const updated = await storage.updateProductFrequency(id, hours);
    res.json({ message: 'Frequency updated', product: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/scrape - Perform on-demand scrape
router.post('/:id/scrape', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    let product = await storage.getProductById(id);
    if (!product) {
      // Auto-register if not yet tracked
      const details = await getProductDetails(id);
      if (!details) {
        return res.status(404).json({ error: 'Product not found in mock store' });
      }
      product = await storage.upsertProduct({
        id: details.id,
        slug: details.slug,
        name: details.name,
        brand: details.brand,
        category: details.category,
        sku: details.sku,
        description: details.description,
        is_tracked: true
      });
    }

    const { headed = false } = req.body;
    console.log(`[Scraper] Starting scrape for product ${id} (${product.name})...`);

    // Execute Playwright scraper
    const scrapeResult = await scrapeProductPrice(id, { headed });

    // 1. Record scrape log entry (honest audit trail)
    await storage.addScrapeLog({
      product_id: id,
      attempt_number: scrapeResult.attemptCount,
      status: scrapeResult.status,
      error_message: scrapeResult.errorMessage,
      duration_ms: scrapeResult.durationMs,
      price_extracted: scrapeResult.price,
      stock_extracted: scrapeResult.stock,
      mode: headed ? 'headed' : 'headless'
    });

    // 2. Handle scrape outcome
    if (scrapeResult.success) {
      const oldPrice = product.current_price;
      const oldStock = product.current_stock;
      const newPrice = scrapeResult.price;
      const newStock = scrapeResult.stock;

      // Update product record
      const updatedProduct = await storage.upsertProduct({
        ...product,
        current_price: newPrice,
        mrp: scrapeResult.mrp,
        current_stock: newStock,
        stock_status: scrapeResult.stockStatus,
        stock_label: scrapeResult.stockLabel,
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: scrapeResult.status
      });

      // Save to price history time series
      await storage.addPriceHistory({
        product_id: id,
        price: newPrice,
        mrp: scrapeResult.mrp,
        stock: newStock,
        stock_status: scrapeResult.stockStatus,
        currency: 'INR',
        scraped_at: new Date().toISOString()
      });

      // Check for price drop alert
      if (oldPrice && newPrice < oldPrice) {
        const dropAmount = Math.round((oldPrice - newPrice) * 100) / 100;
        await storage.addAlert({
          product_id: id,
          type: 'PRICE_DROP',
          title: `Price Drop Alert: ${product.name}`,
          message: `Price dropped by ₹${dropAmount.toLocaleString('en-IN')} (from ₹${oldPrice.toLocaleString('en-IN')} to ₹${newPrice.toLocaleString('en-IN')})`,
          old_value: oldPrice,
          new_value: newPrice
        });
      }

      // Check for back in stock alert
      if (oldStock === 0 && newStock > 0) {
        await storage.addAlert({
          product_id: id,
          type: 'BACK_IN_STOCK',
          title: `Back in Stock: ${product.name}`,
          message: `${product.name} is now back in stock with ${newStock} units available!`,
          old_value: 0,
          new_value: newStock
        });
      }

      res.json({
        success: true,
        message: 'Product scraped successfully',
        data: scrapeResult,
        product: updatedProduct
      });
    } else {
      // Record failure on product record WITHOUT wiping out existing price
      await storage.upsertProduct({
        ...product,
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: scrapeResult.status
      });

      res.json({
        success: false,
        message: scrapeResult.errorMessage || 'Scrape attempt failed after retries',
        data: scrapeResult
      });
    }

  } catch (err) {
    console.error(`[Scraper] Unhandled error during scrape for product ${id}:`, err);
    await storage.addScrapeLog({
      product_id: id,
      attempt_number: 1,
      status: 'FAILED',
      error_message: err.message,
      duration_ms: 0,
      mode: 'headless'
    });
    res.status(500).json({ error: err.message });
  }
});

export default router;
