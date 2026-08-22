import React, { useEffect, useState } from 'react';

const SPLASH_MIN_MS = 1500;

export function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const letters = "Scriboral".split('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 300); // Wait for fade out animation
    }, SPLASH_MIN_MS);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-bg bg-gradient-to-br from-brand-bg to-brand-surface transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center justify-center space-x-1 mb-4">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="text-5xl md:text-7xl font-bold font-serif text-brand-textMain animate-fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both'
            }}
          >
            {letter}
          </span>
        ))}
      </div>
      <p 
        className="text-sm md:text-base font-sans text-brand-textMuted animate-fade-in"
        style={{
          animationDelay: `${letters.length * 100 + 200}ms`,
          animationFillMode: 'both'
        }}
      >
        Build better books, from first idea to final draft.
      </p>
    </div>
  );
}
