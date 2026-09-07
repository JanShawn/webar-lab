export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  devtools: {enabled: true},
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: {lang: 'zh-Hant'},
      title: 'WebAR Lab',
      meta: [
        {name: 'description', content: '可掃描、可量測、可重用的 WebAR 互動實驗室。'},
        {name: 'theme-color', content: '#07110d'},
        {name: 'apple-mobile-web-app-capable', content: 'yes'},
        {name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent'},
      ],
    },
  },
  routeRules: {
    '/experiences/**': {ssr: false},
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
    },
  },
  nitro: {
    preset: 'vercel',
  },
})
