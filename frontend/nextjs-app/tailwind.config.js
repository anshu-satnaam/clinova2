/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-emerald-500/10','text-emerald-500','border-emerald-500/20','text-emerald-400',
    'bg-red-500/10','text-red-500','border-red-500/20','text-red-400',
    'bg-amber-500/10','text-amber-500','border-amber-500/20',
    'bg-blue-500/10','text-blue-500','border-blue-500/20','text-blue-400',
    'bg-slate-500/10','text-slate-500','border-slate-500/20',
    'bg-cyan-500/10','text-cyan-400',
    'bg-purple-500/10','text-purple-400',
    'bg-orange-500/10','text-orange-400',
    'bg-green-500/10','text-green-400',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        display: ['Cabinet Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        clinova: {
          dark: '#0F1419',
          'dark-alt': '#161B22',
          cyan: '#00D4FF',
          purple: '#7C3AED',
        },
      },
      animation: {
        'wave-bounce': 'wave-bounce 1.2s ease-in-out infinite',
      },
      keyframes: {
        'wave-bounce': {
          '0%, 100%': { height: '10px', opacity: '0.5' },
          '50%': { height: '60px', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
