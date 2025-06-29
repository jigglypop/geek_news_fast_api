/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'pretendard': ['Pretendard', 'system-ui', 'sans-serif'],
        'blackhan': ['BlackHanSans', 'system-ui', 'sans-serif'],
        'sans': ['Pretendard', 'system-ui', 'sans-serif'],
      },
      animation: {
        'hover-lift': 'hover-lift 0.2s ease-in-out',
      },
      keyframes: {
        'hover-lift': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        }
      }
    },
  },
  plugins: [],
} 