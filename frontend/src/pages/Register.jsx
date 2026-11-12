import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await register(firstName, lastName, email, password);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to backend server. Please verify backend is running on port 5000.');
      } else {
        setError('Registration failed. Please check your details and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center py-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="row w-100 align-items-center">
        <div className="col-md-6 d-none d-md-flex justify-content-center align-items-center">
          <img src="/img/camel.png" alt="Camel Mascot" className="img-fluid" style={{ maxHeight: '42vh', objectFit: 'contain' }} />
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="form-container w-100" style={{ maxWidth: '460px' }}>
            <h3 className="fw-bold mb-3">Create a FREE <span className="title fw-bold">amaze</span> Account</h3>
            <p className="text-muted small mb-3">Boost your savings with smart Amazon price tracking</p>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-danger py-2 px-3 small d-flex align-items-center" role="alert">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  <div>{error}</div>
                </div>
              )}
              {success && (
                <div className="alert alert-success py-2 px-3 small d-flex align-items-center" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  <div>{success}</div>
                </div>
              )}
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small mb-1 fw-medium">First Name</label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm border border-secondary rounded-pill px-3"
                    placeholder="First name" 
                    name="first_name" 
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required 
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small mb-1 fw-medium">Last Name</label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm border border-secondary rounded-pill px-3"
                    placeholder="Last name" 
                    name="last_name" 
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label small mb-1 fw-medium">Email Address</label>
                <input 
                  type="email" 
                  className="form-control form-control-sm border border-secondary rounded-pill px-3"
                  placeholder="Enter your email" 
                  name="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="mb-3">
                <label className="form-label small mb-1 fw-medium">Password</label>
                <input 
                  type="password" 
                  className="form-control form-control-sm border border-secondary rounded-pill px-3"
                  placeholder="Create password" 
                  name="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary w-100 rounded-pill fw-bold mb-3">
                {submitting ? 'Creating Account...' : 'Create my account'}
              </button>

              <p className="text-center mt-2">
                Already have an account? <Link to="/login" className="text-primary text-decoration-none">Sign in to your amaze account</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
