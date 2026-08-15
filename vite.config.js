import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The Django project has no CORS middleware installed, so the browser would refuse every
// cross-origin call from :3000 to :8000. Proxying keeps the front end same-origin and leaves
// the backend untouched.
//
// root/urls.py wraps everything in i18n_patterns, so the real API lives under a language
// prefix — /en/api/v1/... and /uz/api/v1/... . Both are matched here.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8000'
  const proxy = { target, changeOrigin: true }

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '^/(en|uz)/api/': proxy,
        '/media': proxy,
        '/static': proxy,
        '/admin': proxy,
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
})
