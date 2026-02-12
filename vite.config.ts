import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Dev proxy: route /api/retool to the Retool routes workflow
        '/api/retool': {
          target: 'https://api.retool.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/retool/, '/v1/workflows/4b021616-b398-4ef6-a425-c38647c52648/startTrigger'),
        },
        // Dev proxy: route /api/updateTask to the Retool update workflow
        '/api/updateTask': {
          target: 'https://api.retool.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/updateTask/, '/v1/workflows/6b212243-e544-4494-b114-fbc436244fc2/startTrigger'),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // We generate the manifest dynamically per-brand in JS, so skip static manifest
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Don't precache source maps or huge files
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Navigation fallback to index.html for SPA routing
          navigateFallback: '/index.html',
          navigateFallbackAllowlist: [/^(?!\/__).*/],
          // Runtime caching for external resources
          runtimeCaching: [
            {
              // Google Fonts stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              // Google Fonts webfont files
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              // Leaflet library from unpkg
              urlPattern: /^https:\/\/unpkg\.com\/leaflet.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'leaflet-cdn',
                expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Map tiles from CartoDB
              urlPattern: /^https:\/\/.*basemaps\.cartocdn\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // User avatars from ui-avatars.com
              urlPattern: /^https:\/\/ui-avatars\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'avatars',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Product images (any external image CDN)
              urlPattern: /\.(png|jpg|jpeg|webp|gif)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'product-images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
          ],
        },
        devOptions: {
          enabled: false, // Enable only for testing: set to true
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
});
