import React, { useState } from 'react';
import { X, Play, Video, ShieldAlert, CheckCircle2, RefreshCw, Terminal } from 'lucide-react';
import { triggerHeadedDemo, getBaseUrl } from '../services/api';

export default function ObservableRunnerModal({ onClose }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const base = getBaseUrl();
  const backendRoot = base.startsWith('http') ? base.replace(/\/api$/, '') : '';
  const videoSrc = `${backendRoot}/recordings/headed_scraper_demo.webm`;

  async function handleRunDemo() {
    setRunning(true);
    setLogs([]);
    setResult(null);
    setError(null);
    try {
      const res = await triggerHeadedDemo();
      setResult(res.result);
      setLogs(res.logs || []);
    } catch (err) {
      setError(err.message || 'Demo run failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 16, 0.85)',
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
          maxWidth: '850px',
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
              <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                Assignment Core Requirement
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
              Observable (Headed) Scraper Demonstration
            </h2>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 10px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '13px',
            lineHeight: '1.6',
            color: 'var(--text-muted)'
          }}>
            <p style={{ marginBottom: '8px', color: '#fff', fontWeight: '600' }}>
              Why Headed Mode is Essential for this Storefront:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong>Anti-Bot Behavioral Defense:</strong> The mock store requires at least 8 mouse moves and a 600ms dwell over the price block before enabling the "Reveal price" button.
              </li>
              <li>
                <strong>Trusted Events:</strong> The store inspects <code>e.nativeEvent.isTrusted</code> to reject simple synthetic scripts.
              </li>
              <li>
                <strong>Decoy / Honeypot Defense:</strong> The DOM contains hidden fake prices (e.g. <code>.price-value</code> with <code>display: none</code>); our parser extracts only the verified visible element and handles zero-width unicode spaces.
              </li>
              <li>
                <strong>Transient Retries:</strong> The store intentionally simulates 503 errors and delays (up to 6 retry phases). The scraper handles these gracefully without corrupting history.
              </li>
            </ul>
          </div>

          {/* Video Player for Recorded Headed Run */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Video size={16} color="var(--primary)" />
                Recorded Headed Run Video Submission
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                recordings/headed_scraper_demo.webm
              </span>
            </div>

            <div style={{
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              aspectRatio: '16 / 9'
            }}>
              <video 
                controls 
                style={{ width: '100%', height: '100%' }}
                src={videoSrc}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Trigger Live Run Button & Terminal Logs */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} color="var(--accent-emerald)" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                  Live Scraper Execution Engine
                </span>
              </div>

              <button
                onClick={handleRunDemo}
                disabled={running}
                className="btn btn-accent"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <Play size={13} className={running ? 'animate-spin' : ''} />
                <span>{running ? 'Running Scraper…' : 'Execute Test Run'}</span>
              </button>
            </div>

            {logs.length > 0 && (
              <div style={{
                background: '#050810',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {logs.map((lg, i) => (
                  <div key={i} style={{ color: lg.level === 'error' ? '#fb7185' : lg.level === 'warn' ? '#fbbf24' : '#94a3b8' }}>
                    <span style={{ color: '#64748b' }}>[{lg.timestamp.split('T')[1].slice(0, 8)}]</span>{' '}
                    <span>{lg.message}</span>
                  </div>
                ))}
              </div>
            )}

            {result && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', fontSize: '13px', color: '#34d399' }}>
                ✅ Extracted Price: <strong>₹{result.price}</strong> | Stock: <strong>{result.stock} units</strong> | Attempts: <strong>{result.attemptCount}</strong> ({result.durationMs}ms)
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
