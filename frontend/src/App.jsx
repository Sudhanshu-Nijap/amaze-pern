import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Bestsellers from './pages/Bestsellers';
import Deals from './pages/Deals';
import SearchResult from './pages/SearchResult';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResult />} />
            <Route path="/result" element={<SearchResult />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bestsellers" element={<Bestsellers />} />
            <Route path="/deals" element={<Deals />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
