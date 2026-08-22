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
          primaryActive: 'var(--color-primary-active)',
          accent: 'var(--color-accent)',
          accentHover: 'var(--color-accent-hover)',
          danger: 'var(--color-danger)',
          dangerHover: 'var(--color-danger-hover)',
          warning: 'var(--color-warning-accent)',
          warningHover: 'var(--color-warning-hover)',
          info: 'var(--color-info)',
          infoHover: 'var(--color-info-hover)',
          bg: 'var(--color-background)',
          surface: 'var(--color-surface)',
          surfaceSecondary: 'var(--color-surface-secondary)',
          surfaceText: 'var(--color-surface-text)',
          textMain: 'var(--color-text-main)',
          textMuted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
          borderStrong: 'var(--color-border-strong)',
          focusRing: 'var(--color-focus-ring)',
          /* Sidebar-specific tokens */
          sidebarBg: 'var(--color-sidebar-bg)',
          sidebarText: 'var(--color-sidebar-text)',
          sidebarAccent: 'var(--color-sidebar-accent)',
          sidebarBorder: 'var(--color-sidebar-border)',
          sidebarHover: 'var(--color-sidebar-hover)',
          sidebarActive: 'var(--color-sidebar-active)',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
