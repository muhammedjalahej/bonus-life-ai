/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring': 'pulse-ring 3s ease-in-out infinite',
        'orbit': 'orbit 20s linear infinite',
        'fade-in-up': 'fade-in-up 0.7s ease-out both',
        'float': 'float 6s ease-in-out infinite',
        'star-btn': 'star-btn calc(var(--duration, 3) * 1s) linear infinite',
      },
      keyframes: {
        'star-btn': {
          '0%':   { offsetDistance: '0%' },
          '100%': { offsetDistance: '100%' },
        },
        'shine-pulse': {
          '0%':   { 'background-position': '0% 0%' },
          '50%':  { 'background-position': '100% 100%' },
          '100%': { 'background-position': '0% 0%' },
        },
      },
    },
  },
  plugins: [],
}
