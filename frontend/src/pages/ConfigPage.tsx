import { useState, useEffect } from 'react';
import { providersApi, ProviderConfig } from '../services/api';
import '../styles/ConfigPage.css';

export const ConfigPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('brave');
  const [formData, setFormData] = useState<{
    [key: string]: {
      apiKey: string;
      baseUrl: string;
      rateLimit: string;
      timeout: string;
    };
  }>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({
    brave: true,
    openai: true,
    claude: true,
  });
  const [checking, setChecking] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{
    [key: string]: { healthy: boolean; checkedAt: string };
  }>({});

  const providerList = ['brave', 'openai', 'claude'];

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providersApi.list();
      setProviders(data);

      // Initialize form data and show states for ALL providers
      const initialData: typeof formData = {};
      const initialShowStates: typeof showApiKey = {};
      
      // Always initialize all providers in providerList
      providerList.forEach((provider) => {
        const existingProvider = data.find((p) => p.name === provider);
        initialData[provider] = {
          apiKey: existingProvider?.apiKey || '',
          baseUrl: '',
          rateLimit: '100',
          timeout: '30000',
        };
        initialShowStates[provider] = true; // Always show as plaintext by default
      });
      
      setFormData(initialData);
      setShowApiKey(initialShowStates);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (provider: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  const handleSave = async (provider: string) => {
    const data = formData[provider];

    if (!data.apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    try {
      setSaving(provider);
      const updatedConfig = await providersApi.update(provider, {
        apiKey: data.apiKey,
        baseUrl: data.baseUrl || undefined,
        rateLimit: data.rateLimit ? parseInt(data.rateLimit) : undefined,
        timeout: data.timeout ? parseInt(data.timeout) : undefined,
      });

      // Update local provider state with response (no full reload needed)
      setProviders((prev) => {
        const exists = prev.some((p) => p.name === provider);
        if (exists) {
          return prev.map((p) => (p.name === provider ? updatedConfig : p));
        } else {
          return [...prev, updatedConfig];
        }
      });

      // Hide API key after successful save
      setShowApiKey((prev) => ({ ...prev, [provider]: false }));
      alert('Provider configuration saved!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(null);
    }
  };

  const handleCheck = async (provider: string) => {
    try {
      setChecking(provider);
      const result = await providersApi.check(provider);
      setCheckResult((prev) => ({
        ...prev,
        [provider]: result,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setChecking(null);
    }
  };

  const handleDelete = async (provider: string) => {
    if (!window.confirm(`Delete ${provider} configuration?`)) {
      return;
    }

    try {
      await providersApi.delete(provider);
      
      // Update local state - remove provider or mark as unconfigured
      setProviders((prev) =>
        prev.map((p) =>
          p.name === provider
            ? { ...p, isConfigured: false, apiKey: undefined, lastChecked: null }
            : p
        )
      );
      
      // Reset form data for this provider
      setFormData((prev) => ({
        ...prev,
        [provider]: {
          apiKey: '',
          baseUrl: '',
          rateLimit: '100',
          timeout: '30000',
        },
      }));
      
      alert('Provider configuration deleted!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const getProviderConfig = (name: string) => {
    return providers.find((p) => p.name === name);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="loading">Loading providers...</div>;
  }

  return (
    <div className="config-page">
      <div className="page-header">
        <h1>Provider Configuration</h1>
        <p className="subtitle">Configure API keys and settings for each provider</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="config-container">
        <div className="provider-tabs">
          {providerList.map((provider) => (
            <button
              key={provider}
              className={`tab ${activeTab === provider ? 'active' : ''}`}
              onClick={() => setActiveTab(provider)}
            >
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </button>
          ))}
        </div>

        <div className="provider-content">
          {providerList.map((provider) => {
            const config = getProviderConfig(provider);
            const formValue = formData[provider];
            const checkRes = checkResult[provider];

            return (
              <div
                key={provider}
                className={`provider-form ${activeTab === provider ? 'active' : ''}`}
              >
                <div className="form-group">
                  <label>API Key</label>
                <div className="input-with-toggle">
                  <input
                    type={showApiKey[provider] ? 'text' : 'password'}
                    placeholder={`Enter ${provider} API key`}
                    value={formValue?.apiKey || ''}
                    onChange={(e) => handleInputChange(provider, 'apiKey', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-toggle-visibility"
                    onClick={() => setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
                    title={showApiKey[provider] ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey[provider] ? '🙈' : '👁️'}
                  </button>
                </div>
                </div><small>Your API key is encrypted and never logged</small>

                <div className="form-group">
                  <label>Base URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://api.example.com"
                    value={formValue?.baseUrl || ''}
                    onChange={(e) => handleInputChange(provider, 'baseUrl', e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Rate Limit (requests/min)</label>
                    <input
                      type="number"
                      value={formValue?.rateLimit || '100'}
                      onChange={(e) => handleInputChange(provider, 'rateLimit', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Timeout (ms)</label>
                    <input
                      type="number"
                      value={formValue?.timeout || '30000'}
                      onChange={(e) => handleInputChange(provider, 'timeout', e.target.value)}
                    />
                  </div>
                </div>

                {config?.isConfigured && (
                  <div className="status-info">
                    <div className="status-badge configured">Configured</div>
                    {config.lastChecked && (
                      <p>Last checked: {formatDate(config.lastChecked)}</p>
                    )}
                  </div>
                )}

                {checkRes && (
                  <div className={`check-result ${checkRes.healthy ? 'healthy' : 'unhealthy'}`}>
                    <span className={`status-dot ${checkRes.healthy ? 'ok' : 'error'}`}></span>
                    <div>
                      <strong>{checkRes.healthy ? 'Healthy' : 'Unhealthy'}</strong>
                      <p>Checked at {formatDate(checkRes.checkedAt)}</p>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSave(provider)}
                    disabled={saving === provider}
                  >
                    {saving === provider ? 'Saving...' : 'Save Configuration'}
                  </button>

                  {config?.isConfigured && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCheck(provider)}
                      disabled={checking === provider}
                    >
                      {checking === provider ? 'Checking...' : 'Health Check'}
                    </button>
                  )}

                  {config?.isConfigured && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(provider)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
