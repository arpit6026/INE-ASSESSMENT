import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import catalogRoutes from './routes/catalog.js';
import productsRoutes from './routes/products.js';
import historyRoutes from './routes/history.js';
import logsRoutes from './routes/logs.js';
import cronRoutes from './routes/cron.js';
import alertsRoutes from './routes/alerts.js';
import demoRoutes from './routes/demo.js';
import { getFullCatalog, syncCatalogToStorage } from './scraper/catalogService.js';
import { storage } from './db/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static recordings directory
const recordingsDir = path.join(__dirname, '../../recordings');
app.use('/recordings', express.static(recordingsDir));

// API Routes
app.use('/api/catalog', catalogRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/demo', demoRoutes);

// Serve frontend static dist build if present
const frontendDistDir = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistDir)) {
  console.log('[Server] Serving compiled React frontend from:', frontendDistDir);
  app.use(express.static(frontendDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/recordings')) {
      return next();
    }
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'INE Product Price Tracker Fullstack Service',
      version: '1.0.0',
      status: 'online',
      mockStore: 'https://demo.inelabteamdev.com'
    });
  });
}

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 INE Product Price Tracker Backend running on port ${PORT}`);
  console.log(`🔗 Mock Store Target: https://demo.inelabteamdev.com`);
  console.log(`⏰ Cron Endpoint: /api/cron/scrape`);
  console.log(`====================================================`);

  // Pre-warm catalog cache and sync to storage asynchronously
  syncCatalogToStorage(storage).catch(err => console.warn('[Server] Pre-warm catalog warning:', err.message));
});

