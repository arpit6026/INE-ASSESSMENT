import React from 'react';
import { RefreshCw, TrendingDown, Eye, Trash2, Clock, CheckCircle, AlertTriangle, XCircle, ArrowUpRight } from 'lucide-react';

export default function TrackedProductsList({
  products,
  loading,
  onSelectProduct,
  onScrapeNow,
  onUntrack,
  onUpdateFrequency,
  scrapingIds = {}
}) {
  if (loading && products.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', margin: '0 24px' }}>
        <RefreshCw size={32} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading tracked products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', margin: '0 24px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(56, 189, 248, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--primary)'
        }}>
          <Eye size={28} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
          No Tracked Products Yet
        </h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 20px', fontSize: '14px' }}>
          Browse INE's mock storefront catalog to pick products. Once tracked, the app will monitor their price and stock on schedule.
        </p>
      </div>
    );
  }

  const renderStatusBadge = (status, lastScrapedAt, currentPrice) => {
    if (!lastScrapedAt) {
      return <span className="badge badge-neutral">Pending initial scrape</span>;
    }
    if (status === 'SUCCESS') {
      return (
        <span className="badge badge-success">
          <CheckCircle size={12} />
          <span>Success</span>
        </span>
      );
    }
    if (status === 'RETRIED') {
      return (
        <span className="badge badge-success">
          <CheckCircle size={12} />
          <span>Retried & Saved</span>
        </span>
      );
    }
    if (currentPrice && status !== 'FAILED' && status !== 'RETRIED_FAILED') {
      return (
        <span className="badge badge-success">
          <CheckCircle size={12} />
          <span>Success</span>
        </span>
      );
    }
    return (
      <span className="badge badge-danger">
        <XCircle size={12} />
        <span>Failed</span>
      </span>
    );
  };

  const renderStockBadge = (stock, status, label) => {
    if (status === 'out_of_stock' || stock === 0) {
      return <span className="badge badge-danger">Out of Stock</span>;
    }
    if (status === 'low_stock' || (stock !== null && stock <= 10)) {
      return <span className="badge badge-warning">{label || `Only ${stock} left`}</span>;
    }
    if (stock !== null) {
      return <span className="badge badge-success">{label || `${stock} in stock`}</span>;
    }
    return <span className="badge badge-neutral">Unknown</span>;
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Never';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-panel" style={{ margin: '0 24px 24px 24px', overflow: 'hidden' }}>
      
      {/* Header bar */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
            Tracked Products Inventory ({products.length})
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time scraped prices, stock levels, and scheduled health status
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '14px 24px', fontWeight: '600' }}>Product Details</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Current Price</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Stock Level</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Last Scrape</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Frequency</th>
              <th style={{ padding: '14px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isScraping = !!scrapingIds[p.id];
              const discount = p.mrp && p.current_price && p.mrp > p.current_price
                ? Math.round(((p.mrp - p.current_price) / p.mrp) * 100)
                : null;

              return (
                <tr 
                  key={p.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease'
                  }}
                  className="hover-row"
                >
                  {/* Product Info */}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span 
                            onClick={() => onSelectProduct(p)}
                            style={{ 
                              color: '#fff', 
                              fontWeight: '600', 
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textDecorationColor: 'transparent',
                              transition: 'text-decoration-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecorationColor = 'var(--primary)'}
                            onMouseLeave={(e) => e.target.style.textDecorationColor = 'transparent'}
                          >
                            {p.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                            {p.brand} · {p.category}
                          </span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                            {p.sku}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td style={{ padding: '16px 16px' }}>
                    {p.current_price ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                            ₹{Number(p.current_price).toLocaleString('en-IN')}
                          </span>
                          {discount && (
                            <span style={{ color: 'var(--accent-emerald)', fontSize: '11px', fontWeight: '600' }}>
                              {discount}% off
                            </span>
                          )}
                        </div>
                        {p.mrp && (
                          <div style={{ color: 'var(--text-dim)', fontSize: '11px', textDecoration: 'line-through' }}>
                            ₹{Number(p.mrp).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Not yet scraped</span>
                    )}
                  </td>

                  {/* Stock */}
                  <td style={{ padding: '16px 16px' }}>
                    {renderStockBadge(p.current_stock, p.stock_status, p.stock_label)}
                  </td>

                  {/* Last Scrape */}
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {renderStatusBadge(p.last_scrape_status, p.last_scraped_at, p.current_price)}
                      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                        {formatTimeAgo(p.last_scraped_at)}
                      </span>
                    </div>
                  </td>

                  {/* Frequency */}
                  <td style={{ padding: '16px 16px' }}>
                    <select
                      value={p.scrape_frequency_hours || 2}
                      onChange={(e) => onUpdateFrequency(p.id, e.target.value)}
                      style={{
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        color: 'var(--text-main)',
                        padding: '4px 8px',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="1">Every 1 hr</option>
                      <option value="2">Every 2 hrs (default)</option>
                      <option value="4">Every 4 hrs</option>
                      <option value="6">Every 6 hrs</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      
                      {/* Scrape Now Button */}
                      <button
                        onClick={() => onScrapeNow(p.id)}
                        disabled={isScraping}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        title="Trigger instant Playwright scrape"
                      >
                        <RefreshCw size={13} className={isScraping ? 'animate-spin' : ''} />
                        <span>{isScraping ? 'Scraping…' : 'Scrape Now'}</span>
                      </button>

                      {/* View History / Detail */}
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        title="View price history chart and audit logs"
                      >
                        <Eye size={13} />
                        <span>History</span>
                      </button>

                      {/* Untrack Button */}
                      <button
                        onClick={() => onUntrack(p.id)}
                        className="btn btn-danger"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        title="Stop tracking this product"
                      >
                        <Trash2 size={13} />
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
