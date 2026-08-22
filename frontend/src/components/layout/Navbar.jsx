import React from 'react';
import { Sun, Moon, SignOut, BookOpenText } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const { user, logout } = useAuth();
  // Using theme/toggleTheme if that is what the original had, or fallback to mode/toggleMode 
  const { mode: theme, toggleMode: toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-brand-surface text-brand-surfaceText border-b border-brand-border px-6 py-4 shadow-sm flex items-center justify-between transition-micro animate-fade-in">
      <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate('/dashboard')}>
        <div className="bg-brand-primary p-2 rounded-xl text-white shadow-md group-hover:bg-brand-primaryHover transition-micro">
          <BookOpenText weight="fill" className="w-5 h-5 text-brand-accent" />
        </div>
        <span className="text-xl font-bold font-serif text-brand-surfaceText">
          Scriboral
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <span className="text-sm font-sans opacity-90 text-brand-textMain">
            Welcome, <span className="font-semibold">{user.fullName || user.email}</span>
          </span>
        )}

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark/light theme"
          className="p-2 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-surfaceText transition-micro"
        >
          {theme === 'dark' ? <Sun weight="fill" className="w-5 h-5 text-brand-accent" /> : <Moon weight="fill" className="w-5 h-5 text-brand-accent" />}
        </button>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-brand-danger hover:bg-brand-danger/10 transition-micro flex items-center space-x-1"
          title="Logout"
        >
          <SignOut weight="bold" className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
