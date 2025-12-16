/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium color palette
        primary: {
          DEFAULT: '#FF6B6B',
          50: '#FFE5E5',
          100: '#FFCCCC',
          200: '#FF9999',
          300: '#FF6B6B',
          400: '#FF4D4D',
          500: '#FF3333',
          600: '#E60000',
          700: '#CC0000',
          800: '#990000',
          900: '#660000',
        },

        success: {
          DEFAULT: '#4ECDC4',
          light: '#9FE2DD',
          dark: '#44A08D',
        },

        warning: {
          DEFAULT: '#FFE66D',
          light: '#FFF4B8',
          dark: '#F6C542',
        },

        error: {
          DEFAULT: '#F5576C',
          light: '#FFA8B4',
          dark: '#E83A50',
        },

        // Surfaces - Light
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FAFAFA',
          container: '#F5F5F5',
        },

        // Surfaces - Dark
        'dark-surface': {
          DEFAULT: '#0A0A0A',
          elevated: '#141414',
          container: '#1E1E1E',
        },

        // Text
        'on-surface': '#1A1A1A',
        'on-surface-variant': '#666666',
        'dark-surface-on': '#F5F5F5',
        'dark-surface-variant': '#B0B0B0',

        // Accents
        tertiary: '#A78BFA',
        background: '#FAFAFA',
        'dark-background': '#000000',
      },

      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'hero': ['96px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display': ['36px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },

      boxShadow: {
        'sm': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'md': '0 6px 12px -2px rgba(0, 0, 0, 0.08), 0 3px 6px -1px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 20px -3px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(255, 107, 107, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5)',
        'glow-sm': '0 0 10px rgba(255, 107, 107, 0.2)',
      },

      borderRadius: {
        'DEFAULT': '16px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '32px',
      },

      backdropBlur: {
        'xs': '2px',
        'DEFAULT': '8px',
      },

      animation: {
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
