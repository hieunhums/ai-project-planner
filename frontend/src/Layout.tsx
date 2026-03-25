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


  const handleLogout = () => {
    clearPersona();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className={`layout ${isLogin ? 'login-layout' : ''}`}>
      {showNav && (
        <header className="layout-header">
          <div className="header-content">
            <Link to={ROUTES.projects} className="header-logo">
              <svg className="header-logo-icon" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0C12 0 5.5 4 2 8c4 2 10 4 18 4s14-2 18-4c-3.5-4-10-8-18-8z" fill="#003EFF" opacity="0.3"/>
                <path d="M20 6C12 6 5.5 10 2 14c4 2 10 4 18 4s14-2 18-4c-3.5-4-10-8-18-8z" fill="#003EFF" opacity="0.6"/>
                <path d="M20 12C12 12 5.5 16 2 20c4 2 10 4 18 4s14-2 18-4c-3.5-4-10-8-18-8z" fill="#003EFF"/>
              </svg>
              <span className="header-logo-text">Seatrium</span>
              <span className="header-logo-sub">AI Planner</span>
            </Link>

            <nav className="header-nav">
            </nav>

            <div className="header-right">
              {persona && (
                <>
                  <span className="header-persona">{persona}</span>
                  <button type="button" className="header-logout" onClick={handleLogout}>
                    Log out
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="layout-main">{children}</main>
      {showNav && (
        <footer className="layout-footer">
          <p>&copy; 2026 Seatrium Limited. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
};
