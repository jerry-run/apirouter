import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
