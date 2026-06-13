/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces','Georgia','serif'],
        body:    ['Inter','system-ui','sans-serif'],
        mono:    ['JetBrains Mono','monospace'],
      },
      colors: {
        carbon:  { 400:'#8F8678', 500:'#6B6358', 600:'#504840' },
        forest:  { 400:'#3AB87D', 500:'#1F9E62', 600:'#167D4D', 900:'#072E1A' },
        terra:   { 400:'#E2704A', 500:'#D4502A', 600:'#B83A1E' },
        amber:   { 300:'#FCD34D', 400:'#FBBF24', 500:'#F59E0B' },
      },
      animation: {
        'fade-in':    'fadeIn 0.35s ease-out both',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':   'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
        'float':      'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'pop-in':     'popIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeIn:    { from:{ opacity:0 }, to:{ opacity:1 } },
        slideUp:   { from:{ opacity:0, transform:'translateY(22px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        slideDown: { from:{ opacity:0, transform:'translateY(-12px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        scaleIn:   { from:{ opacity:0, transform:'scale(0.92)' }, to:{ opacity:1, transform:'scale(1)' } },
        float:     { '0%,100%':{ transform:'translateY(0)' }, '50%':{ transform:'translateY(-9px)' } },
        glowPulse: { '0%,100%':{ boxShadow:'0 0 0 0 rgba(31,158,98,0)' }, '50%':{ boxShadow:'0 0 30px 8px rgba(31,158,98,0.28)' } },
        popIn:     { '0%':{ transform:'scale(0.85) rotateY(-8deg)', opacity:0 }, '100%':{ transform:'scale(1) rotateY(0deg)', opacity:1 } },
      },
      boxShadow: {
        'glow':   '0 0 32px rgba(31,158,98,0.28)',
        'card':   '0 4px 24px rgba(0,0,0,0.10)',
        'lifted': '0 8px 40px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [],
}
