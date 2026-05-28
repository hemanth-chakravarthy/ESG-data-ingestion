import { create } from 'zustand';
import api from '../lib/api';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'ANALYST';
  organization: Organization;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    organization_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('tokens'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login/', { email, password });
      localStorage.setItem('tokens', JSON.stringify(res.data.tokens));
      localStorage.setItem('user', JSON.stringify(res.data.user));
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.email?.[0] ||
        'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register/', data);
      localStorage.setItem('tokens', JSON.stringify(res.data.tokens));
      localStorage.setItem('user', JSON.stringify(res.data.user));
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message =
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        'Registration failed. Please try again.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      const tokens = localStorage.getItem('tokens');
      if (tokens) {
        const { refresh } = JSON.parse(tokens);
        await api.post('/auth/logout/', { refresh });
      }
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me/');
      localStorage.setItem('user', JSON.stringify(res.data));
      set({ user: res.data, isAuthenticated: true });
    } catch {
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
