import React from 'react';
import { Package, TrendingDown, AlertCircle, Clock } from 'lucide-react';

export default function StatsCards({ stats }) {
  const {
    totalTracked = 0,
    pricedCount = 0,
    avgPrice = 0,
    outOfStockCount = 0,
    lowStockCount = 0,
    unreadAlertsCount = 0
  } = stats || {};

  const cards = [
    {
      title: 'Tracked Products',
      value: totalTracked,
      subtext: `${pricedCount} with verified price`,
      icon: Package,
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.15)'
    },
    {
      title: 'Average Tracked Price',
      value: avgPrice ? `₹${avgPrice.toLocaleString('en-IN')}` : '—',
      subtext: 'Across catalog listings',
      icon: TrendingDown,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.15)'
    },
    {
      title: 'Inventory Alerts',
      value: outOfStockCount + lowStockCount,
      subtext: `${outOfStockCount} out of stock · ${lowStockCount} low`,
      icon: AlertCircle,
      color: outOfStockCount > 0 ? '#f43f5e' : '#f59e0b',
      glow: outOfStockCount > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)'
    },
    {
      title: 'Scrape Frequency',
      value: 'Every 2 Hours',
      subtext: 'Triggered via external cron',
      icon: Clock,
      color: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.15)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      margin: '0 24px 24px 24px'
    }}>
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div 
            key={idx} 
            className="glass-panel"
            style={{
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '80px',
              height: '80px',
              background: card.glow,
              borderRadius: '50%',
              filter: 'blur(20px)',
              pointerEvents: 'none'
            }} />

            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {card.title}
              </p>
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                {card.value}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {card.subtext}
              </p>
            </div>

            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: `1px solid ${card.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: card.color
            }}>
              <IconComponent size={22} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
