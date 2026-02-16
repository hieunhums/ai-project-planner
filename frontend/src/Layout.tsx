import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <h1>AI Planning Assistant</h1>
          <p className="subtitle">Shipyard & Port Logistics Planning for Seatrium</p>
        </div>
        <nav className="header-nav">
          <Link className={location.pathname === '/' ? 'active' : ''} to="/">
            Upload & Generate
          </Link>
          <Link className={location.pathname === '/compare' ? 'active' : ''} to="/compare">
            Compare Plans
          </Link>
          <Link className={location.pathname === '/iterate' ? 'active' : ''} to="/iterate">
            Iterate Constraints
          </Link>
        </nav>
      </header>
      <main className="layout-main">{children}</main>
      <footer className="layout-footer">
        <p>&copy; 2026 Seatrium - AI-Augmented Planning Demo</p>
      </footer>
    </div>
  );
};
