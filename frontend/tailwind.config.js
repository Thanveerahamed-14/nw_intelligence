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
        sans: ['Chakra Petch', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      colors: {
        cyber: {
          void: '#02040a',
          panel: '#050a14',
          card: '#081020',
          surface: '#0c162b',
          border: '#0f2444',
          neonCyan: '#00f0ff',
          neonCrimson: '#ff0055',
          neonAmber: '#ffaa00',
          neonEmerald: '#00ff9d',
          neonPurple: '#b026ff',
        },
        slate: {
          950: '#02040a',
          900: '#050a14',
          850: '#081020',
          800: '#0c162b',
          700: '#142340',
        }
      }
    },
  },
  plugins: [],
}
