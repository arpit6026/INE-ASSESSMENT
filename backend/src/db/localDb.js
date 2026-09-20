import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/storage.json');

// Ensure data folder exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory data store with atomic disk sync
let db = {
  products: [],
  price_history: [],
  scrape_logs: [],
  alerts: []
};

// Load existing data from disk
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    db = { ...db, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[LocalDB] Warning: Could not parse existing storage.json, starting fresh');
  }
}

function saveDb() {
  try {
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error('[LocalDB] Error persisting to disk:', err.message);
  }
}

export const localDb = {
  getProducts(trackedOnly = true) {
    if (trackedOnly) {
      return db.products.filter(p => p.is_tracked);
    }
    return db.products;
  },

  getProductById(id) {
    return db.products.find(p => String(p.id) === String(id)) || null;
  },

  upsertProduct(productData) {
    const id = parseInt(productData.id, 10);
    const existingIndex = db.products.findIndex(p => p.id === id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      db.products[existingIndex] = {
        ...db.products[existingIndex],
        ...productData,
        id,
        updated_at: now
      };
      saveDb();
      return db.products[existingIndex];
    } else {
      const newProduct = {
        ...productData,
        id,
        is_tracked: productData.is_tracked !== undefined ? productData.is_tracked : true,
        scrape_frequency_hours: productData.scrape_frequency_hours || 2,
        created_at: now,
        updated_at: now
      };
      db.products.push(newProduct);
      saveDb();
      return newProduct;
    }
  },

  upsertProductsBatch(productsList) {
    const now = new Date().toISOString();
    let count = 0;
    for (const productData of productsList) {
      const id = parseInt(productData.id, 10);
      const existingIndex = db.products.findIndex(p => p.id === id);

      if (existingIndex >= 0) {
        db.products[existingIndex] = {
          ...db.products[existingIndex],
          ...productData,
          id,
          updated_at: now
        };
      } else {
        const newProduct = {
          ...productData,
          id,
          is_tracked: productData.is_tracked !== undefined ? productData.is_tracked : false,
          scrape_frequency_hours: productData.scrape_frequency_hours || 2,
          created_at: now,
          updated_at: now
        };
        db.products.push(newProduct);
        count++;
      }
    }
    saveDb();
    return count;
  },


  updateProductTracking(id, isTracked) {
    const p = db.products.find(item => String(item.id) === String(id));
    if (p) {
      p.is_tracked = isTracked;
      p.updated_at = new Date().toISOString();
      saveDb();
      return p;
    }
    return null;
  },

  updateProductFrequency(id, hours) {
    const p = db.products.find(item => String(item.id) === String(id));
    if (p) {
      p.scrape_frequency_hours = parseInt(hours, 10);
      p.updated_at = new Date().toISOString();
      saveDb();
      return p;
    }
    return null;
  },

  addPriceHistory(record) {
    const newRecord = {
      id: `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      product_id: parseInt(record.product_id, 10),
      price: parseFloat(record.price),
      mrp: record.mrp ? parseFloat(record.mrp) : null,
      stock: record.stock !== undefined ? record.stock : null,
      stock_status: record.stock_status || 'in_stock',
      currency: record.currency || 'INR',
      scraped_at: record.scraped_at || new Date().toISOString()
    };
    db.price_history.push(newRecord);
    saveDb();
    return newRecord;
  },

  getPriceHistory(productId, limit = 50) {
    const id = parseInt(productId, 10);
    return db.price_history
      .filter(h => h.product_id === id)
      .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at))
      .slice(-limit);
  },

  addScrapeLog(log) {
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      product_id: parseInt(log.product_id, 10),
      attempt_number: log.attempt_number || 1,
      status: log.status, // 'SUCCESS', 'RETRIED', 'FAILED'
      error_message: log.error_message || null,
      duration_ms: log.duration_ms || 0,
      price_extracted: log.price_extracted || null,
      stock_extracted: log.stock_extracted !== undefined ? log.stock_extracted : null,
      mode: log.mode || 'headless',
      created_at: new Date().toISOString()
    };
    db.scrape_logs.push(newLog);
    saveDb();
    return newLog;
  },

  getScrapeLogs(productId = null, limit = 50) {
    let logs = db.scrape_logs;
    if (productId) {
      const id = parseInt(productId, 10);
      logs = logs.filter(l => l.product_id === id);
    }
    return logs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },

  addAlert(alert) {
    const newAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      product_id: parseInt(alert.product_id, 10),
      type: alert.type,
      title: alert.title,
      message: alert.message,
      old_value: alert.old_value,
      new_value: alert.new_value,
      is_read: false,
      created_at: new Date().toISOString()
    };
    db.alerts.unshift(newAlert);
    saveDb();
    return newAlert;
  },

  getAlerts(unreadOnly = false) {
    if (unreadOnly) {
      return db.alerts.filter(a => !a.is_read);
    }
    return db.alerts;
  },

  markAlertRead(id) {
    const alert = db.alerts.find(a => a.id === id);
    if (alert) {
      alert.is_read = true;
      saveDb();
      return alert;
    }
    return null;
  }
};
