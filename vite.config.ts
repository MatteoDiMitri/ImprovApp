import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: l'app funziona anche aperta da una sottocartella (es. GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
})
