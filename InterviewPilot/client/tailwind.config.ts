import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0F17',
        surface: {
          DEFAULT: '#111827',
          raised: '#1E293B',
          lowest: '#0A0E16',
        },
        border: {
          DEFAULT: '#1E293B',
          strong: '#334155',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: '#ADC6FF',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          light: '#4CD7F6',
        },
        tertiary: {
          DEFAULT: '#6366F1',
          light: '#C0C1FF',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      boxShadow: {
        'primary-glow': '0 0 16px rgba(59, 130, 246, 0.4)',
        'ai-glow': '0 0 24px -4px rgba(6, 182, 212, 0.25)',
        'modal-float': '0 20px 40px -15px rgba(2, 6, 23, 0.8), 0 0 0 1px rgba(51, 65, 85, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
