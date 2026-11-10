/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        slate: {
          950: '#070b13',
          900: '#0b0f19',
          850: '#111827',
          800: '#162032',
          750: '#1c283f',
          700: '#23324f',
          600: '#334155',
        }
      }
    },
  },
  plugins: [],
}
