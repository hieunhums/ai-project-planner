import React from 'react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <h1>AI Planning Assistant</h1>
          <p className="subtitle">Shipyard & Port Logistics Planning for Seatrium</p>
        </div>
      </header>
      <main className="layout-main">{children}</main>
      <footer className="layout-footer">
        <p>&copy; 2026 Seatrium - AI-Augmented Planning Demo</p>
      </footer>
    </div>
  );
};
