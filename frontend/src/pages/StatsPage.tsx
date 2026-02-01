import { useState, useEffect } from 'react';
import { statsApi, StatsResponse } from '../services/api';
import '../styles/StatsPage.css';

const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  useEffect(() => {
    loadStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await statsApi.getStats();
      setStats(data);
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

  const getSuccessRate = (success: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((success / total) * 100)}%`;
  };

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="error-message">No statistics available yet</div>;
  }

  const providers = ['all', ...Object.keys(stats.byProvider)];

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
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{stats.summary.totalRequests}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Successful</div>
          <div className="stat-value" style={{ color: '#28a745' }}>
            {stats.summary.totalSuccess}
          </div>
          <div className="stat-detail">
            {getSuccessRate(stats.summary.totalSuccess, stats.summary.totalRequests)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Errors</div>
          <div className="stat-value" style={{ color: stats.summary.totalErrors > 0 ? '#dc3545' : '#6c757d' }}>
            {stats.summary.totalErrors}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Keys</div>
          <div className="stat-value">{stats.summary.totalKeys}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Providers</div>
          <div className="stat-value">{stats.summary.totalProviders}</div>
        </div>
      </div>

      {/* Provider Filter */}
      <div className="filter-section">
        <label>Filter by Provider:</label>
        <div className="provider-buttons">
          {providers.map((provider) => (
            <button
              key={provider}
              className={`provider-btn ${selectedProvider === provider ? 'active' : ''}`}
              onClick={() => setSelectedProvider(provider)}
            >
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Details */}
      {(selectedProvider === 'all' || selectedProvider === '') &&
        Object.entries(stats.byProvider).length === 0 && (
          <div className="empty-state">
            <p>No provider statistics available yet. Make some API requests to see data here.</p>
          </div>
        )}

      {(selectedProvider === 'all' || selectedProvider === '') &&
        Object.entries(stats.byProvider).map(([providerName, providerStats]) => (
          <div key={providerName} className="provider-section">
            <h2>{providerName.toUpperCase()}</h2>

            <div className="provider-stats">
              <div className="stat-item">
                <span className="label">Total Requests:</span>
                <span className="value">{providerStats.totalRequests}</span>
              </div>
              <div className="stat-item">
                <span className="label">Success Rate:</span>
                <span className="value" style={{ color: '#28a745' }}>
                  {getSuccessRate(providerStats.totalSuccess, providerStats.totalRequests)}
                </span>
              </div>
              <div className="stat-item">
                <span className="label">Avg Latency:</span>
                <span className="value">{providerStats.avgLatency}ms</span>
              </div>
            </div>

            {/* Keys for this provider */}
            {providerStats.keys.length > 0 && (
              <div className="keys-table">
                <h3>Keys using {providerName}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Key Name</th>
                      <th>Requests</th>
                      <th>Success</th>
                      <th>Errors</th>
                      <th>Avg Latency</th>
                      <th>Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerStats.keys.map((key) => (
                      <tr key={key.keyName}>
                        <td>{key.keyName}</td>
                        <td>{key.requests}</td>
                        <td style={{ color: '#28a745' }}>{key.success}</td>
                        <td style={{ color: key.errors > 0 ? '#dc3545' : '#6c757d' }}>
                          {key.errors}
                        </td>
                        <td>{key.avgLatency}ms</td>
                        <td>{formatDate(key.lastUsedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

      {selectedProvider !== 'all' &&
        selectedProvider !== '' &&
        stats.byProvider[selectedProvider] && (
          <div className="provider-section">
            <h2>{selectedProvider.toUpperCase()}</h2>

            <div className="provider-stats">
              <div className="stat-item">
                <span className="label">Total Requests:</span>
                <span className="value">{stats.byProvider[selectedProvider].totalRequests}</span>
              </div>
              <div className="stat-item">
                <span className="label">Success Rate:</span>
                <span className="value" style={{ color: '#28a745' }}>
                  {getSuccessRate(
                    stats.byProvider[selectedProvider].totalSuccess,
                    stats.byProvider[selectedProvider].totalRequests
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="label">Avg Latency:</span>
                <span className="value">{stats.byProvider[selectedProvider].avgLatency}ms</span>
              </div>
            </div>

            {stats.byProvider[selectedProvider].keys.length > 0 && (
              <div className="keys-table">
                <h3>Keys using {selectedProvider}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Key Name</th>
                      <th>Requests</th>
                      <th>Success</th>
                      <th>Errors</th>
                      <th>Avg Latency</th>
                      <th>Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byProvider[selectedProvider].keys.map((key) => (
                      <tr key={key.keyName}>
                        <td>{key.keyName}</td>
                        <td>{key.requests}</td>
                        <td style={{ color: '#28a745' }}>{key.success}</td>
                        <td style={{ color: key.errors > 0 ? '#dc3545' : '#6c757d' }}>
                          {key.errors}
                        </td>
                        <td>{key.avgLatency}ms</td>
                        <td>{formatDate(key.lastUsedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* Refresh indicator */}
      <div className="refresh-indicator">
        <small>Auto-refreshes every 10 seconds • Last updated: {formatDate(stats.timestamp)}</small>
      </div>
    </div>
  );
};

export { StatsPage };
export default StatsPage;
