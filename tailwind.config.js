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
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        sidebar: 'var(--color-sidebar)',
        sidebar_hover: 'var(--color-sidebar-hover)',
        primary: 'var(--color-primary)',
        primary_dark: 'var(--color-primary-dark)',
        accent: 'var(--color-accent)',
        text_primary: 'var(--color-text-primary)',
        text_secondary: 'var(--color-text-secondary)',
        border: 'var(--color-border)',
        border_color: 'var(--color-border)',
        border_light: 'var(--color-border-light)',
        positive: 'var(--color-positive)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        ink: 'var(--color-ink)',
        success_light: 'var(--color-success-light)',
        success_text: 'var(--color-success-text)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 4px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
