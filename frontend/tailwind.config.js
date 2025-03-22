module.exports = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          50: '#eff6ff',
          100: '#dbeafe',
          // ... other shades
        },
        secondary: {
          DEFAULT: '#60a5fa',
          // ... other shades
        }
      },
      gridTemplateColumns: {
        'chart-grid': 'repeat(auto-fit, minmax(400px, 1fr))'
      }
    }
  }
}