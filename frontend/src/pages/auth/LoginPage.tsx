import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import './Auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch {
      // Error is handled in the store
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient" />
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="url(#logo-gradient)" />
                <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#000000" />
                    <stop offset="1" stopColor="#222222" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your ESG platform</p>
          </div>

          {error && (
            <div className="auth-error" onClick={clearError}>
              <span className="auth-error-icon">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-spinner" />
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">Create one</Link>
          </p>
        </div>

        <p className="auth-brand">Breathe ESG · Data Ingestion Platform</p>
      </div>
    </div>
  );
}
