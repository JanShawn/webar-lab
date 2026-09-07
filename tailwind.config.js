/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#07110d',
        panel: '#0d1b15',
        line: '#263a31',
        energy: '#84f7b2',
        cyan: '#73d8ff',
        muted: '#9bb0a5',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      boxShadow: {
        energy: '0 0 0 1px rgba(132,247,178,.28), 0 18px 70px rgba(24,104,66,.22)',
      },
    },
  },
}
