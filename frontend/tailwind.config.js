/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          450: '#8595b0',
          550: '#566885',
          850: '#151e2e',
          955: '#060a13',
        }
      }
    },
  },
  plugins: [],
}
