import React from 'react';
import { Activity, Bell, Play, Database, RefreshCw, ShoppingCart, ExternalLink } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  unreadAlertsCount, 
  onOpenAlerts, 
  onOpenDemo, 
  isScrapingGlobal 
}) {
  return (
    <header className="glass-panel" style={{ margin: '16px 24px', padding: '14px 24px', position: 'sticky', top: '16px', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
          }}>
            <ShoppingCart size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-font" style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                INE Price Tracker
              </span>
              <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                <span className="pulse-dot online" style={{ width: '6px', height: '6px' }} />
                Mock Store Live
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Intelligent Scraping & Price Audit System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={() => setActiveTab('tracked')}
            className={`btn ${activeTab === 'tracked' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Tracked Products
          </button>
          <button 
            onClick={() => setActiveTab('search')}
            className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Store Catalog
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Audit Logs
          </button>
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Target Store Link */}
          <a 
            href="https://demo.inelabteamdev.com" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}
            title="Open target mock storefront"
          >
            <span>Target Store</span>
            <ExternalLink size={14} />
          </a>

          {/* Observable Headed Run Trigger */}
          <button 
            onClick={onOpenDemo}
            className="btn btn-accent"
            style={{ padding: '8px 14px', fontSize: '12px' }}
          >
            <Play size={14} />
            <span>Observable Run</span>
          </button>

          {/* Notifications / Alerts Button */}
          <button 
            onClick={onOpenAlerts}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', position: 'relative' }}
            title="Price drop & stock notifications"
          >
            <Bell size={16} />
            {unreadAlertsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--accent-rose)',
                color: '#fff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)'
              }}>
                {unreadAlertsCount}
              </span>
            )}
          </button>

        </div>

      </div>
    </header>
  );
}
