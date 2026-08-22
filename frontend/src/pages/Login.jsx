import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpenText } from '@phosphor-icons/react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 sm:px-6 lg:px-8 transition-colors duration-150 font-sans animate-fade-in">
      <div className="max-w-md w-full space-y-8 bg-brand-surface p-8 rounded-3xl shadow-xl border border-brand-border">
        <div className="text-center">
          <div className="inline-flex bg-brand-primary p-3 rounded-2xl text-white shadow-lg mb-4 transition-micro hover:scale-105">
            <BookOpenText className="w-8 h-8" weight="fill" />
          </div>
          <h2 className="text-3xl font-extrabold text-brand-textMain font-serif">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-brand-textMuted">
            Sign in to your Scriboral workspace
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
              required
            />
          </div>

          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 text-white font-semibold rounded-xl transition-micro shadow-lg flex items-center justify-center"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-brand-textMuted">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-brand-primary font-semibold hover:underline transition-micro">
              Create an account
            </Link>
          </p>
          <p className="text-xs">
            <Link to="/forgot-password" className="text-brand-textMuted hover:text-brand-primary transition-micro">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
