/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"','Inter','system-ui','sans-serif'],
        body:    ['Inter','system-ui','sans-serif'],
      },
      colors: {
        ember: { DEFAULT:'#FF5A36', dark:'#E8431F', light:'#FFF1EC' },
        basil: { DEFAULT:'#1A8F5C', light:'#E6F5EE' },
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out both',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
      },
      keyframes: {
        fadeIn:  { from:{ opacity:0 }, to:{ opacity:1 } },
        slideUp: { from:{ opacity:0, transform:'translateY(16px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        scaleIn: { from:{ opacity:0, transform:'scale(0.97)' }, to:{ opacity:1, transform:'scale(1)' } },
      },
    },
  },
  plugins: [],
}
