module.exports = {
  content: [
    "./pages/**/*.{html,js,jsx,ts,tsx}",
    "./components/**/*.{html,js,jsx,tsx,ts}"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/line-clamp')
  ],
}
