import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  base: mode === 'pages' ? `/${(process.env.GITHUB_REPOSITORY || 'aisxght/EGE-trainer').split('/')[1]}/` : '/',
  define: {
    'import.meta.env.VITE_STATIC_HOSTING': JSON.stringify(mode === 'pages' ? 'true' : 'false'),
  },
  server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
}))
