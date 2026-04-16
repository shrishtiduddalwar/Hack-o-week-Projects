/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',
          400: '#6ab4ff',
          500: '#3b9eff',
          600: '#1a82f7',
          700: '#0f68d8',
          900: '#0a3d87',
        },
        exam: {
          400: '#ff9f43',
          500: '#f7931a',
          600: '#e07c0c',
        },
        surface: {
          900: '#0b0f1a',
          800: '#111827',
          700: '#1d2535',
          600: '#252f42',
          500: '#2f3c56',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
