import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Filter, ShieldCheck } from 'lucide-react';

export default function ScrapeLogsTable({ logs = [], loading = false, selectedProductId = null }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'SUCCESS', 'RETRIED', 'FAILED'

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    if (filter === 'SUCCESS') return log.status === 'SUCCESS';
    if (filter === 'RETRIED') return log.status === 'RETRIED' || log.attempt_number > 1;
    if (filter === 'FAILED') return log.status === 'FAILED' || log.status === 'RETRIED_FAILED';
    return true;
  });

  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const retriedCount = logs.filter(l => l.status === 'RETRIED' || l.attempt_number > 1).length;
  const failedCount = logs.filter(l => l.status === 'FAILED' || l.status === 'RETRIED_FAILED').length;

  const renderStatusBadge = (status, attemptNum) => {
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
        <span className="badge badge-warning">
          <AlertTriangle size={12} />
          <span>Retried ({attemptNum})</span>
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

  return (
    <div className="glass-panel" style={{ margin: selectedProductId ? '16px 0 0 0' : '0 24px 24px 24px', overflow: 'hidden' }}>
      
      {/* Header & Filter Controls */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              Scrape Attempt Audit Logs
            </h2>
            <span className="badge badge-neutral" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} color="var(--primary)" />
              Honest Audit Trail
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Every scrape attempt, upstream response delay, retry cycle, and error is recorded faithfully
          </p>
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setFilter('ALL')}
            className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('SUCCESS')}
            className={`btn ${filter === 'SUCCESS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Success ({successCount})
          </button>
          <button
            onClick={() => setFilter('RETRIED')}
            className={`btn ${filter === 'RETRIED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Retried ({retriedCount})
          </button>
          <button
            onClick={() => setFilter('FAILED')}
            className={`btn ${filter === 'FAILED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Failed ({failedCount})
          </button>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No scrape logs match the selected filter.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600' }}>Timestamp</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Product ID</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Attempt #</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Outcome Status</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Duration</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Extracted Price</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Extracted Stock</th>
                <th style={{ padding: '12px 20px', fontWeight: '600' }}>Response / Error Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="hover-row">
                  
                  {/* Timestamp */}
                  <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>
                    {new Date(log.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}{' '}
                    <span style={{ color: '#fff' }}>
                      {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </td>

                  {/* Product ID */}
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    #{log.product_id}
                  </td>

                  {/* Attempt */}
                  <td style={{ padding: '12px 14px', color: '#fff', fontWeight: '600' }}>
                    Attempt {log.attempt_number}
                  </td>

                  {/* Outcome */}
                  <td style={{ padding: '12px 14px' }}>
                    {renderStatusBadge(log.status, log.attempt_number)}
                  </td>

                  {/* Duration */}
                  <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : '—'}
                  </td>

                  {/* Price */}
                  <td style={{ padding: '12px 14px', fontWeight: '600', color: log.price_extracted ? '#fff' : 'var(--text-dim)' }}>
                    {log.price_extracted ? `₹${Number(log.price_extracted).toLocaleString('en-IN')}` : '—'}
                  </td>

                  {/* Stock */}
                  <td style={{ padding: '12px 14px', color: log.stock_extracted !== null ? '#34d399' : 'var(--text-dim)' }}>
                    {log.stock_extracted !== null ? `${log.stock_extracted} units` : '—'}
                  </td>

                  {/* Notes / Errors */}
                  <td style={{ padding: '12px 20px', maxWidth: '320px' }}>
                    {log.error_message ? (
                      <span style={{ color: 'var(--accent-rose)', fontSize: '11px', lineHeight: '1.3', display: 'block' }}>
                        {log.error_message}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                        Normal resolution (mode: {log.mode || 'headless'})
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
