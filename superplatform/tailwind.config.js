/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c',800:'#9a3412',900:'#7c2d12' },
        dark:  { 950:'#060609',900:'#0a0a0f',800:'#111118',700:'#18181f',600:'#1f1f28',500:'#2a2a35' }
      },
      fontFamily: {
        display: ['"Playfair Display"','Georgia','serif'],
        body:    ['"DM Sans"','system-ui','sans-serif'],
      },
      animation: {
        'fade-up':'fadeUp 0.55s ease both',
        'fade-in':'fadeIn 0.4s ease both',
        'slide-in':'slideIn 0.5s cubic-bezier(.22,1,.36,1) both',
      },
      keyframes: {
        fadeUp:  {'0%':{opacity:'0',transform:'translateY(24px)'},'100%':{opacity:'1',transform:'translateY(0)'}},
        fadeIn:  {'0%':{opacity:'0'},'100%':{opacity:'1'}},
        slideIn: {'0%':{opacity:'0',transform:'translateX(20px)'},'100%':{opacity:'1',transform:'translateX(0)'}},
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    }
  },
  plugins: [],
};
