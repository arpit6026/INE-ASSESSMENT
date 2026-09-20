/**
 * Price and Stock text parser and normalizer
 * Handles all intentionally difficult formatting quirks of the INE mock store:
 * - Fullwidth unicode numerals (U+FF10 to U+FF19)
 * - Zero-width spaces (\u200B) and non-breaking spaces (\u00A0)
 * - Trailing '/- (incl. of all taxes)'
 * - 'Rs. ...' and lakh comma formatting
 * - Spaced digits ('4 290') and euro notation ('.00')
 * - Stock badge strings ('In stock · 39 left', 'Only 5 left', 'Out of stock')
 */

export function normalizePriceText(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. NFKD normalization converts fullwidth unicode digits (０-９) into standard 0-9
  let normalized = text.normalize('NFKD');

  // 2. Remove zero-width spaces (\u200B, \u200C, \u200D, \uFEFF) completely
  normalized = normalized.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // 3. Replace non-breaking spaces (\u00A0) with standard space
  normalized = normalized.replace(/\u00A0/g, ' ').trim();

  // 4. Remove currency prefixes / suffixes
  normalized = normalized.replace(/₹/g, '').replace(/Rs\.?/gi, '').replace(/\/-/g, '');

  // 5. If euro format like "1.234,00"
  if (normalized.includes(',') && (normalized.endsWith(',00') || (normalized.includes('.') && /,\d{2}$/.test(normalized)))) {
    normalized = normalized.replace(/\./g, '').replace(',00', '');
  }

  // 6. Remove commas and spaces in numbers (e.g. "1,58,775" -> "158775", "1 58 775" -> "158775")
  const cleaned = normalized.replace(/,/g, '').replace(/\s+/g, '').trim();

  // 7. Extract float
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

export function parseStockText(badgeText, isOutOfStockClass = false) {
  if (isOutOfStockClass) {
    return {
      count: 0,
      status: 'out_of_stock',
      label: 'Out of stock'
    };
  }

  if (!badgeText || typeof badgeText !== 'string') {
    return {
      count: null,
      status: 'unknown',
      label: 'Unknown'
    };
  }

  const clean = badgeText.replace(/[\u200B\u00A0]/g, ' ').trim();
  const lower = clean.toLowerCase();

  if (lower.includes('out of stock') || lower.includes('sold out')) {
    return {
      count: 0,
      status: 'out_of_stock',
      label: 'Out of stock'
    };
  }

  const match = clean.match(/(\d+)/);
  const count = match ? parseInt(match[1], 10) : null;

  let status = 'in_stock';
  if (count !== null && count <= 10) {
    status = 'low_stock';
  }

  return {
    count,
    status,
    label: clean
  };
}

export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}
