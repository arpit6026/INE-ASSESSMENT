import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { TrendingDown, TrendingUp, Calendar, Table, BarChart2 } from 'lucide-react';

export default function PriceChart({ history = [], productName = 'Product' }) {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  if (!history || history.length === 0) {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No price history recorded yet. Click "Scrape Now" to fetch the initial data point.</p>
      </div>
    );
  }

  // Format data points for recharts
  const chartData = history.map((item) => {
    const d = new Date(item.scraped_at);
    const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return {
      date: `${dateStr} ${timeStr}`,
      rawDate: item.scraped_at,
      price: Number(item.price),
      stock: item.stock !== null ? Number(item.stock) : null,
      mrp: item.mrp ? Number(item.mrp) : null
    };
  });

  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const latestPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const priceDiff = latestPrice - firstPrice;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--border-glow)',
          borderRadius: '10px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)'
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
            {data.date}
          </p>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#38bdf8', marginBottom: '4px' }}>
            ₹{data.price.toLocaleString('en-IN')}
          </p>
          {data.stock !== null && (
            <p style={{ fontSize: '12px', color: '#34d399' }}>
              Stock: {data.stock} units
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ marginTop: '16px' }}>
      
      {/* Stats Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
        background: 'rgba(15, 23, 42, 0.5)',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Current</span>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
            ₹{latestPrice.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Lowest Recorded</span>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#34d399' }}>
            ₹{minPrice.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Highest Recorded</span>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#fb7185' }}>
            ₹{maxPrice.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Overall Shift</span>
          <p style={{
            fontSize: '15px',
            fontWeight: '700',
            color: priceDiff < 0 ? '#34d399' : priceDiff > 0 ? '#fb7185' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {priceDiff < 0 ? <TrendingDown size={14} /> : priceDiff > 0 ? <TrendingUp size={14} /> : null}
            {priceDiff === 0 ? '0' : `₹${Math.abs(priceDiff).toLocaleString('en-IN')}`}
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '6px' }}>
        <button
          onClick={() => setViewMode('chart')}
          className={`btn ${viewMode === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '4px 10px', fontSize: '11px' }}
        >
          <BarChart2 size={12} />
          <span>Chart</span>
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '4px 10px', fontSize: '11px' }}
        >
          <Table size={12} />
          <span>Table</span>
        </button>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' ? (
        <div style={{ width: '100%', height: '280px', marginTop: '10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={11}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `₹${val}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#38bdf8" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#priceGradient)" 
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#38bdf8" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#0284c7', stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Table View */
        <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '8px 12px' }}>Date & Time</th>
                <th style={{ padding: '8px 12px' }}>Price</th>
                <th style={{ padding: '8px 12px' }}>MRP</th>
                <th style={{ padding: '8px 12px' }}>Stock</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.slice().reverse().map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                    {new Date(h.scraped_at).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#fff', fontWeight: '600' }}>
                    ₹{Number(h.price).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                    {h.mrp ? `₹${Number(h.mrp).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#34d399' }}>
                    {h.stock !== null ? h.stock : '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>
                      {h.stock_status || 'verified'}
                    </span>
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
