import { useQuery } from '@tanstack/react-query'
import { Layout } from './Layout'
import { HomePage } from './pages/HomePage'
import './App.css'

function App() {
  return (
    <Layout>
      <HomePage />
    </Layout>
  )
}

export default App
