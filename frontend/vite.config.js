import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev proxy target is configurable because port 5000 is not usable on modern
// macOS — Control Center's AirPlay Receiver binds it at login, so the API cannot
// listen there and every request silently fails to connect. Keep 5000 as the
// default so nothing changes for anyone it already works for; the local start
// script exports VITE_API_TARGET to point at the port the API really uses.
const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/auth': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
