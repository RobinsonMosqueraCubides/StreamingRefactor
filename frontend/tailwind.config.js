const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Fira Sans', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      colors: {
        slate: {
          50: withOpacity('--slate-50'),
          100: withOpacity('--slate-100'),
          200: withOpacity('--slate-200'),
          300: withOpacity('--slate-300'),
          350: withOpacity('--slate-350'),
          400: withOpacity('--slate-400'),
          450: withOpacity('--slate-450'),
          500: withOpacity('--slate-500'),
          550: withOpacity('--slate-550'),
          600: withOpacity('--slate-600'),
          700: withOpacity('--slate-700'),
          800: withOpacity('--slate-800'),
          850: withOpacity('--slate-850'),
          900: withOpacity('--slate-900'),
          955: withOpacity('--slate-955'),
          950: withOpacity('--slate-950'),
        },
        cyan: {
          50: withOpacity('--cyan-50'),
          100: withOpacity('--cyan-100'),
          200: withOpacity('--cyan-200'),
          300: withOpacity('--cyan-300'),
          400: withOpacity('--cyan-400'),
          500: withOpacity('--cyan-500'),
          600: withOpacity('--cyan-600'),
          700: withOpacity('--cyan-700'),
          800: withOpacity('--cyan-800'),
          900: withOpacity('--cyan-900'),
          950: withOpacity('--cyan-950'),
        },
        emerald: {
          50: withOpacity('--emerald-50'),
          100: withOpacity('--emerald-100'),
          200: withOpacity('--emerald-200'),
          300: withOpacity('--emerald-300'),
          400: withOpacity('--emerald-400'),
          500: withOpacity('--emerald-500'),
          600: withOpacity('--emerald-600'),
          700: withOpacity('--emerald-700'),
        },
        rose: {
          50: withOpacity('--rose-50'),
          100: withOpacity('--rose-100'),
          200: withOpacity('--rose-200'),
          300: withOpacity('--rose-300'),
          400: withOpacity('--rose-400'),
          500: withOpacity('--rose-500'),
          600: withOpacity('--rose-600'),
          700: withOpacity('--rose-700'),
        },
        amber: {
          50: withOpacity('--amber-50'),
          100: withOpacity('--amber-100'),
          200: withOpacity('--amber-200'),
          300: withOpacity('--amber-300'),
          400: withOpacity('--amber-400'),
          500: withOpacity('--amber-500'),
          600: withOpacity('--amber-600'),
          700: withOpacity('--amber-700'),
        },
        brand: {
          primary: 'var(--bg-app)',
          secondary: 'var(--bg-card)',
          sidebar: 'var(--bg-sidebar)',
          textPrimary: 'var(--text-primary)',
          textMuted: 'var(--text-muted)',
          accent: 'var(--btn-primary)',
          accentHover: 'var(--btn-primary-hover)',
          accentText: 'var(--btn-primary-text)',
          border: 'var(--border-ui)',
          pending: 'var(--alert-pending)',
        }
      }
    },
  },
  plugins: [],
}
