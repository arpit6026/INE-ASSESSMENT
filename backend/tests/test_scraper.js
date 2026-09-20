import { chromium } from 'playwright';

async function testScrape(productId = 169) {
  console.log(`Starting test scrape for product ID: ${productId}`);
  const startTime = Date.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    const url = `https://demo.inelabteamdev.com/product/${productId}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the price block to appear
    console.log('Waiting for price block...');
    const priceBlock = page.locator('.price-block');
    await priceBlock.waitFor({ state: 'visible', timeout: 15000 });

    // Get bounding box to simulate realistic human hovering
    const box = await priceBlock.boundingBox();
    if (!box) {
      throw new Error('Price block bounding box not found');
    }

    console.log(`Found price block at x:${box.x}, y:${box.y}, w:${box.width}, h:${box.height}`);
    
    // Simulate at least 10 moves over > 700ms to fulfill Ar({minMoves: 8, minDwellMs: 600})
    const startX = box.x + box.width / 4;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);

    for (let i = 1; i <= 12; i++) {
      const targetX = box.x + (box.width / 4) + (i * 15);
      const targetY = startY + (i % 2 === 0 ? 10 : -10);
      await page.mouse.move(targetX, targetY, { steps: 2 });
      await page.waitForTimeout(80);
    }

    // Now check if "Reveal price" button is enabled
    const revealBtn = page.locator('button:has-text("Reveal price"), button[aria-label="Reveal price"]');
    await revealBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Check disabled state
    const isDisabled = await revealBtn.isDisabled();
    console.log(`Reveal price button disabled status: ${isDisabled}`);

    if (isDisabled) {
      console.log('Button still disabled, doing additional dwell movement...');
      for (let j = 0; j < 5; j++) {
        await page.mouse.move(box.x + 50 + j * 10, box.y + 30);
        await page.waitForTimeout(150);
      }
    }

    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR]: ${err.message}`));
    page.on('requestfailed', req => console.log(`[REQ FAILED]: ${req.url()} ${req.failure()?.errorText}`));
    page.on('response', res => {
      if (res.url().includes('/api/')) {
        console.log(`[API RESPONSE]: ${res.status()} ${res.url()}`);
      }
    });

    console.log('Clicking "Reveal price"...');
    await revealBtn.click();

    // Poll price-block content every 1 second for 15 seconds to see live progress
    for (let sec = 1; sec <= 15; sec++) {
      await page.waitForTimeout(1000);
      const html = await page.locator('.price-block').evaluate(el => el.outerHTML).catch(() => 'NOT FOUND');
      console.log(`[T+${sec}s] Price block outerHTML:\n${html}\n`);
      if (html.includes('price-success') || html.includes('price-value') || html.includes('price-error')) {
        console.log(`Finished after ${sec} seconds!`);
        break;
      }
    }

    const priceData = await page.evaluate(() => {
      // Find the visible price element in .price-main
      const main = document.querySelector('.price-main');
      if (!main) return null;

      // Notice honeypots: .price-value and [data-price] are display:none
      // The real price is the visible element with font-size / serif
      const elements = Array.from(main.querySelectorAll('div, span'));
      const visibleEl = elements.find(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent || '';
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               text.includes('₹') && 
               !style.textDecoration.includes('line-through') &&
               !text.includes('Deal price');
      });

      const rawText = visibleEl ? visibleEl.textContent : null;
      // Strip zero-width spaces (\u200B) and clean text
      const cleanText = rawText ? rawText.replace(/[\u200B\u00A0\s]/g, '').trim() : null;
      
      // Also get MRP and discount if available
      const mrpEl = Array.from(main.querySelectorAll('span')).find(el => {
        return window.getComputedStyle(el).textDecoration.includes('line-through');
      });
      const mrpText = mrpEl ? mrpEl.textContent.replace(/[\u200B\u00A0\s]/g, '').trim() : null;

      // Extract stock
      const stockBadge = document.querySelector('.stock-badge');
      const stockText = stockBadge ? stockBadge.textContent.trim() : null;
      const isOutOfStock = stockBadge ? stockBadge.classList.contains('out-stock') : false;

      // Parse stock count
      let stockCount = 0;
      if (stockText) {
        const match = stockText.match(/(\d+)/);
        if (match) stockCount = parseInt(match[1], 10);
      }

      return {
        rawPriceText: rawText,
        cleanPriceText: cleanText,
        mrpText: mrpText,
        stockBadgeText: stockText,
        stockCount: isOutOfStock ? 0 : stockCount,
        isOutOfStock
      };
    });

    console.log('=== REAL DATA EXTRACTED ===');
    console.log(JSON.stringify(priceData, null, 2));

  } catch (err) {
    console.error('Scrape test error:', err.message);
  } finally {
    await browser.close();
  }
}

testScrape();
