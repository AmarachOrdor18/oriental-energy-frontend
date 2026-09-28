import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'line_manager' | 'hod' | 'admin' | 'finance';
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  manager_id?: string;
  manager_name?: string;
  can_create_projects: boolean;
  is_active: boolean;
  /** Pages this user may open: role defaults plus admin grants, minus denials. */
  pages?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** True when the user may open the given page (admin or page listed). */
  canAccess: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; }
    try {
      const userData = await api.me();
      setUser(userData);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('userRole', data.user.role);
    localStorage.setItem('userName', data.user.name);
    setUser(data.user);
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    setUser(null);
    // Replace history to prevent back-navigation
    window.history.replaceState(null, '', '/login');
  };

  const refreshUser = async () => {
    try {
      const userData = await api.me();
      setUser(userData);
    } catch { /* ignore */ }
  };

  const canAccess = (page: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true; // admins always pass
    if (!user.pages) return true; // permissions not loaded yet: don't flash-redirect
    return user.pages.includes(page);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
