/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  plugins: [
    require('@tailwindcss/typography'),
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3D298D'          // your 3-digit code colour
      },
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui'],
      }
    }
  },
  plugins: [],
}