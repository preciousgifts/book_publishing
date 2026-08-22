import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpenText, Question, ArrowLeft, Check } from '@phosphor-icons/react';
import client from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await client.post('/auth/reset-password-init', { email });
      if (res.data.success) {
        setSecurityQuestion(res.data.data.securityQuestion);
        setStep(2);
      } else {
        throw new Error(res.data.error || 'Failed to fetch question');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await client.post('/auth/reset-password-confirm', {
        email,
        securityAnswer,
        newPassword
      });

      if (res.data.success) {
        setSuccess(true);
      } else {
        throw new Error(res.data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
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
            Password Recovery
          </h2>
          <p className="mt-2 text-sm text-brand-textMuted">
            {success ? 'Success!' : step === 1 ? 'Enter email to retrieve security question' : 'Answer security question to reset password'}
          </p>
        </div>

        {success ? (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brand-accent/20 text-brand-accent">
              <Check className="h-6 w-6" weight="bold" />
            </div>
            <p className="text-sm text-brand-textMuted">
              Your password has been reset successfully! You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="w-full py-3 bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold rounded-xl transition-micro shadow-lg flex items-center justify-center font-medium"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={step === 1 ? handleInit : handleConfirm}>
            {step === 1 ? (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="recovery-email">
                    Email Address
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                  {loading ? 'Fetching question...' : 'Verify Email'}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-4 flex items-start space-x-3 select-none">
                  <Question className="w-5 h-5 text-brand-primary mt-0.5" weight="fill" />
                  <div>
                    <span className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider block">Security Question</span>
                    <p className="text-sm text-brand-textMain mt-1 font-serif font-medium">{securityQuestion}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="recovery-answer">
                    Your Answer
                  </label>
                  <input
                    id="recovery-answer"
                    type="text"
                    placeholder="Type answer here..."
                    value={securityAnswer}
                    onChange={e => setSecurityAnswer(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-textMuted block" htmlFor="recovery-newpassword">
                    New Password
                  </label>
                  <input
                    id="recovery-newpassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-brand-textMain rounded-xl p-3 outline-none focus:border-brand-primary transition-micro text-sm"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3.5 rounded-xl">
                    {error}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    className="w-1/3 py-3 border border-brand-border text-brand-textMuted hover:bg-brand-bg rounded-xl transition-micro flex items-center justify-center space-x-1"
                  >
                    <ArrowLeft className="w-4 h-4" weight="bold" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3 bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold rounded-xl transition-micro shadow-lg flex items-center justify-center"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        <div className="text-center mt-6 select-none">
          <p className="text-xs text-brand-textMuted">
            Remembered your password?{' '}
            <Link to="/login" className="text-brand-primary font-semibold hover:underline transition-micro">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
