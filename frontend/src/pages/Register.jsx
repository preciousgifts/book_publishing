import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpenText } from '@phosphor-icons/react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('What was the name of your first pet?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await register(email, password, fullName, securityQuestion, securityAnswer);
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
            Create Account
          </h2>
          <p className="mt-2 text-sm text-brand-textMuted">
            Sign up to start publishing book manuscripts
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="reg-name">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              placeholder="Alex Mercer"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="reg-email">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="alex@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="reg-question">
              Security Question
            </label>
            <select
              id="reg-question"
              value={securityQuestion}
              onChange={e => setSecurityQuestion(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
              required
            >
              <option value="What was the name of your first pet?">What was the name of your first pet?</option>
              <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
              <option value="In what city were you born?">In what city were you born?</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="reg-answer">
              Security Answer
            </label>
            <input
              id="reg-answer"
              type="text"
              placeholder="Your answer..."
              value={securityAnswer}
              onChange={e => setSecurityAnswer(e.target.value)}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-brand-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary font-semibold hover:underline transition-micro">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
