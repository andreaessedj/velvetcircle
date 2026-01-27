/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cinzel"', 'serif'],
        sans: ['"Montserrat"', 'sans-serif'],
      },
      colors: {
        velvet: {
          900: '#2e0219',
          950: '#1a000d',
        },
        crimson: {
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          900: '#78350f',
        }
      }
    },
  },
  plugins: [],
}