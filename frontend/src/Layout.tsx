import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from './routes';
import { clearPersona, getPersona } from './services/session';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const persona = getPersona();
  const isLogin = location.pathname === ROUTES.login;
  const showNav = !isLogin;
  const activePath = location.pathname;

  const handleLogout = () => {
    clearPersona();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className={`layout ${isLogin ? 'login-layout' : ''}`}>
      {showNav && (
        <header className="layout-header">
          <div className="header-content">
            <div>
              <h1>AI Planning Assistant</h1>
              <p className="subtitle">Shipyard & Port Logistics Planning for Seatrium</p>
            </div>
            {persona && (
              <div className="persona-actions">
                <div className="persona-pill">{persona}</div>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
          <nav className="header-nav">
            <Link className={activePath.startsWith(ROUTES.projects) ? 'active' : ''} to={ROUTES.projects}>
              Projects
            </Link>
            <Link className={activePath === ROUTES.compare ? 'active' : ''} to={ROUTES.compare}>
              Compare Plans
            </Link>
            <Link className={activePath === ROUTES.iterate ? 'active' : ''} to={ROUTES.iterate}>
              Iterate Constraints
            </Link>
          </nav>
        </header>
      )}
      <main className="layout-main">{children}</main>
      {showNav && (
        <footer className="layout-footer">
          <p>&copy; 2026 Seatrium - AI-Augmented Planning Demo</p>
        </footer>
      )}
    </div>
  );
};
