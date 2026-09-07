import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        // Below Tailwind's default `sm` (640px) — most phones in portrait
        // (360-420px) never hit `sm` at all, so anything that only had a
        // `sm:` responsive variant was effectively "always mobile-narrow"
        // on a real phone. `xs` gives a second, tighter breakpoint for
        // things (like FieldRow) that need to go single-column specifically
        // on the narrowest phones, not just "below tablet".
        xs: '420px',
      },
      colors: {
        brand: {
          50: '#f2f4ff',
          100: '#e6e9ff',
          200: '#c3caff',
          300: '#9fabff',
          400: '#5b6bff',
          500: '#3d4bfa',
          600: '#2c37d6',
          700: '#232ba8',
          800: '#1c227f',
          900: '#171b5e',
        },
        ink: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#d9dce4',
          300: '#b7bcc9',
          400: '#8e95a8',
          500: '#6b7288',
          600: '#525870',
          700: '#3f4358',
          800: '#2a2d3d',
          900: '#181a24',
          950: '#0f1117',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)',
        card: '0 2px 8px rgba(16,24,40,0.06), 0 8px 24px rgba(16,24,40,0.06)',
        pop: '0 12px 32px rgba(61,75,250,0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'pop-in': 'pop-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
