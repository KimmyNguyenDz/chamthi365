import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo365.svg', 'thu-vien/muc-luc.json', 'mau/*'],
      manifest: false, // manifest.webmanifest tĩnh trong public/
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,webp,woff2}'],
        globIgnores: ['thu-vien/phieu/**', 'thu-vien/anh/**'],
        runtimeCaching: [
          {
            urlPattern: /\/thu-vien\/(khuon|anh|phieu|muc-luc)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ct365-thu-vien',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 24 * 3600 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'ct365-fonts', expiration: { maxAgeSeconds: 365 * 24 * 3600 } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
})
