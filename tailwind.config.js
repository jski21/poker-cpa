/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        felt: {
          50: '#e8f3ee',
          100: '#c6e1d5',
          400: '#40916c',
          500: '#2d6a4f',
          600: '#1b4332',
          700: '#143728',
        },
        ink: {
          900: '#0b0f0d',
          800: '#11161300',
          850: '#0f1512',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
