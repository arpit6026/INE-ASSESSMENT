import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storagePath = path.join(__dirname, '../data/storage.json');

async function main() {
  let storageData = { products: [], price_history: [], scrape_logs: [], alerts: [] };
  if (fs.existsSync(storagePath)) {
    storageData = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  }

  const existingMap = new Map();
  (storageData.products || []).forEach(p => existingMap.set(p.id, p));
  console.log('Initially in storage.json:', existingMap.size);

  async function fetchItem(id) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch('https://demo.inelabteamdev.com/api/product/' + id, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
        if (res.ok) return await res.json();
        if (res.status === 404) return null;
      } catch (e) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
    return null;
  }

  const missingIds = [];
  for (let id = 1; id <= 1000; id++) {
    if (!existingMap.has(id)) missingIds.push(id);
  }
  console.log('Missing IDs to fetch from store:', missingIds.length);

  const chunkSize = 20;
  for (let i = 0; i < missingIds.length; i += chunkSize) {
    const chunk = missingIds.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(id => fetchItem(id)));
    for (const item of results) {
      if (item && item.id) {
        existingMap.set(item.id, {
          id: item.id,
          slug: item.slug,
          name: item.name,
          brand: item.brand,
          category: item.category,
          sku: item.sku,
          description: item.description,
          is_tracked: false
        });
      }
    }
    await new Promise(r => setTimeout(r, 40));
  }

  console.log('Fetched from store API. Total valid store items found:', existingMap.size);

  console.log('🎉 Final total product inventory in database:', existingMap.size);
  storageData.products = Array.from(existingMap.values()).sort((a, b) => a.id - b.id);
  fs.writeFileSync(storagePath, JSON.stringify(storageData, null, 2), 'utf8');
  console.log(`Successfully saved all ${storageData.products.length} products to storage.json!`);
}

main().catch(err => console.error(err));
