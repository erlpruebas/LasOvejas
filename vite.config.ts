import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/LasOvejas/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Ovejas: Pastor y Rebaño',
        short_name: 'Ovejas',
        description: 'Guía a las ovejas a través de niveles con obstáculos. PWA offline.',
        lang: 'es',
        theme_color: '#63C5DA',
        background_color: '#f7fbff',
        display: 'standalone',
        start_url: '/LasOvejas/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        navigateFallback: '/LasOvejas/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document' || request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'runtime-cache'
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    open: true
  }
});



