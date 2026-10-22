import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Electron에서 상대 경로 사용
  server: {
    port: 1420,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});