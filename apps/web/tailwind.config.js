/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a', // Primary Navy
          950: '#080d1a',
        },
        safar: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0f9d91', // Primary Teal
          600: '#087f76', // Deep Teal
          700: '#06635c',
          800: '#054e49',
          900: '#043b37',
          950: '#022421',
        },
        charcoal: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#334155',
          800: '#1f2937',
          900: '#0f172a', // Aligned with Primary Navy #0F172A
          950: '#080d1a',
        },
        warm: {
          50: '#FAF9F5',  // Warm editorial foundation #FAF9F5
          100: '#F5F4EF', // Light warm paper #F5F4EF
          150: '#EFECE4', // Soft border / container
          200: '#E6E3D8',
          300: '#D5D1C3',
          400: '#A8A495',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#D9A85C', // Vintage ticket gold / warm amber
          600: '#C08D38',
          700: '#9B6C24',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'Manrope', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        display: ['Plus Jakarta Sans', 'Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
