/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--color-primary)',
          primaryHover: 'var(--color-primary-hover)',
          accent: 'var(--color-accent)',
          warning: 'var(--color-warning-accent)',
          info: 'var(--color-info)',
          bg: 'var(--color-background)',
          surface: 'var(--color-surface)',
          surfaceText: 'var(--color-surface-text)',
          textMain: 'var(--color-text-main)',
          textMuted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
