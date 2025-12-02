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
        // Deep teal brand palette (PlayerProfit-inspired)
        brand: {
          DEFAULT: '#14B8A6',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        // Custom colors for premium dark theme
        dark: '#0A0A0A',
        charcoal: '#0A0A0A',
        surface: '#111111',
        'surface-light': '#1A1A1A',
        cream: '#FFFBF0',
        gold: '#D4AF37',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(20, 184, 166, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.5)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-teal': 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)',
        'gradient-teal-dark': 'linear-gradient(180deg, #14B8A6 0%, #0D9488 100%)',
      },
    },
  },
  plugins: [],
};
