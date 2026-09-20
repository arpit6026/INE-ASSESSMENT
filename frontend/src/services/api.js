export function getBaseUrl() {
  let url = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
  url = url.replace(/\/+$/, '');
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url += '/api';
  }
  return url;
}

const BASE_URL = getBaseUrl();

export async function fetchCatalog(query = '', category = '', page = 1, limit = 20) {
  const params = new URLSearchParams({ q: query, category, page: String(page), limit: String(limit) });
  const res = await fetch(`${BASE_URL}/catalog/search?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search catalog');
  return res.json();
}

export async function fetchProductDetails(id) {
  const res = await fetch(`${BASE_URL}/catalog/product/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product details');
  return res.json();
}

export async function syncCatalog() {
  const res = await fetch(`${BASE_URL}/catalog/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync catalog');
  return res.json();
}


export async function fetchTrackedProducts() {
  const res = await fetch(`${BASE_URL}/products`);
  if (!res.ok) throw new Error('Failed to fetch tracked products');
  return res.json();
}

export async function trackProduct(id, frequency = 2) {
  const res = await fetch(`${BASE_URL}/products/${id}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frequency })
  });
  if (!res.ok) throw new Error('Failed to track product');
  return res.json();
}

export async function untrackProduct(id) {
  const res = await fetch(`${BASE_URL}/products/${id}/track`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to untrack product');
  return res.json();
}

export async function updateProductFrequency(id, hours) {
  const res = await fetch(`${BASE_URL}/products/${id}/frequency`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours })
  });
  if (!res.ok) throw new Error('Failed to update frequency');
  return res.json();
}

export async function triggerScrape(id, headed = false) {
  const res = await fetch(`${BASE_URL}/products/${id}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headed })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Scrape attempt failed');
  }
  return data;
}

export async function fetchPriceHistory(id) {
  const res = await fetch(`${BASE_URL}/history/${id}`);
  if (!res.ok) throw new Error('Failed to fetch price history');
  return res.json();
}

export async function fetchScrapeLogs(productId = null) {
  const url = productId ? `${BASE_URL}/logs/${productId}` : `${BASE_URL}/logs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch scrape logs');
  return res.json();
}

export async function fetchAnalyticsOverview() {
  const res = await fetch(`${BASE_URL}/history/stats/overview`);
  if (!res.ok) throw new Error('Failed to fetch stats overview');
  return res.json();
}

export async function fetchAlerts(unreadOnly = false) {
  const res = await fetch(`${BASE_URL}/alerts?unread=${unreadOnly}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function markAlertRead(id) {
  const res = await fetch(`${BASE_URL}/alerts/${id}/read`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to mark alert as read');
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${BASE_URL}/catalog/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function triggerHeadedDemo(productId = null) {
  const res = await fetch(`${BASE_URL}/demo/headed-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productId ? { productId } : {})
  });
  return res.json();
}

