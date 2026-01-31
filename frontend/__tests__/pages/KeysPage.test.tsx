import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeysPage } from '../../src/pages/KeysPage';

// Mock the API module
vi.mock('../../src/services/api', () => ({
  keysApi: {
    create: vi.fn(),
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import mocked module
import { keysApi } from '../../src/services/api';

const mockKeysApi = keysApi as any;

describe('KeysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKeysApi.list.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      render(<KeysPage />);

      expect(screen.getByText(/API Keys/i)).toBeInTheDocument();
    });

    it('should render create key button', () => {
      render(<KeysPage />);

      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    it('should load and display keys on mount', async () => {
      const mockKeys = [
        {
          id: '1',
          name: 'test-key',
          key: 'sk_abc123',
          providers: ['brave'],
          createdAt: '2026-01-31T00:00:00Z',
          isActive: true,
        },
      ];

      mockKeysApi.list.mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText('test-key')).toBeInTheDocument();
      });
    });

    it('should show empty state when no keys', async () => {
      mockKeysApi.list.mockResolvedValue([]);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText(/no keys/i)).toBeInTheDocument();
      });
    });
  });

  describe('Create Key Modal', () => {
    it('should open create modal on button click', async () => {
      render(<KeysPage />);

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      expect(screen.getByText(/create api key/i)).toBeInTheDocument();
    });

    it('should have name input', async () => {
      render(<KeysPage />);

      fireEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/key name/i)).toBeInTheDocument();
      });
    });

    it('should have provider checkboxes', async () => {
      render(<KeysPage />);

      fireEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /brave/i })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /openai/i })).toBeInTheDocument();
      });
    });

    it('should call create API on submit', async () => {
      mockKeysApi.create.mockResolvedValue({
        id: '1',
        name: 'new-key',
        key: 'sk_xyz',
        providers: ['brave'],
        createdAt: '2026-01-31T00:00:00Z',
        isActive: true,
      });

      render(<KeysPage />);

      fireEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText(/key name/i) as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'new-key' } });
      });

      const braveCheckbox = screen.getByRole('checkbox', { name: /brave/i });
      fireEvent.click(braveCheckbox);

      const submitButton = screen.getAllByRole('button', { name: /create/i })[1]; // Second create button
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockKeysApi.create).toHaveBeenCalledWith('new-key', ['brave']);
      });
    });
  });

  describe('Key Actions', () => {
    it('should show copy button for each key', async () => {
      const mockKeys = [
        {
          id: '1',
          name: 'test-key',
          key: 'sk_abc123',
          providers: ['brave'],
          createdAt: '2026-01-31T00:00:00Z',
          isActive: true,
        },
      ];

      mockKeysApi.list.mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
      });
    });

    it('should show delete button for each key', async () => {
      const mockKeys = [
        {
          id: '1',
          name: 'test-key',
          key: 'sk_abc123',
          providers: ['brave'],
          createdAt: '2026-01-31T00:00:00Z',
          isActive: true,
        },
      ];

      mockKeysApi.list.mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    it('should call delete API on delete action', async () => {
      const mockKeys = [
        {
          id: '1',
          name: 'test-key',
          key: 'sk_abc123',
          providers: ['brave'],
          createdAt: '2026-01-31T00:00:00Z',
          isActive: true,
        },
      ];

      mockKeysApi.list.mockResolvedValue(mockKeys);
      mockKeysApi.delete.mockResolvedValue(undefined);

      render(<KeysPage />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockKeysApi.delete).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Provider Display', () => {
    it('should display provider badges for each key', async () => {
      const mockKeys = [
        {
          id: '1',
          name: 'multi-provider',
          key: 'sk_abc123',
          providers: ['brave', 'openai'],
          createdAt: '2026-01-31T00:00:00Z',
          isActive: true,
        },
      ];

      mockKeysApi.list.mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText('brave')).toBeInTheDocument();
        expect(screen.getByText('openai')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error', async () => {
      mockKeysApi.list.mockRejectedValue(new Error('Network error'));

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });
});
