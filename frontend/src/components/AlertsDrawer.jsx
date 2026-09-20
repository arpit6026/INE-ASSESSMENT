import React from 'react';
import { X, TrendingDown, Check, Package, CheckCheck } from 'lucide-react';
import { markAlertRead } from '../services/api';

export default function AlertsDrawer({ alerts = [], onClose, onAlertRead }) {
  async function handleMarkRead(id) {
    try {
      await markAlertRead(id);
      onAlertRead(id);
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '380px',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)',
      borderLeft: '1px solid var(--border-glow)',
      zIndex: 1100,
      boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
            Price & Stock Alerts
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time price drops and restock alerts
          </p>
        </div>

        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ padding: '6px 8px', borderRadius: '50%' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer List */}
      <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontSize: '13px' }}>
            No unread notifications right now.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                background: alert.type === 'PRICE_DROP' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)',
                border: alert.type === 'PRICE_DROP' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {alert.type === 'PRICE_DROP' ? (
                    <TrendingDown size={14} color="#34d399" />
                  ) : (
                    <Package size={14} color="#38bdf8" />
                  )}
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {alert.title}
                  </span>
                </div>

                {!alert.is_read && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '2px 4px'
                    }}
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                {alert.message}
              </p>

              <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                {new Date(alert.created_at).toLocaleString('en-IN')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
