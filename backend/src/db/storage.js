import { createClient } from '@supabase/supabase-js';
import { localDb } from './localDb.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let useSupabase = false;

if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    useSupabase = true;
    console.log('[Storage] Connected to Supabase PostgreSQL at', SUPABASE_URL);
  } catch (err) {
    console.warn('[Storage] Failed to initialize Supabase client, using localDb fallback:', err.message);
  }
} else {
  console.log('[Storage] Running with local persistent database. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env to use Supabase cloud.');
}

export const storage = {
  isSupabaseConnected() {
    return useSupabase;
  },

  async getProducts(trackedOnly = true) {
    if (useSupabase) {
      try {
        let query = supabase.from('products').select('*');
        if (trackedOnly) {
          query = query.eq('is_tracked', true);
        }
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('[Storage] Supabase getProducts failed, falling back to localDb:', err.message);
      }
    }
    return localDb.getProducts(trackedOnly);
  },

  async getProductById(id) {
    if (useSupabase) {
      try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } catch (err) {
        console.error('[Storage] Supabase getProductById failed:', err.message);
      }
    }
    return localDb.getProductById(id);
  },

  async upsertProduct(productData) {
    const localResult = localDb.upsertProduct(productData);
    if (useSupabase) {
      try {
        const now = new Date().toISOString();
        const payload = {
          ...productData,
          id: parseInt(productData.id, 10),
          updated_at: now
        };
        await supabase.from('products').upsert(payload);
      } catch (err) {
        console.warn('[Storage] Supabase auto-sync upsertProduct warning:', err.message);
      }
    }
    return localResult;
  },

  async upsertProductsBatch(productsList) {
    const localCount = localDb.upsertProductsBatch(productsList);
    if (useSupabase) {
      try {
        const now = new Date().toISOString();
        const payload = productsList.map(p => ({
          ...p,
          id: parseInt(p.id, 10),
          updated_at: now
        }));
        await supabase.from('products').upsert(payload);
      } catch (err) {
        console.warn('[Storage] Supabase auto-sync upsertProductsBatch warning:', err.message);
      }
    }
    return localCount;
  },

  async updateProductTracking(id, isTracked) {
    const localResult = localDb.updateProductTracking(id, isTracked);
    if (useSupabase) {
      try {
        await supabase
          .from('products')
          .update({ is_tracked: isTracked, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('[Storage] Supabase updateProductTracking warning:', err.message);
      }
    }
    return localResult;
  },

  async updateProductFrequency(id, hours) {
    const localResult = localDb.updateProductFrequency(id, hours);
    if (useSupabase) {
      try {
        await supabase
          .from('products')
          .update({ scrape_frequency_hours: parseInt(hours, 10), updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('[Storage] Supabase updateProductFrequency warning:', err.message);
      }
    }
    return localResult;
  },

  async addPriceHistory(record) {
    const localResult = localDb.addPriceHistory(record);
    if (useSupabase) {
      try {
        const payload = {
          product_id: parseInt(record.product_id, 10),
          price: parseFloat(record.price),
          mrp: record.mrp ? parseFloat(record.mrp) : null,
          stock: record.stock !== undefined ? record.stock : null,
          stock_status: record.stock_status || 'in_stock',
          currency: record.currency || 'INR',
          scraped_at: record.scraped_at || new Date().toISOString()
        };
        await supabase.from('price_history').insert(payload);
      } catch (err) {
        console.warn('[Storage] Supabase addPriceHistory warning:', err.message);
      }
    }
    return localResult;
  },

  async getPriceHistory(productId, limit = 50) {
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('price_history')
          .select('*')
          .eq('product_id', productId)
          .order('scraped_at', { ascending: true })
          .limit(limit);
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('[Storage] Supabase getPriceHistory warning:', err.message);
      }
    }
    return localDb.getPriceHistory(productId, limit);
  },

  async addScrapeLog(log) {
    const localResult = localDb.addScrapeLog(log);
    if (useSupabase) {
      try {
        const payload = {
          product_id: parseInt(log.product_id, 10),
          attempt_number: log.attempt_number || 1,
          status: log.status,
          error_message: log.error_message || null,
          duration_ms: log.duration_ms || 0,
          price_extracted: log.price_extracted || null,
          stock_extracted: log.stock_extracted !== undefined ? log.stock_extracted : null,
          mode: log.mode || 'headless',
          created_at: new Date().toISOString()
        };
        await supabase.from('scrape_logs').insert(payload);
      } catch (err) {
        console.warn('[Storage] Supabase addScrapeLog warning:', err.message);
      }
    }
    return localResult;
  },

  async getScrapeLogs(productId = null, limit = 50) {
    if (useSupabase) {
      try {
        let query = supabase.from('scrape_logs').select('*');
        if (productId) {
          query = query.eq('product_id', productId);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('[Storage] Supabase getScrapeLogs warning:', err.message);
      }
    }
    return localDb.getScrapeLogs(productId, limit);
  },

  async addAlert(alert) {
    const localResult = localDb.addAlert(alert);
    if (useSupabase) {
      try {
        await supabase.from('alerts').insert(alert);
      } catch (err) {
        console.warn('[Storage] Supabase addAlert warning:', err.message);
      }
    }
    return localResult;
  },

  async getAlerts(unreadOnly = false) {
    if (useSupabase) {
      try {
        let query = supabase.from('alerts').select('*');
        if (unreadOnly) {
          query = query.eq('is_read', false);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('[Storage] Supabase getAlerts warning:', err.message);
      }
    }
    return localDb.getAlerts(unreadOnly);
  },

  async markAlertRead(id) {
    const localResult = localDb.markAlertRead(id);
    if (useSupabase) {
      try {
        await supabase
          .from('alerts')
          .update({ is_read: true })
          .eq('id', id);
      } catch (err) {
        console.warn('[Storage] Supabase markAlertRead warning:', err.message);
      }
    }
    return localResult;
  }
};

