import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://rasmussvala.github.io/liftlog/
  base: '/liftlog/',
  plugins: [react(), tailwindcss()],
})
