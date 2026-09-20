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
        /* ── Brand ramp (ValuAlliance-derived teal green) ── */
        teal: {
          50: 'hsl(var(--teal-50))',
          100: 'hsl(var(--teal-100))',
          200: 'hsl(var(--teal-200))',
          300: 'hsl(var(--teal-300))',
          400: 'hsl(var(--teal-400))',
          500: 'hsl(var(--teal-500))',
          600: 'hsl(var(--teal-600))',
          700: 'hsl(var(--teal-700))',
          800: 'hsl(var(--teal-800))',
          900: 'hsl(var(--teal-900))',
          950: 'hsl(var(--teal-950))',
        },
        gold: {
          100: 'hsl(var(--gold-100))',
          300: 'hsl(var(--gold-300))',
          400: 'hsl(var(--gold-400))',
          500: 'hsl(var(--gold-500))',
          600: 'hsl(var(--gold-600))',
        },
        /* ── Semantic tokens (existing OE names, kept for compat) ── */
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
        sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'card': 'var(--shadow-sm)',
        'panel': 'var(--shadow-md)',
        'float': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}
