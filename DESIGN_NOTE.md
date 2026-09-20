# Engineering Design Note: Reliable Web Scraping & Architecture

**Project:** INE Product Price Tracker  
**Target:** INE Mock Store (`https://demo.inelabteamdev.com/`)  
**Author:** Software Engineer Intern Candidate  

---

## 1. How We Made the Scraping Reliable

The INE mock storefront was deliberately designed with complex anti-scraping mechanics, dynamic async states, and simulated network instability. We engineered our scraping pipeline to overcome each of these challenges systematically:

### 1.1 Solving the Anti-Scraping Behavioral Defense (`Ar`)
* **The Mechanism:** Reverse-engineering the storefront's client-side bundle revealed an internal class `Ar` that enforces:
  - `minMoves: 8`: At least 8 distinct mouse movements inside the price block bounding box.
  - `minDwellMs: 600`: A hover dwell duration of at least 600 milliseconds.
  - `clickAt` & `trusted: e.nativeEvent.isTrusted`: Verification that the button click is a genuine browser event rather than a synthetic JavaScript `.click()` call.
* **Our Solution:** In our Playwright engine (`backend/src/scraper/playwrightScraper.js`), we scroll the `.price-block` into view, compute its dynamic coordinates, and execute smooth multi-step bezier mouse movements over 800ms directly inside the element. We then dispatch a trusted click via Playwright's native CDP input dispatcher once the button state flips from `disabled` to enabled.

### 1.2 Bypassing Decoy Honeypots & Zero-Width Formatting
* **The Trap:** The DOM contains hidden honeypot elements (`<span class="price-value" aria-hidden="true" style="display: none;">` and `<span class="amount" data-price="true" style="display: none;">`) designed to feed incorrect, decoy prices (e.g., ₹54,301 or ₹66,292) to naive scrapers. Furthermore, the true selling price is rendered with interspersed zero-width spaces (`\u200B`) and fullwidth Unicode numerals (e.g., `９０,５０２` from U+FF10 to U+FF19).
* **Our Solution:** 
  1. We query only the computed visible element in `.price-main` (`display !== 'none'`, `visibility !== 'hidden'`, and lacking `line-through` strike styling).
  2. Our custom normalizer (`backend/src/scraper/parser.js`) applies Unicode NFKD normalization to convert fullwidth characters into standard ASCII digits `0-9`.
  3. We strip zero-width characters (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`, `\u00A0`), clean currency symbols (`₹`, `Rs.`, `/-`), and extract the authentic floating-point figure.

### 1.3 Handling Asynchronous Loading, Retries, and Transient Failures
* **The Challenge:** The mock store intermittently responds with simulated upstream HTTP 503 errors and delays, stepping through up to 6 internal retry cycles (`Loading current price…` -> `Retrying (attempt t/6)... Store responded with "upstream 503"`).
* **Our Solution:** 
  - The scraper monitors the DOM state transitions dynamically across a 45-second deadline, observing when the store resolves into `price-success` or terminal `price-error`.
  - **Honest Auditing:** Every attempt count, HTTP response status, error message, and latency is recorded in `scrape_logs`.
  - **Data Integrity Guarantee:** If an attempt ultimately fails, the error is recorded honestly in the audit trail, but the product's historical price is **never overwritten with null or empty data**.

### 1.4 Dynamic Overlay & Cookie Consent Resilience
* **The Obstacle:** On select listings, an asynchronous `.cookie-overlay` popup appears, intercepting pointer events.
* **Our Solution:** Prior to interacting with the price block, our scraper checks for, dismisses, and prunes any modal overlays from the layout.

---

## 2. Architectural Trade-offs & Judgment

| Decision | Chosen Approach | Alternative Considered | Rationale |
|---|---|---|---|
| **Catalog Indexing vs. Price Scraping** | **Hybrid Architecture** (Lightweight HTTP for catalog, Headless Playwright for prices) | Pure Headless Browser for everything | The assignment notes: *"Reach for a headless browser only where the page genuinely requires it."* We fetch the 1,000-item catalog and static specs in milliseconds via lightweight HTTP GET (`/api/catalog`), reserving Playwright only for the interactive, challenge-gated price/stock revelation. |
| **Scheduling on Free-Tier Backends** | **External Cron Webhook** (`cron-job.org` -> `POST /api/cron/scrape` with Bearer auth) | In-memory `setInterval` / `node-cron` loop | Free-tier host instances (Render) spin down to sleep after inactivity, killing in-memory loops. An external cron service ensures punctual 2-hour execution while a `/api/cron/health` endpoint allows keep-alive warming. |
| **Database Architecture** | **Supabase PostgreSQL** with local JSON/file persistence fallback | PostgreSQL only | Supabase provides scalable cloud persistence for production deployment on Render/Vercel. The embedded local fallback guarantees instant zero-config offline execution during evaluation or local testing. |
| **Observable Execution** | Dedicated Headed Runner with On-Screen UI Banner and Native Video Capture | External screen recorder | The headless/headed toggle allows instant visual verification in both development and automated environments, producing high-resolution WebM artifacts directly into `recordings/`. |

---

## 3. What AI Tools Got Wrong on the First Attempt & How We Corrected It

During initial prototyping, automated AI-generated scrapers made three major critical errors:

1. **Naive DOM Selection Falling for the Honeypot:**
   - *What AI Got Wrong:* The initial AI scraper simply queried `page.locator('.price-value').textContent()`.
   - *Why It Failed:* The mock store intentionally embeds `<span class="price-value" aria-hidden="true" style="display: none;">₹54,301</span>` as a honeypot. The extracted figure was completely wrong and stale.
   - *How We Corrected It:* We inspected the storefront's React components, discovered the `d1` and `d2` decoy generation formulas, and implemented computed-style visibility filtering to target only the rendered, styled container while stripping Unicode fullwidth characters and zero-width spaces.

2. **Failing the Human Mouse-Movement Challenge:**
   - *What AI Got Wrong:* The AI tool attempted a direct `page.click('button:has-text("Reveal price")')` immediately after page load.
   - *Why It Failed:* The button is hard-disabled (`disabled: p !== null`) until mousemove coordinates pass the `Ar({ minMoves: 8, minDwellMs: 600 })` threshold. The synthetic click either failed or timed out after 30 seconds.
   - *How We Corrected It:* We implemented an explicit human mouse trajectory generator that scrolls the price container into view, enters the bounding box, and performs 12+ multi-step moves with micro-dwell intervals until the button's disabled attribute is actively cleared.

3. **Treating Transient Retries as Immediate Failures:**
   - *What AI Got Wrong:* Standard HTTP scrapers aborted on the first upstream 503 error received from `/api/products/:id/price`.
   - *Why It Failed:* The store has a built-in retry mechanism (attempts 1 through 6) that recovers after a short delay.
   - *How We Corrected It:* We adapted our runner to observe the store's state machine, allowing transient errors to resolve naturally while recording each retry cycle into the audit log.
