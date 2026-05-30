/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          50: '#eef6f1',
          100: '#d3e8dd',
          200: '#a8d0bd',
          300: '#74b095',
          400: '#40916c',
          500: '#2d6a4f',
          600: '#1b4332',
          700: '#143728',
        },
      },
      fontFamily: {
        sans: [
          'Inter var',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.05)',
        'card-md': '0 4px 16px rgba(15, 23, 42, 0.08)',
        hero: '0 12px 32px -8px rgba(20, 55, 40, 0.45)',
      },
    },
  },
  plugins: [],
};
