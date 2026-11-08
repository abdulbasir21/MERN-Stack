/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f9f9ff',
        surface: {
          DEFAULT: '#f9f9ff',
          dim: '#d6dae5',
          bright: '#f9f9ff',
          lowest: '#ffffff',
          low: '#eff3ff',
          base: '#eaeef9',
          high: '#e4e8f3',
          highest: '#dee2ee',
        },
        primary: {
          DEFAULT: '#005c55',
          container: '#0f766e',
          foreground: '#ffffff',
          hover: '#115e59',
        },
        secondary: {
          DEFAULT: '#216963',
          container: '#a8ece5',
          foreground: '#ffffff',
        },
        tertiary: {
          DEFAULT: '#0047bf',
          container: '#1e5fe7',
          foreground: '#ffffff',
        },
        ink: {
          DEFAULT: '#171c24',
          muted: '#64748b',
        },
        outline: {
          DEFAULT: '#6e7977',
          variant: '#e5e7eb',
        },
        canvas: '#F6F5F0',
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
