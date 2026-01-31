import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { KeysPage } from './pages/KeysPage';
import { ConfigPage } from './pages/ConfigPage';
import { StatsPage } from './pages/StatsPage';
import { healthApi } from './services/api';
import './App.css';

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

      <main className="app-content">{renderPage()}</main>

      <footer className="app-footer">
        <p>&copy; 2026 APIRouter. Open source • MIT License</p>
      </footer>
    </div>
  );
}

export default App;
