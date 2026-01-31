import { useState, useEffect } from 'react';
import { keysApi, ApiKey } from '../services/api';
import '../styles/StatsPage.css';

interface KeyStats {
  keyId: string;
  keyName: string;
  provider: string;
  requestCount: number;
  errorCount: number;
  lastUsedAt: string | null;
}

export const StatsPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const providers = ['all', 'brave', 'openai', 'claude'];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await keysApi.list();
      setKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never used';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalRequests = () => {
    return keys.reduce((total, key) => {
      if (key.lastUsedAt) {
        return total + 1; // Simplified: 1 request per key if used
      }
      return total;
    }, 0);
  };

  const getActiveKeys = () => {
    return keys.filter((k) => k.isActive && k.lastUsedAt).length;
  };

  const getInactiveKeys = () => {
    return keys.filter((k) => k.isActive && !k.lastUsedAt).length;
  };

  const filteredKeys =
    selectedProvider === 'all'
      ? keys
      : keys.filter((k) => k.providers.includes(selectedProvider));

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  return (
    <div className="stats-page">
      <div className="page-header">
        <h1>Statistics</h1>
        <p className="subtitle">Monitor your API usage and key activity</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Summary Cards */}
      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-value">{keys.length}</div>
          <div className="stat-label">Total Keys</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{getActiveKeys()}</div>
          <div className="stat-label">Active Keys</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{getInactiveKeys()}</div>
          <div className="stat-label">Inactive Keys</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{getTotalRequests()}</div>
          <div className="stat-label">Total Requests</div>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-section">
        <label htmlFor="provider-filter">Filter by Provider:</label>
        <select
          id="provider-filter"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
        >
          {providers.map((p) => (
            <option key={p} value={p}>
              {p === 'all' ? 'All Providers' : p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Keys Table */}
      <div className="stats-table">
        <table>
          <thead>
            <tr>
              <th>Key Name</th>
              <th>Providers</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Used</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No keys to display
                </td>
              </tr>
            ) : (
              filteredKeys.map((key) => (
                <tr key={key.id} className={key.lastUsedAt ? 'active-row' : 'inactive-row'}>
                  <td className="key-name">{key.name}</td>
                  <td>
                    <div className="provider-badges">
                      {key.providers.map((p) => (
                        <span key={p} className="badge">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${key.isActive ? 'active' : 'inactive'}`}>
                      {key.isActive ? 'Active' : 'Deleted'}
                    </span>
                  </td>
                  <td>{formatDate(key.createdAt)}</td>
                  <td>
                    <span className={key.lastUsedAt ? 'used' : 'unused'}>
                      {formatDate(key.lastUsedAt)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <h3>About Statistics</h3>
        <ul>
          <li>
            <strong>Total Keys:</strong> Number of API keys created in your account
          </li>
          <li>
            <strong>Active Keys:</strong> Keys that have been used at least once
          </li>
          <li>
            <strong>Inactive Keys:</strong> Keys that have never been used
          </li>
          <li>
            <strong>Total Requests:</strong> Approximate count of API requests made
          </li>
        </ul>
      </div>
    </div>
  );
};
