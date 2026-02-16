import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from './pages/HomePage';
import { ComparePage } from './pages/ComparePage';
import { IteratePage } from './pages/IteratePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/iterate" element={<IteratePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App
