import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <header className="app-header">
          <h1>AI Planning Assistant</h1>
          <p>Shipyard & Port Logistics Planning for Seatrium</p>
        </header>
        <main className="app-main">
          <p>Setup complete - Ready for Phase 2 implementation</p>
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
