import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, HelpCircle, ArrowLeft, Check } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 sm:px-6 lg:px-8 transition-colors duration-150">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800">
        <div className="text-center">
          <div className="inline-flex bg-indigo-600 p-3 rounded-2xl text-white shadow-lg mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
            Password Recovery
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {success ? 'Success!' : step === 1 ? 'Enter email to retrieve security question' : 'Answer security question to reset password'}
          </p>
        </div>

        {success ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your password has been reset successfully! You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center font-medium"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={step === 1 ? handleInit : handleConfirm}>
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block" htmlFor="recovery-email">
                    Email Address
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all text-sm"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 text-xs p-3.5 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center"
                >
                  {loading ? 'Fetching question...' : 'Verify Email'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 flex items-start space-x-3 select-none">
                  <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Security Question</span>
                    <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 font-serif font-medium">{securityQuestion}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block" htmlFor="recovery-answer">
                    Your Answer
                  </label>
                  <input
                    id="recovery-answer"
                    type="text"
                    placeholder="Type answer here..."
                    value={securityAnswer}
                    onChange={e => setSecurityAnswer(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block" htmlFor="recovery-newpassword">
                    New Password
                  </label>
                  <input
                    id="recovery-newpassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all text-sm"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 text-xs p-3.5 rounded-xl">
                    {error}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    className="w-1/3 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all flex items-center justify-center space-x-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        <div className="text-center mt-6 select-none">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Remembered your password?{' '}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
