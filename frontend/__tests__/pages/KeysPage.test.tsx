import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeysPage } from '../../src/pages/KeysPage';
import * as keysApi from '../../src/services/api';

vi.mock('../../src/services/api');

describe('KeysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      vi.spyOn(keysApi, 'list').mockResolvedValue([]);

      render(<KeysPage />);

      expect(screen.getByText(/API Keys/i)).toBeInTheDocument();
    });

    it('should render create key button', async () => {
      vi.spyOn(keysApi, 'list').mockResolvedValue([]);

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

      vi.spyOn(keysApi, 'list').mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText('test-key')).toBeInTheDocument();
      });
    });

    it('should show empty state when no keys', async () => {
      vi.spyOn(keysApi, 'list').mockResolvedValue([]);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText(/no keys/i)).toBeInTheDocument();
      });
    });
  });

  describe('Create Key Modal', () => {
    it('should open create modal on button click', async () => {
      vi.spyOn(keysApi, 'list').mockResolvedValue([]);

      render(<KeysPage />);

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      expect(screen.getByText(/create api key/i)).toBeInTheDocument();
    });

    it('should have name input', async () => {
      vi.spyOn(keysApi, 'list').mockResolvedValue([]);

      render(<KeysPage />);

      fireEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/key name/i)).toBeInTheDocument();
      });
    });

    it('should have provider checkboxes', async () => {
      vi.spyOn(keysApi, 'list').mockResolvedValue([]);

      render(<KeysPage />);

      fireEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /brave/i })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /openai/i })).toBeInTheDocument();
      });
    });

    it('should call create API on submit', async () => {
      vi.spyOn(keysApi, 'list').mockResolvedValue([]);
      const createSpy = vi.spyOn(keysApi, 'create').mockResolvedValue({
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

      const submitButton = screen.getByRole('button', { name: /submit|create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith('new-key', ['brave']);
      });
    });

    it('should close modal after successful creation', async () => {
      vi.spyOn(keysApi, 'list')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'new-key',
            key: 'sk_xyz',
            providers: ['brave'],
            createdAt: '2026-01-31T00:00:00Z',
            isActive: true,
          },
        ]);

      vi.spyOn(keysApi, 'create').mockResolvedValue({
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

      fireEvent.click(screen.getByRole('button', { name: /submit|create/i }));

      await waitFor(() => {
        expect(screen.queryByText(/create api key/i)).not.toBeInTheDocument();
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

      vi.spyOn(keysApi, 'list').mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
      });
    });

    it('should copy key to clipboard', async () => {
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

      vi.spyOn(keysApi, 'list').mockResolvedValue(mockKeys);

      const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

      render(<KeysPage />);

      await waitFor(() => {
        const copyButton = screen.getByRole('button', { name: /copy/i });
        fireEvent.click(copyButton);
      });

      expect(clipboardSpy).toHaveBeenCalledWith('sk_abc123');
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

      vi.spyOn(keysApi, 'list').mockResolvedValue(mockKeys);

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

      vi.spyOn(keysApi, 'list').mockResolvedValue(mockKeys);
      const deleteSpy = vi.spyOn(keysApi, 'delete').mockResolvedValue();

      render(<KeysPage />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith('1');
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

      vi.spyOn(keysApi, 'list').mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText('brave')).toBeInTheDocument();
        expect(screen.getByText('openai')).toBeInTheDocument();
      });
    });

    it('should format creation date', async () => {
      const mockKeys = [
        {
          id: '1',
          name: 'test-key',
          key: 'sk_abc123',
          providers: ['brave'],
          createdAt: '2026-01-31T10:30:00Z',
          isActive: true,
        },
      ];

      vi.spyOn(keysApi, 'list').mockResolvedValue(mockKeys);

      render(<KeysPage />);

      await waitFor(() => {
        // Should display date in human-readable format
        expect(screen.getByText(/2026|jan|31/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error', async () => {
      vi.spyOn(keysApi, 'list').mockRejectedValue(new Error('Network error'));

      render(<KeysPage />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });
});
