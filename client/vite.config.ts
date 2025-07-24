import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import mkcert from 'vite-plugin-mkcert'; 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
   server: {
    https : {} // <-- Enable HTTPS for the dev server
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})