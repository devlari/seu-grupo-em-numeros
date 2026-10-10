import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Endereço público pras tags de prévia do link. Na Vercel vem do domínio de produção do projeto;
// fora dela, defina VITE_SITE_URL no .env (ou nas variáveis do painel da Vercel, pra forçar outro domínio)
if (!process.env.VITE_SITE_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.VITE_SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
}

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
