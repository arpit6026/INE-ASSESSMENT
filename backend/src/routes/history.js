import express from 'express';
import { storage } from '../db/storage.js';

const router = express.Router();

// GET /api/history/:productId - Get price and stock history
router.get('/:productId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const history = await storage.getPriceHistory(req.params.productId, limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/stats/overview - Summary analytics across all tracked products
router.get('/stats/overview', async (req, res) => {
  try {
    const products = await storage.getProducts(true);
    const totalTracked = products.length;
    
    let totalValue = 0;
    let pricedCount = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const p of products) {
      if (p.current_price) {
        totalValue += Number(p.current_price);
        pricedCount++;
      }
      if (p.stock_status === 'out_of_stock' || p.current_stock === 0) {
        outOfStockCount++;
      } else if (p.stock_status === 'low_stock') {
        lowStockCount++;
      }
    }

    const avgPrice = pricedCount > 0 ? Math.round(totalValue / pricedCount) : 0;
    const alerts = await storage.getAlerts(true);

    res.json({
      totalTracked,
      pricedCount,
      avgPrice,
      outOfStockCount,
      lowStockCount,
      unreadAlertsCount: alerts.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
