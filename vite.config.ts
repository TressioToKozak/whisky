import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import offlinePlugin from './scripts/offline-plugin'
export default defineConfig({base: '/whisky/', plugins: [react(),offlinePlugin()],build:{rollupOptions:{output:{manualChunks(id){if(/\/(catalog|product-text|prices|barcodes)\.json$/.test(id))return 'catalog-data'}}}}})
