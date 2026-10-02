/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        ink: '#1B1340',
        lavender: '#ECE4FC',
        surface: '#FAF7FE',
        violet: {
          DEFAULT: '#6C2BD9',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6C2BD9',
          900: '#581C87',
        },
        pink: {
          DEFAULT: '#FF3D81',
          hover: '#E62E6F',
        },
        sun: {
          DEFAULT: '#FFC93C',
          hover: '#EBB425',
        },
        mint: {
          DEFAULT: '#14D9A0',
          hover: '#0FC28E',
        },
        sky: {
          DEFAULT: '#22B8F0',
          hover: '#18A2D6',
        },
        coral: {
          DEFAULT: '#FF5A4E',
          hover: '#E6473B',
        },
      },
      borderColor: {
        DEFAULT: '#1B1340',
        ink: '#1B1340',
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px #1B1340',
        'neo': '4px 4px 0px #1B1340',
        'neo-hover': '5px 5px 0px #1B1340',
        'neo-active': '1px 1px 0px #1B1340',
        'neo-lg': '6px 6px 0px #1B1340',
        'neo-xl': '8px 8px 0px #1B1340',
      },
      borderWidth: {
        'neo': '2px',
      },
      borderRadius: {
        'neo-card': '14px',
        'neo-btn': '14px',
        'neo-input': '12px',
        'neo-avatar': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.25s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
