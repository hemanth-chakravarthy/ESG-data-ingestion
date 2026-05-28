import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import './Auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    organization_name: '',
  });
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      await register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        organization_name: form.organization_name,
      });
      navigate('/dashboard');
    } catch {
      // Error is handled in the store
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient" />
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="url(#logo-gradient-r)" />
                <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="logo-gradient-r" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#000000" />
                    <stop offset="1" stopColor="#222222" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start managing ESG data today</p>
          </div>

          {displayError && (
            <div className="auth-error" onClick={() => { clearError(); setLocalError(''); }}>
              <span className="auth-error-icon">!</span>
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name" className="form-label">First name</label>
                <input
                  id="first_name"
                  type="text"
                  className="form-input"
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="last_name" className="form-label">Last name</label>
                <input
                  id="last_name"
                  type="text"
                  className="form-input"
                  placeholder="Doe"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="organization_name" className="form-label">Organization</label>
              <input
                id="organization_name"
                type="text"
                className="form-input"
                placeholder="Acme Corp"
                value={form.organization_name}
                onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">Email address</label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-password" className="form-label">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password" className="form-label">Confirm</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-spinner" />
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>

        <p className="auth-brand">Breathe ESG · Data Ingestion Platform</p>
      </div>
    </div>
  );
}
