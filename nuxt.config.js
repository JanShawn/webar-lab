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
    '/floor-ar': {ssr: false},
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
      ar: {
        provider: '8thwall',
        engineUrl: process.env.NUXT_PUBLIC_AR_ENGINE_URL || 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1.0.0/dist/xr.js',
        extrasUrl: process.env.NUXT_PUBLIC_AR_EXTRAS_URL || 'https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1.0.0/dist/xrextras.js',
        landingPageUrl: process.env.NUXT_PUBLIC_AR_LANDING_PAGE_URL || 'https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1.0.0/dist/landing-page.js',
      },
    },
  },
  nitro: {
    preset: process.env.NITRO_PRESET || 'vercel',
  },
})
