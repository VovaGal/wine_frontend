import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Local development only. Production should share an origin with FastAPI
    // or explicitly enable CORS on that server.
    // proxy: { '/recognition': { target: 'http://127.0.0.1:8080', changeOrigin: true } },
    // For containers running in the same Docker network, use the service name instead of localhost.
    proxy: { '/recognition': { target: 'http://backend:8080', changeOrigin: true } },
  },
});
