import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';
import { getPersona, setPersona, Persona } from '../services/session';
import './LoginPage.css';

const personaOptions: { key: Persona; title: string; detail: string }[] = [
  {
    key: 'planner',
    title: 'Planner',
    detail: 'Upload schedules, generate plans, and compare outcomes.',
  },
  {
    key: 'admin',
    title: 'Admin',
    detail: 'Oversee project status and validate plan readiness.',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const persona = getPersona();
    if (persona) {
      navigate(ROUTES.projects, { replace: true });
    }
  }, [navigate]);

  const handleSelect = (persona: Persona) => {
    setPersona(persona);
    navigate(ROUTES.projects, { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-hero">
          <div className="login-badge">AI Planning Demo</div>
          <h1>Welcome to the Planning Hub</h1>
          <p>
            Choose a persona to enter the workspace. Both routes lead to the same demo
            experience, so pick the view that fits your story.
          </p>
        </div>
        <div className="login-card">
          <h2>Select a persona</h2>
          <div className="persona-grid">
            {personaOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className="persona-option"
                onClick={() => handleSelect(option.key)}
              >
                <div>
                  <span className="persona-title">{option.title}</span>
                  <span className="persona-detail">{option.detail}</span>
                </div>
                <span className="persona-action">Enter</span>
              </button>
            ))}
          </div>
          <div className="login-note">
            Demo personas do not require credentials. Your selection is stored locally.
          </div>
        </div>
      </div>
    </div>
  );
};
