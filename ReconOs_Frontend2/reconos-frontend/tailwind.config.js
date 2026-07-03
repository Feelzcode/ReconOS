/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: '#E5E7EB',
        input: '#F9FAFB',
        ring: '#111827',
        background: '#F9FAFB',
        foreground: '#111827',
        primary: {
          DEFAULT: '#111827',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F3F4F6',
          foreground: '#374151',
        },
        muted: {
          DEFAULT: '#F9FAFB',
          foreground: '#6B7280',
        },
        accent: {
          DEFAULT: '#F3F4F6',
          foreground: '#111827',
        },
        success: {
          DEFAULT: '#059669',
          bg: '#ECFDF5',
          text: '#065F46',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FFFBEB',
          text: '#92400E',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
          text: '#991B1B',
        },
        info: {
          DEFAULT: '#2563EB',
          bg: '#EFF6FF',
          text: '#1E40AF',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};
