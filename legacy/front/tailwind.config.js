/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        sidebar: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // 프로젝트 폰트 규칙: 기본 굵기 600, 강조 800 (두 단계로 통일 → 흐림 방지)
      fontWeight: {
        thin: '600',
        extralight: '600',
        light: '600',
        normal: '600',
        medium: '600',
        semibold: '600',
        bold: '800',
        extrabold: '800',
        black: '800',
      },
      // 최소 글자 크기 13px (text-xs 하한 상향)
      fontSize: {
        xs: ['13px', { lineHeight: '1.45' }],
      },
    },
  },
  plugins: [],
}