import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import dotenv from 'dotenv';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { VitePWA } from 'vite-plugin-pwa'

// Load variables from the literal file named 'process.env'
dotenv.config({ path: './process.env' });
// Load variables from the .env file
dotenv.config({ path: './.env' });

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      wasm(),
      topLevelAwait(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
        globals: {
          Buffer: true,
          process: true,
          global: true,
        },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'ShelbyPub',
          short_name: 'ShelbyPub',
          description: 'Decentralized file storage and media sharing on Shelby Protocol',
          theme_color: '#0c0c0c',
          background_color: '#faf9fa',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.testnet\.shelby\.xyz\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'shelby-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24
                }
              }
            }
          ]
        }
      })
    ],
    optimizeDeps: {
      exclude: ['@shelby-protocol/sdk'],
    },
    assetsInclude: ['**/*.wasm'],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
