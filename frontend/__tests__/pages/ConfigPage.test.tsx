import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConfigPage } from '../../src/pages/ConfigPage';

vi.mock('../../src/services/api', () => ({
  providersApi: {
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    update: vi.fn(),
    check: vi.fn(),
    delete: vi.fn(),
  },
}));

import { providersApi } from '../../src/services/api';

const mockProvidersApi = providersApi as any;

describe('ConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProvidersApi.list.mockResolvedValue([
      { name: 'brave', isConfigured: false, apiKey: '', lastChecked: null },
      { name: 'openai', isConfigured: false, apiKey: '', lastChecked: null },
      { name: 'claude', isConfigured: false, apiKey: '', lastChecked: null },
    ]);
  });

  it('should render page title', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('Provider Configuration')).toBeInTheDocument();
    });
  });

  it('should render provider tabs', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Brave' })).toBeInTheDocument();
    });
  });

  it('should load providers on mount', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(mockProvidersApi.list).toHaveBeenCalled();
    });
  });

  it('should handle fetch error', async () => {
    mockProvidersApi.list.mockRejectedValue(new Error('Network error'));

    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('should show API key as plain text by default', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      const apiKeyInputs = screen.getAllByPlaceholderText(/Enter.*API key/i);
      // API key inputs should be visible as text by default
      apiKeyInputs.forEach((input) => {
        expect(input).toHaveAttribute('type', 'text');
      });
    });
  });

  it('should hide API key after successful save', async () => {
    mockProvidersApi.update.mockResolvedValue({});

    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Brave' })).toBeInTheDocument();
    });

    // Find the Brave tab and click it to ensure it's active
    const braveTab = screen.getByRole('button', { name: 'Brave' });
    fireEvent.click(braveTab);

    // Enter API key
    const apiKeyInput = screen.getAllByPlaceholderText(/Enter.*API key/i)[0];
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } });

    // Click Save button
    const saveButton = screen.getAllByRole('button', { name: /Save Configuration/i })[0];
    fireEvent.click(saveButton);

    // After save, the API key input should be hidden (password type)
    await waitFor(() => {
      const updatedApiKeyInput = screen.getAllByPlaceholderText(/Enter.*API key/i)[0];
      expect(updatedApiKeyInput).toHaveAttribute('type', 'password');
    });
  });
});
