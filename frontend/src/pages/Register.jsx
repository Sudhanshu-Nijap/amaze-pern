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
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="row w-100">
        <div className="col-md-6 d-none d-md-flex justify-content-end align-items-end">
          <img src="/img/camel.png" alt="Camel Mascot" className="img-fluid" style={{ maxHeight: '50vh' }} />
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="form-container">
            <h3 className="fw-bold">Create a FREE <span className="title fw-bold">amaze</span> Account <br /> and Boost Your
              Savings at Amazon!</h3>
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
              <div className="mb-3 mt-3">
                <label className="form-label">First Name</label>
                <input 
                  type="text" 
                  className="form-control border border-secondary rounded-pill"
                  placeholder="Enter your first name" 
                  name="first_name" 
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input 
                  type="text" 
                  className="form-control border border-secondary rounded-pill"
                  placeholder="Enter your last name" 
                  name="last_name" 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required 
                />
              </div>
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
              <button type="submit" disabled={submitting} className="btn btn-primary w-100 rounded-pill fw-bold mb-3">
                {submitting ? 'Creating Account...' : 'Create my account'}
              </button>
              
              <a href="#" className="btn-orange text-decoration-none w-100 rounded-pill fw-bold mb-3 d-flex align-items-center justify-content-center">
                <i className="fab fa-google me-2"></i> Sign in with Google
              </a>

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
