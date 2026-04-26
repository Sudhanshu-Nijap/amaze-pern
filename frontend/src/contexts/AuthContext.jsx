import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem('supabase_session');
    if (session) {
      setUser(JSON.parse(session).user);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('supabase_token', res.data.session.access_token);
    localStorage.setItem('supabase_session', JSON.stringify(res.data.session));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (firstName, lastName, email, password) => {
    const res = await api.post('/auth/register', { firstName, lastName, email, password });
    return res.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('supabase_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
