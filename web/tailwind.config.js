module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#e15b26',
          light: '#ff804d',
          dark: '#b83f11'
        },
        surface: '#121212'
      },
      boxShadow: {
        soft: '0 4px 12px rgba(0,0,0,0.12)'
      }
    }
  },
  plugins: []
};
