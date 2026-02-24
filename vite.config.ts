import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/posture-app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'PostureAI — リアルタイム姿勢分析',
        short_name: 'PostureAI',
        description: 'AI-powered real-time posture analysis',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/posture-app/',
        scope: '/posture-app/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'mediapipe-cdn', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'mediapipe-models', expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
})
