import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          canvas: '#FAF8F4',
          surface: '#FFFFFF',
          sunken: '#F3EFE7',
          border: '#E7E2D9',
        },
        ink: {
          primary: '#1B2430',
          secondary: '#4B5563',
          muted: '#6B7280',
        },
        brand: {
          teal: '#0F5C5C',
          'teal-hover': '#0B4747',
          'teal-tint': '#E8F1F0',
          terracotta: '#D9663B',
          'terracotta-light': '#FFECE5',
        },
        semantic: {
          success: '#1F7A4D',
          'success-tint': '#E6F3EC',
          warning: '#8A5A00',
          'warning-tint': '#FBF0D6',
          error: '#B3392F',
          'error-tint': '#FBE7E4',
          info: '#2F5F9E',
          'info-tint': '#E6EEF8',
        },
      },
      fontFamily: {
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        control: '8px',
        badge: '6px',
      },
      boxShadow: {
        paper: '0 1px 3px rgba(27, 36, 48, 0.05)',
        modal: '0 12px 32px rgba(27, 36, 48, 0.12)',
        popover: '0 6px 20px rgba(27, 36, 48, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
