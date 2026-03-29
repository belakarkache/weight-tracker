export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        app: {
          DEFAULT: 'var(--app-bg)',
          bg: 'var(--app-bg)',
          surface: 'var(--app-bg-surface)',
          elevated: 'var(--app-bg-elevated)',
          border: 'var(--app-border)',
          text: 'var(--app-text)',
          'text-muted': 'var(--app-text-muted)',
          'text-muted-2': 'var(--app-text-muted-2)',
        },
      },
      borderRadius: {
        app: 'var(--app-radius)',
        'app-sm': 'var(--app-radius-sm)',
        'app-lg': 'var(--app-radius-lg)',
      },
      keyframes: {
        'step-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'step-in': 'step-in 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
