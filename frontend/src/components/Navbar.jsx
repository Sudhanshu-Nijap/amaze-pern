import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?url=${encodeURIComponent(url)}`);
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-sm">
      <div className="container d-flex align-items-center">
        <Link to="/" className="fw-bold text-dark text-decoration-none me-3">
          <h2 className="display-4 fw-bold title m-0">amaze</h2>
        </Link>
        {user && (
          <form onSubmit={handleSearch} className="d-flex flex-grow-1 search-container">
            <input 
              className="form-control search-bar rounded-pill shadow-sm px-3 me-3" 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter Amazon URL or ASIN" 
              required 
              aria-label="Search" 
            />
            <button type="submit" className="btn-orange">Search</button>
          </form>
        )}
        <button className="navbar-toggler ms-3 d-lg-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            {user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-dark fw-semibold" to="/dashboard">Your Price Watches</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-dark fw-semibold" to="/bestsellers">Bestsellers</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-dark fw-semibold" to="/deals">Today's Deals</Link>
                </li>
              </>
            )}
            <li className="nav-item d-flex align-items-center gap-2">
              {user ? (
                <>
                  <span className="text-dark fw-semibold me-2">{user.user_metadata?.first_name} {user.user_metadata?.last_name}</span>
                  <button onClick={logout} className="btn-orange border-0">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-orange text-decoration-none">Sign Up</Link>
                  <Link to="/login" className="btn fw-semibold text-dark text-decoration-none">Sign In</Link>
                </>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
