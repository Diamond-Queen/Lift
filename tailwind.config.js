/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.{css}'
  ],
  theme: {
    extend: {
      colors: {
        accent: '#D4AF37'
      },
      fontFamily: {
        inter: ['Inter','ui-sans-serif','system-ui','-apple-system','Segoe UI','Roboto','Helvetica Neue','Arial']
      }
    }
  },
  plugins: []
}

