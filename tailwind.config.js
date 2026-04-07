/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          50: 'color-mix(in srgb, var(--color-primary, #eff6ff), white 90%)',
          100: 'color-mix(in srgb, var(--color-primary, #dbeafe), white 80%)',
          200: 'color-mix(in srgb, var(--color-primary, #bfdbfe), white 60%)',
          300: 'color-mix(in srgb, var(--color-primary, #93c5fd), white 40%)',
          400: 'color-mix(in srgb, var(--color-primary, #60a5fa), white 20%)',
          500: 'color-mix(in srgb, var(--color-primary, #3b82f6), black 10%)',
          600: 'var(--color-primary, #2563eb)',
          700: 'var(--color-secondary, #1d4ed8)',
          800: 'color-mix(in srgb, var(--color-secondary, #1e40af), black 20%)',
          900: 'color-mix(in srgb, var(--color-secondary, #1e3a8a), black 40%)',
          950: 'color-mix(in srgb, var(--color-secondary, #172554), black 60%)',
        }
      },
      fontFamily: {
        sans: ['var(--font-family, "Inter")', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
