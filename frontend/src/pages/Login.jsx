import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to backend server. Please verify backend is running on port 5000.');
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center py-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="row w-100 align-items-center">
        <div className="col-md-6 d-none d-md-flex justify-content-center align-items-center">
          <img src="/img/camel.png" alt="Camel Mascot" className="img-fluid" style={{ maxHeight: '42vh', objectFit: 'contain' }} />
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="form-container w-100" style={{ maxWidth: '440px' }}>
            <h3 className="fw-bold mb-4">Sign in to Your <span className="title fw-bold">amaze</span> Account</h3>
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
              <button type="submit" disabled={loading} className="btn btn-primary w-100 rounded-pill fw-bold mb-3">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

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
