import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from parent directory (project root)
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')

  return {
    // Use relative paths for Electron (not absolute /assets/)
    base: './',
    // Tell Vite to look for .env files in the parent directory
    envDir: path.resolve(__dirname, '..'),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.API_URL || 'https://backend-ether.onrender.com',
          changeOrigin: true,
          secure: false
        },
        '/socket.io': {
          target: env.WS_URL || 'https://server-1-z9ok.onrender.com',
          ws: true,
          changeOrigin: true,
          secure: false
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor': ['vue', 'vue-router', 'pinia', 'axios'],
              'ui': ['@fortawesome/fontawesome-free']
            }
          }
        },
        chunkSizeWarningLimit: 1000
      }
    }
  }
})
