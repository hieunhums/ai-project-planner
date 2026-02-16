import { useQuery } from '@tanstack/react-query'
import { Layout } from './Layout'
import { api } from './services/api'
import './App.css'

function App() {
  // Test API connection with health check
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: api.healthCheck,
  })

  return (
    <Layout>
      <div className="app-content">
        <div className="status-card">
          <h2>System Status</h2>
          {isLoading && <p>Checking system status...</p>}
          {error && <p className="error">Failed to connect to backend: {String(error)}</p>}
          {health && (
            <div className="status-details">
              <div className="status-item">
                <span className="label">Overall Status:</span>
                <span className={`value status-${health.status}`}>{health.status}</span>
              </div>
              <div className="status-item">
                <span className="label">Database:</span>
                <span className="value">{health.database}</span>
              </div>
              <div className="status-item">
                <span className="label">AI Service:</span>
                <span className="value">{health.ai_service}</span>
              </div>
            </div>
          )}
        </div>

        <div className="info-card">
          <h2>Phase 2: Foundation Complete ✅</h2>
          <p>The core infrastructure is now ready:</p>
          <ul>
            <li>✅ Backend API with FastAPI</li>
            <li>✅ Database models with SQLAlchemy</li>
            <li>✅ Request/response validation with Pydantic</li>
            <li>✅ File storage and lineage tracking</li>
            <li>✅ Frontend API client with TanStack Query</li>
            <li>✅ TypeScript type definitions</li>
            <li>✅ Error handling and logging</li>
          </ul>
          <p className="next-phase">
            <strong>Next:</strong> Phase 3 - Upload Planning Data and Generate AI Plan
          </p>
        </div>
      </div>
    </Layout>
  )
}

export default App
