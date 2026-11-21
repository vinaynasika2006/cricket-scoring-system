/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          dark: '#0a0f1d',
          surface: '#111827',
          card: '#1e293b',
          border: '#334155',
          green: '#10b981',
          grass: '#059669',
          turf: '#047857',
          accent: '#22c55e',
          gold: '#eab308',
          red: '#ef4444',
          wide: '#3b82f6',
          noball: '#f97316'
        }
      }
    },
  },
  plugins: [],
}
