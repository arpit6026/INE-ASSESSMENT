import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { normalizePriceText, parseStockText } from './parser.js';

const TARGET_BASE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

async function safeLaunchChromium(launchOptions, emitLog) {
  try {
    return await chromium.launch(launchOptions);
  } catch (err) {
    if (err.message && (err.message.includes("Executable doesn't exist") || err.message.includes("npx playwright install"))) {
      if (emitLog) emitLog('warn', 'Chromium binary missing. Auto-installing Chromium on-the-fly...');
      console.log('[Playwright] Chromium executable missing. Running npx playwright install chromium...');
      try {
        execSync('npx playwright install chromium', {
          stdio: 'inherit',
          env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' }
        });
        if (emitLog) emitLog('info', 'Chromium auto-installation completed successfully.');
        return await chromium.launch(launchOptions);
      } catch (installErr) {
        console.error('[Playwright] Auto-installation failed:', installErr.message);
        throw err;
      }
    }
    throw err;
  }
}

/**
 * Scrapes a single product's price and stock from INE's mock storefront.
 * 
 * @param {number|string} productId 
 * @param {object} options
 * @param {boolean} [options.headed=false] Run browser in headed mode
 * @param {number} [options.slowMo=0] Delay between actions in ms (great for headed observation)
 * @param {string} [options.recordVideoDir] Directory to save video recording if requested
 * @param {function} [options.onLog] Callback for streaming logs during execution
 * @returns {Promise<object>} Scrape result object
 */
export async function scrapeProductPrice(productId, options = {}) {
  const {
    headed = false,
    slowMo = headed ? 100 : 0,
    recordVideoDir = null,
    onLog = () => {}
  } = options;

  const startTime = Date.now();
  let browser = null;
  const networkLogs = [];
  let attemptCount = 1;

  const emitLog = (level, message, data = null) => {
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    onLog(entry);
  };

  emitLog('info', `Initiating scrape for product ${productId} (mode: ${headed ? 'headed' : 'headless'})`);

  try {
    browser = await safeLaunchChromium({
      headless: !headed,
      slowMo: slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const contextOptions = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    };

    if (recordVideoDir) {
      contextOptions.recordVideo = {
        dir: recordVideoDir,
        size: { width: 1280, height: 800 }
      };
    }

    const context = await browser.newContext(contextOptions);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
    const page = await context.newPage();

    // Listen to network events to track simulated upstream errors (e.g. 503, 429)
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        networkLogs.push({
          url,
          status: response.status(),
          statusText: response.statusText(),
          time: Date.now() - startTime
        });
        if (response.status() >= 400) {
          emitLog('warn', `Store API response: ${response.status()} ${url}`);
        }
      }
    });

    const targetUrl = `${TARGET_BASE_URL}/product/${productId}`;
    emitLog('info', `Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Step 1: Wait for price block container and dismiss any cookie overlays
    // Check and dismiss cookie overlay if present
    try {
      const cookieBtn = page.locator('.cookie-overlay button, button:has-text("Accept"), button:has-text("Got it"), button:has-text("Dismiss")');
      if (await cookieBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        emitLog('info', 'Dismissing cookie overlay');
        await cookieBtn.click().catch(() => {});
      }
      // Also ensure no overlay blocks pointer events
      await page.evaluate(() => {
        const overlay = document.querySelector('.cookie-overlay');
        if (overlay) overlay.remove();
      });
    } catch (_) {}

    const priceBlock = page.locator('.price-block');
    try {
      await priceBlock.waitFor({ state: 'visible', timeout: 5000 });
    } catch (_) {
      emitLog('warn', 'Price block not immediately visible (store API rate limited). Backing off 2s and reloading...');
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 35000 });
      await priceBlock.waitFor({ state: 'visible', timeout: 15000 });
    }
    await priceBlock.scrollIntoViewIfNeeded();
    emitLog('info', 'Price block detected on page');


    // Step 2: Fulfill the anti-scraping mouse-movement requirement
    // The store's internal Ar class requires: minMoves: 8 and minDwellMs: 600
    const box = await priceBlock.boundingBox();
    if (!box) {
      throw new Error('Price block bounding box is unavailable (layout shift or hidden element)');
    }

    emitLog('info', 'Simulating human mouse trajectory to satisfy store security check');
    const startX = box.x + box.width / 4;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);

    // Perform smooth multi-point moves with dwell time
    for (let i = 1; i <= 12; i++) {
      const targetX = box.x + (box.width / 4) + (i * 12);
      const targetY = startY + (i % 2 === 0 ? 8 : -8);
      await page.mouse.move(targetX, targetY, { steps: 2 });
      await page.waitForTimeout(65);
    }

    // Step 3: Locate and click "Reveal price" button
    const revealBtn = page.locator('button:has-text("Reveal price"), button[aria-label="Reveal price"]');
    await revealBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Wait until button is unlocked / enabled
    let isBtnDisabled = await revealBtn.isDisabled().catch(() => false);
    let dwellAttempts = 0;
    while (isBtnDisabled && dwellAttempts < 10) {
      emitLog('debug', `Waiting for dwell threshold to unlock button (attempt ${dwellAttempts + 1})`);
      for (let j = 0; j < 4; j++) {
        await page.mouse.move(box.x + 40 + j * 15, box.y + 25);
        await page.waitForTimeout(150);
      }
      isBtnDisabled = await revealBtn.isDisabled().catch(() => false);
      dwellAttempts++;
    }

    emitLog('info', 'Triggering trusted click on "Reveal price"');
    
    // Store click handler (Xn) randomly delays or drops ~17.5% of clicks.
    // Retry click if store remains in idle state.
    let clickAttempts = 0;
    while (clickAttempts < 5) {
      await revealBtn.click().catch(() => {});
      await page.waitForTimeout(800);
      
      const currentBlockState = await page.evaluate(() => {
        const block = document.querySelector('.price-block');
        return {
          isIdle: block?.classList.contains('price-idle'),
          isSuccess: block?.classList.contains('price-success') || !!document.querySelector('.price-main'),
          isError: block?.classList.contains('price-error')
        };
      });

      if (!currentBlockState.isIdle || currentBlockState.isSuccess || currentBlockState.isError) {
        break;
      }
      clickAttempts++;
      emitLog('info', `Click was dropped by store rate limiter, retrying click (${clickAttempts}/5)...`);
    }

    // Step 4: Monitor the store's state machine
    // Possible phases: 'idle' -> 'loading' -> 'retrying' -> 'success' | 'error'
    emitLog('info', 'Awaiting price revelation and handling dynamic store retries...');
    
    let isResolved = false;
    let finalState = 'timeout';
    let lastSubstatus = '';
    const pollDeadline = Date.now() + 45000; // Allow sufficient time for up to 6 internal retries

    while (Date.now() < pollDeadline) {
      const stateInfo = await page.evaluate(() => {
        const block = document.querySelector('.price-block');
        if (!block) return { exists: false };
        
        const isSuccess = block.classList.contains('price-success') || !!document.querySelector('.price-main');
        const isError = block.classList.contains('price-error');
        const statusEl = block.querySelector('.price-status');
        const substatusEl = block.querySelector('.price-substatus');
        
        return {
          exists: true,
          isSuccess,
          isError,
          statusText: statusEl ? statusEl.textContent : '',
          substatusText: substatusEl ? substatusEl.textContent : '',
          classes: block.className
        };
      });

      if (stateInfo.substatusText && stateInfo.substatusText !== lastSubstatus) {
        lastSubstatus = stateInfo.substatusText;
        emitLog('info', `Store update: ${stateInfo.statusText} - ${stateInfo.substatusText}`);
        // Extract attempt number if store is retrying
        const match = stateInfo.statusText.match(/attempt (\d+)\/(\d+)/i);
        if (match) {
          attemptCount = parseInt(match[1], 10);
        }
      }

      if (stateInfo.isSuccess) {
        finalState = 'success';
        isResolved = true;
        break;
      }

      if (stateInfo.isError) {
        // If store showed a temporary retry error state, click Retry button to recover
        const retryBtn = page.locator('.price-block button:has-text("Retry"), .price-block button:has-text("Try again"), .price-block button:has-text("Reveal")');
        if (await retryBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          emitLog('info', 'Store hit temporary error state; clicking Retry button...');
          await retryBtn.click().catch(() => {});
          await page.waitForTimeout(1200);
          continue;
        }
        finalState = 'error';
        isResolved = true;
        break;
      }


      await page.waitForTimeout(600);
    }

    const durationMs = Date.now() - startTime;

    if (!isResolved || finalState !== 'success') {
      const errorMsg = lastSubstatus || 'Failed to reveal price within timeout window';
      emitLog('error', `Scrape attempt failed: ${errorMsg}`);
      
      let videoPath = null;
      if (recordVideoDir) {
        try {
          const video = page.video();
          if (video) videoPath = await video.path();
        } catch (_) {}
      }

      await context.close();
      await browser.close();

      return {
        success: false,
        productId,
        attemptCount,
        status: attemptCount > 1 ? 'RETRIED_FAILED' : 'FAILED',
        errorMessage: errorMsg,
        durationMs,
        networkLogs,
        videoPath,
        price: null,
        stock: null
      };
    }

    // Step 5: Extract REAL visible price and stock (filtering out display:none honeypots)
    const extracted = await page.evaluate(() => {
      const main = document.querySelector('.price-main');
      if (!main) return null;

      // Direct top-level children of .price-main (including output, mark, span, div, etc.)
      const children = Array.from(main.children);

      const realPriceEl = children.find(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent || '';
        const isHidden = style.display === 'none' ||
                         style.visibility === 'hidden' ||
                         style.opacity === '0';
        const isHoneypot = el.classList.contains('price-value') ||
                           el.classList.contains('amount') ||
                           el.hasAttribute('data-price') ||
                           el.getAttribute('aria-hidden') === 'true';
        const isMrp = style.textDecoration.includes('line-through') || el.className.includes('mrp') || el.className.startsWith('mr-');
        const isDeal = text.includes('Deal price');
        const isBadge = text.includes('% off');
        const isUpdating = text.includes('Updating');

        return !isHidden && !isHoneypot && !isMrp && !isDeal && !isBadge && !isUpdating && (text.includes('₹') || /\d/.test(text));
      });

      const rawPriceText = realPriceEl ? realPriceEl.textContent : null;

      // Extract original MRP if shown
      const mrpEl = children.find(el => {
        const style = window.getComputedStyle(el);
        return style.textDecoration.includes('line-through') || el.className.includes('mrp') || el.className.startsWith('mr-');
      });
      const rawMrpText = mrpEl ? mrpEl.textContent : null;

      // Extract stock badge
      const stockBadge = document.querySelector('.stock-badge');
      const rawStockText = stockBadge ? stockBadge.textContent : null;
      const isOutOfStock = stockBadge ? stockBadge.classList.contains('out-stock') : false;

      // Meta load attempt info
      const metaSpan = document.querySelector('.price-meta span');
      const metaText = metaSpan ? metaSpan.textContent : '';

      return {
        rawPriceText,
        rawMrpText,
        rawStockText,
        isOutOfStock,
        metaText
      };
    });

    if (!extracted || !extracted.rawPriceText) {
      throw new Error('Real price element was not found in visible layout after success state');
    }

    // Extract attempt count from meta text if present (e.g. "Loaded in 3 attempts")
    const metaMatch = extracted.metaText?.match(/Loaded in (\d+) attempt/i);
    if (metaMatch) {
      attemptCount = parseInt(metaMatch[1], 10);
    }

    const price = normalizePriceText(extracted.rawPriceText);
    const mrp = normalizePriceText(extracted.rawMrpText);
    const stockInfo = parseStockText(extracted.rawStockText, extracted.isOutOfStock);

    if (price === null || isNaN(price) || price <= 0) {
      throw new Error(`Extracted price was invalid or corrupted: "${extracted.rawPriceText}"`);
    }

    let videoPath = null;
    if (recordVideoDir) {
      try {
        const video = page.video();
        if (video) videoPath = await video.path();
      } catch (_) {}
    }

    emitLog('info', `Scrape succeeded! Price: ₹${price}, Stock: ${stockInfo.count} (${stockInfo.status}), Attempts: ${attemptCount}`);

    await context.close();
    await browser.close();

    return {
      success: true,
      productId,
      price,
      mrp,
      currency: 'INR',
      stock: stockInfo.count,
      stockStatus: stockInfo.status,
      stockLabel: stockInfo.label,
      attemptCount,
      status: attemptCount > 1 ? 'RETRIED' : 'SUCCESS',
      errorMessage: null,
      durationMs,
      networkLogs,
      videoPath
    };

  } catch (err) {
    emitLog('error', `Scraper encountered unhandled error: ${err.message}`);
    const durationMs = Date.now() - startTime;
    
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }

    return {
      success: false,
      productId,
      attemptCount,
      status: 'FAILED',
      errorMessage: err.message,
      durationMs,
      networkLogs,
      price: null,
      stock: null
    };
  }
}
