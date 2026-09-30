import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-sin-tacc.png'],
      manifest: {
        name: 'Verificador Sin TACC',
        short_name: 'Sin TACC',
        description: 'Verificá si un producto es apto para celíacos según ANMAT',
        theme_color: '#16a34a',
        background_color: '#f0fdf4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'logo-sin-tacc.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-sin-tacc.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/verificador-sin-tacc\.onrender\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ],
})