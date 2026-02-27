import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { ComparePage } from './pages/ComparePage';
import { IteratePage } from './pages/IteratePage';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectLandingPage } from './pages/ProjectLandingPage';
import { GanttPage } from './pages/GanttPage';
import { getPersona } from './services/session';
import { ROUTES } from './routes';
import './App.css';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const persona = getPersona();
  if (!persona) {
    return <Navigate to={ROUTES.login} replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route
            path={ROUTES.projects}
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.projectDetail}
            element={
              <ProtectedRoute>
                <ProjectLandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.gantt}
            element={
              <ProtectedRoute>
                <GanttPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.compare}
            element={
              <ProtectedRoute>
                <ComparePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.iterate}
            element={
              <ProtectedRoute>
                <IteratePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App
