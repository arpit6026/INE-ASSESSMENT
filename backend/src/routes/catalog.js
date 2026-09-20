import express from 'express';
import { searchCatalog, getProductDetails, syncCatalogToStorage, getCategories } from '../scraper/catalogService.js';
import { storage } from '../db/storage.js';

const router = express.Router();

// GET /api/catalog/categories - Dynamic unique categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/catalog/search?q=...&category=...&page=1&limit=20
router.get('/search', async (req, res) => {
  try {
    const { q = '', category = '', page = 1, limit = 20 } = req.query;
    const result = await searchCatalog(q, category, parseInt(page, 10), parseInt(limit, 10));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/catalog/sync - Trigger full store product indexing and sync
router.post('/sync', async (req, res) => {
  try {
    const result = await syncCatalogToStorage(storage);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/catalog/product/:id
router.get('/product/:id', async (req, res) => {
  try {
    const details = await getProductDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Product not found in mock store' });
    }
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

