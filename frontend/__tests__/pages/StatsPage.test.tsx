import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatsPage } from '../../src/pages/StatsPage';

vi.mock('../../src/services/api', () => ({
  keysApi: {
    create: vi.fn(),
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import { keysApi } from '../../src/services/api';

const mockKeysApi = keysApi as any;

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKeysApi.list.mockResolvedValue([]);
  });

  it('should render page title', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });
  });

  it('should load keys on mount', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      expect(mockKeysApi.list).toHaveBeenCalled();
    });
  });

  it('should show empty state', async () => {
    mockKeysApi.list.mockResolvedValue([]);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No keys to display/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error', async () => {
    mockKeysApi.list.mockRejectedValue(new Error('Network error'));

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('should render filter dropdown', async () => {
    render(<StatsPage />);

    await waitFor(() => {
      const filterSelect = screen.getByDisplayValue(/All Providers/i);
      expect(filterSelect).toBeInTheDocument();
    });
  });
});
