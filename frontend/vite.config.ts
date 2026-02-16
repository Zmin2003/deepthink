import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 优先使用 VITE_API_BASE_URL，否则用 VITE_API_PORT 构建
  let proxyTarget = 'http://localhost:3001'
  if (env.VITE_API_BASE_URL) {
    proxyTarget = env.VITE_API_BASE_URL
  } else if (env.VITE_API_PORT) {
    proxyTarget = `http://localhost:${env.VITE_API_PORT}`
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Improve chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-markdown': ['markdown-it'],
          },
        },
      },
      // Increase warning threshold to avoid noise
      chunkSizeWarningLimit: 600,
      // Production source maps for debugging
      sourcemap: mode === 'production' ? 'hidden' : true,
      // CSS code splitting
      cssCodeSplit: true,
      // Target modern browsers for smaller bundles
      target: 'es2020',
      minify: 'esbuild',
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,

      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        '/deepthink': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/v1': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})