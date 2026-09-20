import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ExternalLink, ShieldCheck, Box, Info, Star } from 'lucide-react';
import PriceChart from './PriceChart';
import ScrapeLogsTable from './ScrapeLogsTable';
import { fetchProductDetails, fetchPriceHistory, fetchScrapeLogs, triggerScrape } from '../services/api';

export default function ProductDetailModal({ product, onClose, onProductUpdated }) {
  const [details, setDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);

  useEffect(() => {
    if (product?.id) {
      loadData(product.id);
    }
  }, [product?.id]);

  async function loadData(id) {
    setLoading(true);
    setScrapeError(null);
    try {
      const [det, hist, lg] = await Promise.all([
        fetchProductDetails(id).catch(() => null),
        fetchPriceHistory(id).catch(() => []),
        fetchScrapeLogs(id).catch(() => [])
      ]);
      setDetails(det);
      setHistory(hist);
      setLogs(lg);
    } catch (err) {
      console.error('Error loading product detail modal:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScrapeNow() {
    setScraping(true);
    setScrapeError(null);
    try {
      const res = await triggerScrape(product.id, false);
      if (res.product) {
        onProductUpdated(res.product);
      }
      await loadData(product.id);
    } catch (err) {
      setScrapeError(err.message || 'Scrape attempt failed');
      await loadData(product.id);
    } finally {
      setScraping(false);
    }
  }

  if (!product) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 16, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '20px',
          border: '1px solid var(--border-glow)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                {product.category}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                SKU: {product.sku}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
              {product.name}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleScrapeNow}
              disabled={scraping}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              <RefreshCw size={14} className={scraping ? 'animate-spin' : ''} />
              <span>{scraping ? 'Scraping Live…' : 'Scrape Now'}</span>
            </button>

            <a
              href={`https://demo.inelabteamdev.com/product/${product.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: '8px 12px' }}
              title="Open product on mock store"
            >
              <ExternalLink size={15} />
            </a>

            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 10px', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {scrapeError && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fb7185',
              fontSize: '13px'
            }}>
              Scrape status: {scrapeError}
            </div>
          )}

          {/* Description */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Product Overview
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {product.description}
            </p>
          </div>

          {/* Specs Grid */}
          {details?.specs && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.4)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)'
            }}>
              {details.specs.warranty && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Warranty</span>
                  <p style={{ fontSize: '13px', color: '#fff' }}>{details.specs.warranty}</p>
                </div>
              )}
              {details.specs.countryOfOrigin && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Country of Origin</span>
                  <p style={{ fontSize: '13px', color: '#fff' }}>{details.specs.countryOfOrigin}</p>
                </div>
              )}
              {details.specs.material && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Material & Colour</span>
                  <p style={{ fontSize: '13px', color: '#fff' }}>{details.specs.material} ({details.specs.colour})</p>
                </div>
              )}
              {details.specs.inTheBox && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>In The Box</span>
                  <p style={{ fontSize: '13px', color: '#fff' }}>{details.specs.inTheBox}</p>
                </div>
              )}
            </div>
          )}

          {/* Price History Chart Section */}
          <div style={{ marginTop: '10px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Historical Price & Stock Trend
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Interactive timeline of scraped price fluctuations and verified stock changes
            </p>
            <PriceChart history={history} productName={product.name} />
          </div>

          {/* Audit Logs for this Product */}
          <div style={{ marginTop: '10px' }}>
            <ScrapeLogsTable logs={logs} loading={loading} selectedProductId={product.id} />
          </div>

        </div>

      </div>
    </div>
  );
}
