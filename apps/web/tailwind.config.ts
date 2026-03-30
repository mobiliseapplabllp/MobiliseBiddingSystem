import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F3557',
          dark: '#071F35',
          hover: '#1A4A73',
          light: '#E8F0F8',
        },
        accent: '#2563EB',
        'accent-dark': '#1D4ED8',
        'accent-light': '#EFF6FF',
        'bg-page': '#F8FAFC',
        'bg-surface': '#FFFFFF',
        'bg-subtle': '#F1F5F9',
        'bg-surface-hover': '#F8FAFC',
        border: '#E2E8F0',
        'border-subtle': '#F1F5F9',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'text-muted': '#94A3B8',
        'text-disabled': '#94A3B8',
        success: {
          DEFAULT: '#059669',
          light: '#ECFDF5',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FFFBEB',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
        },
        info: {
          DEFAULT: '#2563EB',
          light: '#EFF6FF',
        },
        'auction-live': '#DC2626',
        'rank-up': '#059669',
        'rank-down': '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'page-title': ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }],
        'section-title': ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        'sub-section': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        'auction-timer': ['3rem', { lineHeight: '1', fontWeight: '700' }],
        'bid-amount': ['1.25rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0,0,0,0.04)',
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 6px 16px 0 rgba(0,0,0,0.10), 0 2px 6px -1px rgba(0,0,0,0.06)',
        dropdown: '0 4px 16px 0 rgba(0,0,0,0.10), 0 2px 6px -1px rgba(0,0,0,0.06)',
        modal: '0 20px 60px 0 rgba(0,0,0,0.18), 0 8px 20px -4px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
