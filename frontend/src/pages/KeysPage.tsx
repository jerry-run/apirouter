import { useState, useEffect } from 'react';
import { keysApi, ApiKey } from '../services/api';
import '../styles/KeysPage.css';

export const KeysPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<'90days' | '180days' | 'never'>('90days');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isDuplicateName = newKeyName.trim() !== '' && 
    keys.some((key) => key.name.toLowerCase() === newKeyName.trim().toLowerCase());

  const providers = ['brave', 'openai', 'claude'];
  const expirationOptions: Array<{ value: '90days' | '180days' | 'never'; label: string }> = [
    { value: '90days', label: '90 days (default)' },
    { value: '180days', label: '180 days' },
    { value: 'never', label: 'Never expires' },
  ];

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await keysApi.list();
      setKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    const trimmedName = newKeyName.trim();

    if (!trimmedName) {
      alert('Please enter a key name');
      return;
    }

    // Check for duplicate name
    if (keys.some((key) => key.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert(`A key with the name "${trimmedName}" already exists. Please use a different name.`);
      return;
    }

    if (selectedProviders.length === 0) {
      alert('Please select at least one provider');
      return;
    }

    try {
      await keysApi.create(trimmedName, selectedProviders, expiresIn);
      setNewKeyName('');
      setSelectedProviders([]);
      setExpiresIn('90days');
      setShowModal(false);
      await loadKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create key');
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      alert('Key copied to clipboard!');
    } catch {
      alert('Failed to copy key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await keysApi.delete(id);
      await loadKeys();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete key');
    }
  };

  const handleProviderToggle = (provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maskKey = (key: string) => {
    // Show first 6 and last 4 characters, mask the rest
    if (key.length <= 10) return key;
    return `${key.substring(0, 6)}${'*'.repeat(key.length - 10)}${key.substring(key.length - 4)}`;
  };

  return (
    <div className="keys-page">
      <div className="page-header">
        <h1>API Keys</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Create Key
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading keys...</div>
      ) : keys.length === 0 ? (
        <div className="empty-state">
          <p>No keys yet. Create your first API key to get started.</p>
        </div>
      ) : (
        <div className="keys-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Providers</th>
                <th>Expires</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td className="key-cell">
                    <code title={key.key}>{maskKey(key.key)}</code>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleCopyKey(key.key)}
                    >
                      Copy
                    </button>
                  </td>
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
                    {key.expiresAt ? (
                      <span className="expires-date">{formatDate(key.expiresAt)}</span>
                    ) : (
                      <span className="expires-never">Never</span>
                    )}
                  </td>
                  <td>{formatDate(key.createdAt)}</td>
                  <td>
                    {deleteConfirm === key.id ? (
                      <div className="confirm-delete">
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => setDeleteConfirm(key.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create API Key</h2>

            <div className="form-group">
              <label htmlFor="keyName">Key Name</label>
              <input
                id="keyName"
                type="text"
                placeholder="Key name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className={isDuplicateName ? 'input-error' : ''}
              />
              {isDuplicateName && (
                <small className="error-text">
                  ⚠️ A key with this name already exists
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Select Providers</label>
              <div className="checkbox-group">
                {providers.map((provider) => (
                  <div key={provider} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`provider-${provider}`}
                      checked={selectedProviders.includes(provider)}
                      onChange={() => handleProviderToggle(provider)}
                    />
                    <label htmlFor={`provider-${provider}`}>{provider}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="expiresIn">Expiration</label>
              <select
                id="expiresIn"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value as '90days' | '180days' | 'never')}
              >
                {expirationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || selectedProviders.length === 0 || isDuplicateName}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
