import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('renders heading', () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ status: 'ok' }) })
    ));

    render(<App />);
    const heading = screen.getByRole('heading', { name: /APIRouter/i });
    expect(heading).toBeInTheDocument();
  });
});
