import { useState } from 'react';
import '../styles/Navigation.css';

export interface NavigationProps {
  currentPage: 'keys' | 'config' | 'stats';
  onPageChange: (page: 'keys' | 'config' | 'stats') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'keys', label: 'API Keys', icon: '🔑' },
    { id: 'config', label: 'Configuration', icon: '⚙️' },
    { id: 'stats', label: 'Statistics', icon: '📊' },
  ] as const;

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>APIRouter</h1>
          <p>Multi-API Management</p>
        </div>

        <button
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>

        <ul className={`nav-items ${mobileMenuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => {
                  onPageChange(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
