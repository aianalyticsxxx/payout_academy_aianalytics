/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FFD608',
          50: '#FFFCE5',
          100: '#FFF9CC',
          200: '#FFF399',
          300: '#FFEC66',
          400: '#FFE633',
          500: '#FFD608',
          600: '#CCB000',
          700: '#998400',
          800: '#665800',
          900: '#332C00',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
