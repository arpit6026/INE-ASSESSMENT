import express from 'express';
import { storage } from '../db/storage.js';

const router = express.Router();

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const alerts = await storage.getAlerts(unreadOnly);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await storage.markAlertRead(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
