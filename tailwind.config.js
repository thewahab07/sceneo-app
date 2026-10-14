/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Accent: tomato
        accent: { DEFAULT: '#FF6347', soft: '#FF8A73' },
        // Dark: pure black background with #171717 surfaces
        ink: { DEFAULT: '#000000', soft: '#0f0f0f', card: '#171717', line: '#2a2a2a' },
        // Light: warm off-white
        paper: { DEFAULT: '#faf8f7', soft: '#f1eeec', card: '#ffffff', line: '#e8e3e0' },
      },
    },
  },
  plugins: [],
};
