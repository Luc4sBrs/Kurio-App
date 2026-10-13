/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        kurio: {
          dark: '#1A1512',
          darker: '#0F0B09',
          gold: '#C5A059',
          goldLight: '#E2C68A',
          goldDark: '#8E6D3B',
          accent: '#B28F4B',
          text: '#F5F5F5',
          muted: '#A19A94',
          background: '#050403',
        },
        borderRadius: {
          kurio: '12px',
          'kurio-sm': '8px',
          'kurio-lg': '16px',
        },
        boxShadow: {
          kurio: '0 4px 20px rgba(197, 160, 89, 0.15)',
          kurioHover: '0 8px 30px rgba(197, 160, 89, 0.25)',
          card: '0 4px 12px rgba(15, 11, 9, 0.4)',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        body: ['"Poppins"', 'sans-serif'],
      },
    },
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1440px',
      '2xl': '1536px',
    },
  },
  plugins: [require('@tailwindcss/typography')],
};