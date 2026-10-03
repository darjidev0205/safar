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
          50: '#FAF7F2',  // Warm ivory paper
          100: '#F5EFE6', // Soft parchment
          150: '#EFE6DA',
          200: '#E5DACB',
          300: '#D4C4B0',
          400: '#B09F89',
        },
        terracotta: {
          50: '#FDF6F3',
          100: '#FBECE7',
          200: '#F6D5CB',
          500: '#C86D51',
          600: '#B85D43',
          700: '#A84E36',
          800: '#8A3B26',
        },
        burgundy: {
          50: '#FBF3F4',
          100: '#F7E4E6',
          200: '#ECC5C9',
          600: '#722F37',
          700: '#661D28',
          800: '#541520',
          900: '#3D0F16',
        },
        sage: {
          50: '#F4F7F5',
          100: '#E8EFEA',
          200: '#D2DFD5',
          500: '#7E9A86',
          600: '#688571',
          700: '#546F5C',
          800: '#3F5645',
        },
        gold: {
          300: '#E4C999',
          400: '#D4B279',
          500: '#C49E64',
          600: '#B08B52',
          700: '#94723E',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#D9A85C',
          600: '#C08D38',
          700: '#9B6C24',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Playfair Display', 'DM Serif Display', 'Georgia', 'serif'],
        cormorant: ['Cormorant Garamond', 'Georgia', 'serif'],
        playfair: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Cormorant Garamond', 'Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};
