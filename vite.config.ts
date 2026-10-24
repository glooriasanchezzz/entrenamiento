import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// `base: './'` hace que la app funcione en la raíz de un dominio o en una subcarpeta (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mi entrenamiento',
        short_name: 'Entreno',
        description: 'Registra tus series, pesos y progreso. Tus datos se quedan en tu dispositivo.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f5f7',
        theme_color: '#c2410c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'], navigateFallback: 'index.html' },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
