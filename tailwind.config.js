/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff1ec',
          100: '#ffd8c7',
          200: '#ffb08f',
          300: '#ff8758',
          400: '#ff6430',
          500: '#ff4a1a',
          600: '#e73b0f',
          700: '#bf2f0b',
          800: '#8f220a',
          900: '#621707',
        },
        slate: {
          950: '#020B18',
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(255,74,26,0.08) 1px, transparent 1px), linear-gradient(to right, rgba(255,74,26,0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.08)', opacity: '0.2' },
        },
        'float-logo': {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-8px) scale(1.03)' },
        },
        'float-logo-slow': {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(10px) scale(1.06)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease forwards',
        'fade-up-slow': 'fade-up 0.7s ease forwards',
        'fade-in': 'fade-in 0.4s ease forwards',
        'slide-right': 'slide-right 0.5s ease forwards',
        'pulse-ring': 'pulse-ring 2.5s ease-in-out infinite',
        'float-logo': 'float-logo 8s ease-in-out infinite',
        'float-logo-slow': 'float-logo-slow 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
