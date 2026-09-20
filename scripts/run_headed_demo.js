import { chromium } from '../backend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://demo.inelabteamdev.com';
const RECORDINGS_DIR = path.join(__dirname, '../recordings');

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

async function runObservableDemo() {
  console.log('===============================================================');
  console.log('🎬 STARTING OBSERVABLE HEADED SCRAPER DEMO RUN');
  console.log(`🎥 Video will be recorded to: ${RECORDINGS_DIR}`);
  console.log('===============================================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 120, // Slow down actions so human viewer can follow clearly
    args: ['--window-size=1280,820', '--window-position=100,100']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // Helper to display on-screen live explanation banner during recording
  async function showOverlay(message, status = 'info') {
    await page.evaluate(({ msg, st }) => {
      let banner = document.getElementById('scraper-demo-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'scraper-demo-banner';
        banner.style.position = 'fixed';
        banner.style.top = '16px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.padding = '12px 24px';
        banner.style.borderRadius = '10px';
        banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        banner.style.fontSize = '15px';
        banner.style.fontWeight = '600';
        banner.style.pointerEvents = 'none';
        banner.style.zIndex = '999999';
        banner.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.4)';
        banner.style.transition = 'all 0.3s ease';
        document.body.appendChild(banner);
      }
      banner.textContent = msg;
      if (st === 'info') {
        banner.style.background = 'rgba(15, 23, 42, 0.95)';
        banner.style.color = '#38bdf8';
        banner.style.border = '2px solid #0284c7';
      } else if (st === 'working') {
        banner.style.background = 'rgba(15, 23, 42, 0.95)';
        banner.style.color = '#fbbf24';
        banner.style.border = '2px solid #d97706';
      } else if (st === 'success') {
        banner.style.background = 'rgba(6, 78, 59, 0.95)';
        banner.style.color = '#4ade80';
        banner.style.border = '2px solid #16a34a';
      } else if (st === 'error') {
        banner.style.background = 'rgba(127, 29, 29, 0.95)';
        banner.style.color = '#f87171';
        banner.style.border = '2px solid #dc2626';
      }
    }, { msg: message, st: status });
  }

  // Dynamically fetch live demo products from the store catalog
  let demoProducts = [];
  try {
    const catRes = await fetch(`${TARGET_URL}/api/catalog?page=1&pageSize=10`);
    if (catRes.ok) {
      const catData = await catRes.json();
      if (catData.items && catData.items.length > 0) {
        demoProducts = catData.items.slice(0, 3).map(item => ({ id: item.id, label: item.name }));
      }
    }
  } catch (err) {
    console.warn('Could not fetch catalog dynamically, fallback to active catalog items:', err.message);
  }

  if (demoProducts.length === 0) {
    try {
      const page1Res = await fetch(`${TARGET_URL}/api/catalog?page=1`);
      if (page1Res.ok) {
        const page1Data = await page1Res.json();
        if (page1Data.items && page1Data.items.length > 0) {
          demoProducts = page1Data.items.slice(0, 3).map(item => ({ id: item.id, label: item.name }));
        }
      }
    } catch (_) {}
  }


  for (let idx = 0; idx < demoProducts.length; idx++) {
    const prod = demoProducts[idx];
    const targetUrl = `${TARGET_URL}/product/${prod.id}`;
    console.log(`\n---------------------------------------------------------------`);
    console.log(`📦 [Product ${idx + 1}/${demoProducts.length}] Navigating to: ${prod.label} (${targetUrl})`);
    console.log(`---------------------------------------------------------------`);

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await showOverlay(`Step ${idx + 1}/${demoProducts.length}: Loading ${prod.label}...`, 'info');
      await page.waitForTimeout(1200);

      // Dismiss cookie overlay if present
      try {
        const cookieBtn = page.locator('.cookie-overlay button, button:has-text("Accept"), button:has-text("Got it"), button:has-text("Dismiss")');
        if (await cookieBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await cookieBtn.click().catch(() => {});
        }
        await page.evaluate(() => {
          const overlay = document.querySelector('.cookie-overlay');
          if (overlay) overlay.remove();
        });
      } catch (_) {}

      // 1. Wait for price block
      const priceBlock = page.locator('.price-block');
      await priceBlock.waitFor({ state: 'visible', timeout: 15000 });
      await priceBlock.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      
      await showOverlay('Anti-Bot Defense: Simulating human mouse trajectory & dwell (minMoves: 8, minDwellMs: 600)...', 'working');

      const revealBtn = page.locator('button:has-text("Reveal price"), button[aria-label="Reveal price"]');
      await revealBtn.waitFor({ state: 'visible', timeout: 5000 });

      // Move mouse inside priceBlock using relative coordinates to guarantee onMouseMove fires on element
      const hoverStart = Date.now();
      for (let i = 0; i < 18; i++) {
        const xPos = 40 + (i * 20);
        const yPos = 25 + (i % 2 === 0 ? 15 : -10);
        await priceBlock.hover({ position: { x: xPos, y: yPos } }).catch(() => {});
        await page.waitForTimeout(80);
        
        const disabled = await revealBtn.isDisabled();
        if (!disabled && (Date.now() - hoverStart >= 700)) {
          console.log(`Button unlocked after ${Date.now() - hoverStart}ms!`);
          break;
        }
      }

      await showOverlay('Hover requirement satisfied! Unlocked "Reveal price" button.', 'info');
      await page.waitForTimeout(600);

      await showOverlay('Clicking "Reveal price" with trusted browser event...', 'working');
      await revealBtn.click({ timeout: 5000 });

      // 4. Observe state machine & handle delays / retries
      console.log('Observing price revelation state transitions...');
      let isResolved = false;
      const deadline = Date.now() + 40000;

      while (Date.now() < deadline) {
        const state = await page.evaluate(() => {
          const block = document.querySelector('.price-block');
          if (!block) return null;
          const statusEl = block.querySelector('.price-status');
          const substatusEl = block.querySelector('.price-substatus');
          return {
            isSuccess: block.classList.contains('price-success') || !!document.querySelector('.price-main'),
            isError: block.classList.contains('price-error'),
            statusText: statusEl ? statusEl.textContent : '',
            substatusText: substatusEl ? substatusEl.textContent : ''
          };
        });

        if (state) {
          if (state.substatusText) {
            await showOverlay(`Store State: ${state.statusText} (${state.substatusText})`, 'working');
          } else if (state.statusText) {
            await showOverlay(`Store State: ${state.statusText}`, 'working');
          }

          if (state.isSuccess) {
            isResolved = true;
            break;
          }
          if (state.isError) {
            isResolved = false;
            await showOverlay(`Store Error Handled: ${state.substatusText}`, 'error');
            break;
          }
        }
        await page.waitForTimeout(600);
      }

      if (isResolved) {
        const priceDetails = await page.evaluate(() => {
          const main = document.querySelector('.price-main');
          if (!main) return null;

          const elements = Array.from(main.querySelectorAll('div, span'));
          const visibleEl = elements.find(el => {
            const style = window.getComputedStyle(el);
            const text = el.textContent || '';
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   text.includes('₹') && 
                   !style.textDecoration.includes('line-through');
          });

          const stockBadge = document.querySelector('.stock-badge');
          return {
            priceText: visibleEl ? visibleEl.textContent.replace(/[\u200B\u00A0]/g, '').trim() : null,
            stockText: stockBadge ? stockBadge.textContent.trim() : null
          };
        });

        console.log(`✅ Success for ${prod.label}: Price=${priceDetails?.priceText}, Stock=${priceDetails?.stockText}`);
        await showOverlay(`Extracted Real Price: ${priceDetails?.priceText} | Stock: ${priceDetails?.stockText}`, 'success');
        await page.waitForTimeout(2500);
      } else {
        console.log(`⚠️ Handled error/failure for ${prod.label}`);
        await page.waitForTimeout(2000);
      }
    } catch (prodErr) {
      console.warn(`Product ${prod.label} handled warning: ${prodErr.message}`);
      await showOverlay(`Handled network condition: ${prodErr.message}`, 'error');
      await page.waitForTimeout(1500);
    }
  }

  await showOverlay('Demonstration complete! Closing browser and saving video...', 'success');
  await page.waitForTimeout(2000);

  // Close context to finalize video recording
  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    const finalDest = path.join(RECORDINGS_DIR, 'headed_scraper_demo.webm');
    try {
      fs.copyFileSync(videoPath, finalDest);
      console.log(`\n🎉 Recorded video successfully saved to:\n${finalDest}\n`);
    } catch (e) {
      console.log(`Video saved at: ${videoPath}`);
    }
  }

  console.log('===============================================================');
  console.log('✅ HEADED SCRAPER DEMO RUN FINISHED SUCCESSFULLY');
  console.log('===============================================================');
}

runObservableDemo().catch(err => {
  console.error('Error during headed demo run:', err);
  process.exit(1);
});
