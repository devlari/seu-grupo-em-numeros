import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // O pacote dos gráficos (ECharts) tem ~700 kB e só carrega depois do upload; a landing fica leve
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      // Duas páginas: o app e a página de privacidade (estática, sem precisar de rotas)
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacidade: resolve(import.meta.dirname, 'privacidade.html'),
      },
    },
  },
})
