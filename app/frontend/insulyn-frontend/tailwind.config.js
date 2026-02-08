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
      },
    },
  },
  plugins: [],
}
