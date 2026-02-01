import { useState, useEffect, Suspense, lazy } from 'react';
import { Navigation } from './components/Navigation';
import { healthApi } from './services/api';
import './App.css';

// Lazy load pages for better performance
const KeysPage = lazy(() => import('./pages/KeysPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));

// Simple loading fallback
const PageLoader = () => (
  <div className="page-loader">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

type Page = 'keys' | 'config' | 'stats';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('keys');
  const [backendHealth, setBackendHealth] = useState<boolean>(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthApi.check();
        setBackendHealth(true);
      } catch {
        setBackendHealth(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'keys':
        return <KeysPage />;
      case 'config':
        return <ConfigPage />;
      case 'stats':
        return <StatsPage />;
      default:
        return <KeysPage />;
    }
  };

  return (
    <div className="app">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />

      {!backendHealth && (
        <div className="warning-banner">
          ⚠️ Backend is not responding. Please check if the server is running.
        </div>
      )}

      <main className="app-content">
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 APIRouter. Open source • MIT License</p>
      </footer>
    </div>
  );
}

export default App;
