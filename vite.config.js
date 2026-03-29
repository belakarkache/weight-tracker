import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const pwaManifest = {
  name: 'Diário de Peso',
  short_name: 'Diário',
  description: 'Peso, refeições, calorias e metas no bolso',
  theme_color: '#0c1116',
  background_color: '#0c1116',
  display: 'standalone',
  scope: '/',
  start_url: '/',
  lang: 'pt-BR',
  icons: [
    {
      src: '/favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
    {
      src: '/apple-touch-icon.png',
      sizes: '72x72',
      type: 'image/png',
      purpose: 'any',
    },
  ],
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('primevue')) return 'primevue'
          if (id.includes('@tabler/icons-vue')) return 'icons'
          if (id.includes('vue-router')) return 'vue-vendor'
          if (id.includes('/vue') || id.includes('@vue/')) return 'vue-vendor'
          return undefined
        },
      },
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: false },
      manifest: pwaManifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
    {
      name: 'serve-manifest-in-dev',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/manifest.webmanifest' || req.url === '/manifest.webmanifest/') {
            res.setHeader('Content-Type', 'application/manifest+json')
            res.end(JSON.stringify(pwaManifest))
            return
          }
          next()
        })
      },
    },
  ],
})
