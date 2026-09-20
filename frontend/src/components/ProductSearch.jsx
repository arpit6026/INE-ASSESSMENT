import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, Filter, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchCatalog, trackProduct, fetchCategories } from '../services/api';

export default function ProductSearch({ trackedIds = new Set(), onProductTracked, onSelectProduct }) {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [catalogData, setCatalogData] = useState({ items: [], total: 0, totalPages: 1 });
  const [trackingId, setTrackingId] = useState(null);

  useEffect(() => {
    fetchCategories()
      .then(cats => { if (Array.isArray(cats) && cats.length > 0) setCategories(cats); })
      .catch(err => console.error('Failed to fetch dynamic categories:', err));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selectedCategory, page]);

  async function loadCatalog() {
    setLoading(true);
    try {
      const cat = selectedCategory === 'All' ? '' : selectedCategory;
      const res = await fetchCatalog(query, cat, page, 12);
      setCatalogData(res);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack(product) {
    setTrackingId(product.id);
    try {
      await trackProduct(product.id);
      onProductTracked(product);
    } catch (err) {
      console.error('Failed to track product:', err);
    } finally {
      setTrackingId(null);
    }
  }

  return (
    <div style={{ margin: '0 24px 24px 24px' }}>
      
      {/* Search and Filters Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                Search INE Store Catalog
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Search across all 1,000 mock products by name, brand, SKU, or category to start price tracking
              </p>
            </div>
            
            {/* Search Input */}
            <div className="search-bar-wrapper" style={{ width: '100%', maxWidth: '380px' }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search products (e.g. Ultrabook, Audio, Copperpot)..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="search-input"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
              <Filter size={13} /> Categories:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                style={{
                  background: selectedCategory === cat ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(30, 41, 59, 0.6)',
                  color: selectedCategory === cat ? '#fff' : 'var(--text-muted)',
                  border: selectedCategory === cat ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: selectedCategory === cat ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <RefreshCw size={28} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Searching store catalog...</p>
        </div>
      ) : catalogData.items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No products matched your search filters.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {catalogData.items.map((item) => {
            const isTracked = trackedIds.has(item.id);
            const isTrackingThis = trackingId === item.id;

            return (
              <div 
                key={item.id} 
                className="glass-panel-interactive"
                style={{
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {item.sku}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '6px', lineHeight: '1.3' }}>
                    {item.name}
                  </h3>
                  
                  <p style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '500', marginBottom: '8px' }}>
                    by {item.brand}
                  </p>

                  <p style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-muted)', 
                    display: '-webkit-box', 
                    WebkitLineClamp: 3, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden',
                    lineHeight: '1.4',
                    marginBottom: '16px'
                  }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  
                  <button
                    onClick={() => onSelectProduct(item)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#fff'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    <span>Details</span>
                    <ArrowRight size={12} />
                  </button>

                  <button
                    onClick={() => handleTrack(item)}
                    disabled={isTracked || isTrackingThis}
                    className={`btn ${isTracked ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    {isTracked ? (
                      <>
                        <Check size={13} color="var(--accent-emerald)" />
                        <span>Tracked</span>
                      </>
                    ) : isTrackingThis ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Adding…</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Track Price</span>
                      </>
                    )}
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {catalogData.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Previous
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 8px' }}>
            Page {page} of {catalogData.totalPages} ({catalogData.total} products)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(catalogData.totalPages, p + 1))}
            disabled={page >= catalogData.totalPages}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
}
