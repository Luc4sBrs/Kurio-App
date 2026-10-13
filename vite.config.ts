import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  preview: { host: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react'
          if (id.includes('/@tanstack/')) return 'tanstack'
          if (id.includes('/@radix-ui/')) return 'radix'
          if (id.includes('/lucide-react/')) return 'icons'
        },
      },
    },
  },
})
