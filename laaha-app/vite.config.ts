import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Laaha',
        short_name: 'Laaha',
        description: 'Report online harm and find help',
        theme_color: '#c94f1b',
        background_color: '#fff7f1',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/api/bundle',
            handler: 'NetworkFirst',
            options: { cacheName: 'bundle', networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
