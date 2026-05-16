import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUNDLED_DEV__: false,
    __SERVER_FORWARD_CONSOLE__: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'UniHub Check-in',
        short_name: 'UniHub',
        description: 'Offline-first QR Check-in System',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // Disable host check for easy development with tunnels
    watch: {
      usePolling: true,
    },
    hmr: {
      // Remove clientPort so it uses the same port as the page (HTTPS 443)
    },
    proxy: {
      // Forward all API and public calls to the backend container.
      // This allows mobile devices on LAN (192.168.x.x:3000) to reach
      // the backend without needing to know the backend's hostname/port.
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
    },
  },
})
