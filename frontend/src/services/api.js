import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if this was an authenticated request, not login/register itself!
    const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    if (error.response && error.response.status === 401 && !isAuthRoute) {
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('supabase_session');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
