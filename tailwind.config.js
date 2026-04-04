/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'merkez-blue': '#4285F4',
        'merkez-red': '#EA4335',
        'merkez-yellow': '#FBBC05',
        'merkez-green': '#34A853',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
