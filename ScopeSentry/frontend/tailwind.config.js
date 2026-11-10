/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#f7fafe',
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f1f4f8',
          variant: '#e0e3e7',
          dim: '#d7dade',
          bright: '#f7fafe'
        },
        'on-surface': '#181c1f',
        'on-surface-variant': '#434655',
        primary: {
          DEFAULT: '#004ac6',
          container: '#2563eb',
          hover: '#1d4ed8',
          fixed: '#dbe1ff'
        },
        secondary: {
          DEFAULT: '#505f7b',
          navy: '#0a1a33',
          container: '#ceddff'
        },
        tertiary: {
          DEFAULT: '#784b00',
          amber: '#f59e0b',
          container: '#ffeedd'
        },
        confirmed: {
          DEFAULT: '#16a34a',
          bg: 'rgba(22, 163, 74, 0.08)',
          border: 'rgba(22, 163, 74, 0.25)',
          text: '#15803d'
        },
        estimate: {
          DEFAULT: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.10)',
          border: 'rgba(245, 158, 11, 0.25)',
          text: '#b45309'
        },
        ai: {
          DEFAULT: '#7c3aed',
          bg: 'rgba(124, 58, 237, 0.08)',
          border: 'rgba(124, 58, 237, 0.25)',
          text: '#6d28d9'
        },
        danger: {
          DEFAULT: '#dc2626',
          bg: 'rgba(220, 38, 38, 0.08)',
          border: 'rgba(220, 38, 38, 0.25)',
          text: '#b91c1c'
        },
        border: {
          DEFAULT: '#e6ecf5',
          subtle: '#f1f5f9',
          focus: '#cbd5e1'
        }
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px'
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(10, 26, 51, 0.04), 0 1px 2px -1px rgba(10, 26, 51, 0.02)',
        raised: '0 8px 16px -4px rgba(10, 26, 51, 0.08), 0 2px 6px -2px rgba(10, 26, 51, 0.04)',
        modal: '0 20px 28px -6px rgba(10, 26, 51, 0.16), 0 8px 10px -4px rgba(10, 26, 51, 0.08)'
      }
    }
  },
  plugins: []
};
