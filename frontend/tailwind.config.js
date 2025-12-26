/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--color-background)',
          light: 'var(--color-background-light)',
          lighter: 'var(--color-background-lighter)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          light: 'var(--color-primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          dark: 'var(--color-secondary-dark)',
          light: 'var(--color-secondary-light)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          dark: 'var(--color-danger-dark)',
          light: 'var(--color-danger-light)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          dark: 'var(--color-success-dark)',
          light: 'var(--color-success-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          dark: 'var(--color-warning-dark)',
          light: 'var(--color-warning-light)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
      },
      fontFamily: {
        sans: ['Nunito', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

