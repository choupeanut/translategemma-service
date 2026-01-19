import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: true,
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://backend:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: process.env.VITE_BACKEND_URL || 'http://backend:8000',
          changeOrigin: true,
          ws: true,
        }
      }
    },
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'lucide-react', 
        '@radix-ui/react-slot',
        '@radix-ui/react-label',
        '@radix-ui/react-select',
        '@radix-ui/react-tabs',
        'class-variance-authority',
        'clsx',
        'tailwind-merge'
      ],
    },
  }
})
