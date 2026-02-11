import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
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
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
