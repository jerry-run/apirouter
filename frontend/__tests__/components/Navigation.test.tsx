import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navigation } from '../../src/components/Navigation';

describe('Navigation', () => {
  const mockOnPageChange = vi.fn();

  it('should render brand name', () => {
    render(<Navigation currentPage="keys" onPageChange={mockOnPageChange} />);

    expect(screen.getByText('APIRouter')).toBeInTheDocument();
  });

  it('should render all nav items', () => {
    render(<Navigation currentPage="keys" onPageChange={mockOnPageChange} />);

    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  it('should mark active page', () => {
    const { container } = render(
      <Navigation currentPage="keys" onPageChange={mockOnPageChange} />
    );

    const activeButtons = container.querySelectorAll('.nav-link.active');
    expect(activeButtons.length).toBeGreaterThan(0);
  });

  it('should call onPageChange when clicking nav item', () => {
    vi.clearAllMocks();

    render(<Navigation currentPage="keys" onPageChange={mockOnPageChange} />);

    const configLink = screen.getByText('Configuration').closest('button');
    fireEvent.click(configLink!);

    expect(mockOnPageChange).toHaveBeenCalledWith('config');
  });

  it('should display brand subtitle', () => {
    render(<Navigation currentPage="keys" onPageChange={mockOnPageChange} />);

    expect(screen.getByText('Multi-API Management')).toBeInTheDocument();
  });
});
