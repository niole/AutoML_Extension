/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        domino: {
          bg: {
            primary: 'var(--domino-bg-primary)',
            secondary: 'var(--domino-bg-secondary)',
            tertiary: 'var(--domino-bg-tertiary)',
            hover: 'var(--domino-bg-hover)',
          },
          text: {
            primary: 'var(--domino-text-primary)',
            secondary: 'var(--domino-text-secondary)',
            muted: 'var(--domino-text-muted)',
          },
          primary: {
            DEFAULT: '#3B3BD3',
            hover: '#2E2EA8',
            active: '#24247D',
          },
          secondary: {
            surface: '#EDECFB',
            border: '#C9C5F2',
            text: '#1820A0',
          },
          accent: {
            green: '#28A464',
            yellow: '#CCB718',
            red: '#C20A29',
            purple: '#3B3BD3',
            'purple-hover': '#2E2EA8',
            'purple-light': '#EDECFB',
            'purple-dark': '#1820A0',
            info: '#0070CC',
          },
          success: '#28A464',
          warning: '#CCB718',
          danger: '#C20A29',
          info: '#0070CC',
          border: {
            DEFAULT: 'var(--domino-border)',
            muted: 'var(--domino-border-muted)',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Lato', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '8px',
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
