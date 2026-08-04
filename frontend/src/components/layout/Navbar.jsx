import React from 'react';
import { Sun, Moon, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-brand-surface text-brand-surfaceText border-b border-brand-border px-6 py-4 shadow-sm flex items-center justify-between transition-micro">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="bg-brand-primary p-2 rounded-xl text-white shadow-md">
          <BookOpen className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold font-serif text-brand-surfaceText">
          PublishFlow AI
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <span className="text-sm opacity-90">
            Welcome, <span className="font-semibold">{user.fullName || user.email}</span>
          </span>
        )}

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark/light theme"
          className="p-2 rounded-lg bg-brand-primary/20 hover:bg-brand-primary/40 text-brand-surfaceText transition-micro"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-brand-accent" /> : <Moon className="w-5 h-5 text-brand-accent" />}
        </button>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-micro flex items-center space-x-1"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
