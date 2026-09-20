import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsCards from './components/StatsCards';
import TrackedProductsList from './components/TrackedProductsList';
import ProductSearch from './components/ProductSearch';
import ScrapeLogsTable from './components/ScrapeLogsTable';
import ProductDetailModal from './components/ProductDetailModal';
import ObservableRunnerModal from './components/ObservableRunnerModal';
import AlertsDrawer from './components/AlertsDrawer';
import {
  fetchTrackedProducts,
  fetchAnalyticsOverview,
  fetchAlerts,
  fetchScrapeLogs,
  triggerScrape,
  untrackProduct,
  updateProductFrequency
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('tracked'); // 'tracked', 'search', 'logs'
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrapingIds, setScrapingIds] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [prods, st, alts, lgs] = await Promise.all([
        fetchTrackedProducts().catch(() => []),
        fetchAnalyticsOverview().catch(() => ({})),
        fetchAlerts(false).catch(() => []),
        fetchScrapeLogs().catch(() => [])
      ]);
      setTrackedProducts(prods);
      setStats(st);
      setAlerts(alts);
      setLogs(lgs);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScrapeNow(id) {
    setScrapingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await triggerScrape(id, false);
      await loadDashboardData();
    } catch (err) {
      console.error(`Failed to scrape product ${id}:`, err);
      await loadDashboardData();
    } finally {
      setScrapingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleUntrack(id) {
    try {
      await untrackProduct(id);
      setTrackedProducts((prev) => prev.filter((p) => p.id !== id));
      loadDashboardData();
    } catch (err) {
      console.error('Failed to untrack product:', err);
    }
  }

  async function handleUpdateFrequency(id, hours) {
    try {
      await updateProductFrequency(id, hours);
      setTrackedProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, scrape_frequency_hours: parseInt(hours, 10) } : p))
      );
    } catch (err) {
      console.error('Failed to update frequency:', err);
    }
  }

  const trackedIdsSet = new Set(trackedProducts.map((p) => p.id));
  const unreadAlertsCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadAlertsCount={unreadAlertsCount}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenDemo={() => setIsDemoOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        
        {/* KPI Summary Stats */}
        <StatsCards stats={stats} />

        {/* View Switcher */}
        {activeTab === 'tracked' && (
          <TrackedProductsList
            products={trackedProducts}
            loading={loading}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onScrapeNow={handleScrapeNow}
            onUntrack={handleUntrack}
            onUpdateFrequency={handleUpdateFrequency}
            scrapingIds={scrapingIds}
          />
        )}

        {activeTab === 'search' && (
          <ProductSearch
            trackedIds={trackedIdsSet}
            onProductTracked={async () => {
              await loadDashboardData();
              setActiveTab('tracked');
            }}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}

        {activeTab === 'logs' && (
          <ScrapeLogsTable logs={logs} loading={loading} />
        )}

      </main>

      {/* Product Detail & Historical Chart Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onProductUpdated={() => loadDashboardData()}
        />
      )}

      {/* Observable Headed Run Demonstration Modal */}
      {isDemoOpen && (
        <ObservableRunnerModal onClose={() => setIsDemoOpen(false)} />
      )}

      {/* Alerts Drawer */}
      {isAlertsOpen && (
        <AlertsDrawer
          alerts={alerts}
          onClose={() => setIsAlertsOpen(false)}
          onAlertRead={(id) => {
            setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
          }}
        />
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: 'var(--text-dim)',
        fontSize: '12px',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: 'auto'
      }}>
        <p>
          INE Software Engineer Intern Assignment · Built with React, Node.js Express, Playwright, and Supabase
        </p>
        <p style={{ marginTop: '4px' }}>
          Autonomous Price Monitoring & Honest Anti-Scraping Audit Engine
        </p>
      </footer>

    </div>
  );
}
