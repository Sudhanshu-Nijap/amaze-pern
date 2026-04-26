import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="row w-100">
        <div className="col-md-6 d-none d-md-flex justify-content-end align-items-end">
          <img src="/img/camel.png" alt="Camel Mascot" className="img-fluid" style={{ maxHeight: '50vh' }} />
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="form-container">
            <h3 className="fw-bold mb-5">Sign in to Your <span className="title fw-bold">amaze</span> Account</h3>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control border border-secondary rounded-pill"
                  placeholder="Enter your email" 
                  name="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control border border-secondary rounded-pill"
                  placeholder="Enter your password" 
                  name="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold mb-3">Sign In</button>
              
              {/* Note: Google Login might require Supabase Auth specific implementation, 
                  leaving the layout as requested */}
              <a href="#" className="btn-orange text-decoration-none w-100 rounded-pill fw-bold mb-3 d-flex align-items-center justify-content-center">
                <i className="fab fa-google me-2"></i> Sign in with Google
              </a>

              <p className="text-center mt-2">
                Don't have an account?
                <Link to="/register" className="text-primary text-decoration-none ms-1">
                  Create a Free Account
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
