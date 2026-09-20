import { storage } from '../db/storage.js';

const TARGET_BASE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

// In-memory catalog cache for lightning fast search and filtering
let catalogCache = [];
let lastCatalogFetch = 0;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Fetches the full product catalog from the mock store API.
 * Uses rate-limit resilient pagination to retrieve all items.
 */
async function fetchPageWithRetry(pageNumber) {
  let attempts = 0;
  while (attempts < 4) {
    attempts++;
    try {
      const res = await fetch(`${TARGET_BASE_URL}/api/catalog?page=${pageNumber}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 400 * attempts));
        continue;
      }
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return null;
}

export async function fetchLiveCatalogFromStore() {
  try {
    console.log('[CatalogService] Indexing full catalog from live store API...');
    const itemMap = new Map();
    const firstData = await fetchPageWithRetry(1);
    if (!firstData) return [];
    
    const totalPages = firstData.pages || 50;
    (firstData.items || []).forEach(item => itemMap.set(item.id, item));

    const chunkSize = 5;
    for (let p = 2; p <= totalPages; p += chunkSize) {
      const pageChunk = [];
      for (let c = p; c < Math.min(p + chunkSize, totalPages + 1); c++) {
        pageChunk.push(fetchPageWithRetry(c));
      }
      const results = await Promise.all(pageChunk);
      for (const data of results) {
        if (data && data.items) {
          data.items.forEach(item => itemMap.set(item.id, item));
        }
      }
      await new Promise(r => setTimeout(r, 40));
    }

    const items = Array.from(itemMap.values());
    if (items.length > 0) {
      catalogCache = items;
      lastCatalogFetch = Date.now();
      console.log(`[CatalogService] Successfully indexed ${catalogCache.length} live catalog items`);
      // Sync into storage
      await storage.upsertProductsBatch(items.map(item => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        brand: item.brand,
        category: item.category,
        sku: item.sku,
        description: item.description,
        is_tracked: false
      })));
    }
    return catalogCache;
  } catch (err) {
    console.warn('[CatalogService] Live store indexing warning:', err.message);
    return catalogCache;
  }
}

export async function getFullCatalog(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && catalogCache.length > 0 && (now - lastCatalogFetch) < CACHE_TTL_MS) {
    return catalogCache;
  }

  // Load from database storage first for instant response
  const stored = await storage.getProducts(false);
  if (stored && stored.length > 0) {
    catalogCache = stored;
    lastCatalogFetch = now;
  }

  // If catalog is empty or forceRefresh requested, trigger live fetch
  if (catalogCache.length === 0 || forceRefresh) {
    await fetchLiveCatalogFromStore();
    const refreshed = await storage.getProducts(false);
    if (refreshed && refreshed.length > 0) {
      catalogCache = refreshed;
    }
  }

  return catalogCache;
}

/**
 * Searches the catalog by query string (matching name, brand, category, SKU)
 */
export async function searchCatalog(query = '', category = '', page = 1, limit = 20) {
  const catalog = await getFullCatalog();
  const q = query.toLowerCase().trim();
  const cat = category.toLowerCase().trim();

  let filtered = catalog;

  if (cat) {
    filtered = filtered.filter(item => (item.category || '').toLowerCase() === cat);
  }

  if (q) {
    filtered = filtered.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const brandMatch = (item.brand || '').toLowerCase().includes(q);
      const skuMatch = (item.sku || '').toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      return nameMatch || brandMatch || skuMatch || descMatch;
    });
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    items
  };
}


/**
 * Syncs all catalog items into storage so all store products are available locally
 */
export async function syncCatalogToStorage(storage) {
  try {
    const catalog = await getFullCatalog(true);
    console.log(`[CatalogService] Syncing ${catalog.length} catalog products to database storage...`);
    const formattedList = catalog.map(item => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      brand: item.brand,
      category: item.category,
      sku: item.sku,
      description: item.description,
      is_tracked: false
    }));
    
    let newlyAdded = 0;
    if (storage.upsertProductsBatch) {
      newlyAdded = await storage.upsertProductsBatch(formattedList);
    } else {
      for (const item of formattedList) {
        await storage.upsertProduct(item);
        newlyAdded++;
      }
    }
    console.log(`[CatalogService] Catalog sync completed! (${catalog.length} products total in database)`);
    return { total: catalog.length, newlyAdded };
  } catch (err) {
    console.error('[CatalogService] Error syncing catalog to storage:', err.message);
    return { error: err.message };
  }
}


/**
 * Gets all unique product categories dynamically from the catalog
 */
export async function getCategories() {
  const catalog = await getFullCatalog();
  const cats = new Set();
  catalog.forEach(item => {
    if (item.category) cats.add(item.category);
  });
  return ['All', ...Array.from(cats).sort()];
}

/**
 * Fetches full static product details including specs and reviews
 */
export async function getProductDetails(productId) {
  try {
    const res = await fetch(`${TARGET_BASE_URL}/api/product/${productId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Product detail API returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[CatalogService] Error fetching details for product ${productId}:`, err.message);
    return null;
  }
}


