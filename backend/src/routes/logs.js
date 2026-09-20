import express from 'express';
import { storage } from '../db/storage.js';

const router = express.Router();

// GET /api/logs - Get recent scrape logs across all products
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const productId = req.query.productId ? parseInt(req.query.productId, 10) : null;
    const logs = await storage.getScrapeLogs(productId, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/:productId - Get scrape logs for a specific product
router.get('/:productId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const logs = await storage.getScrapeLogs(req.params.productId, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
