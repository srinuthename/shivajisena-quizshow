import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "localhost",
    port: 8080,
    strictPort: true,
    proxy: {
      // Auth service routes (keep frontend SPA route `/auth/callback` local)
      '/auth/oauth': {
        target: 'http://localhost:50508',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:50508',
        changeOrigin: true,
      },
      '/api/profile': {
        target: 'http://localhost:50508',
        changeOrigin: true,
      },
      '^/\\.well-known/(openid-configuration|jwks\\.json)$': {
        target: 'http://localhost:50508',
        changeOrigin: true,
      },
      // Orchestrator routes
      '/api': {
        target: 'http://localhost:50510',
        changeOrigin: true,
      },
      '/sse': {
        target: 'http://localhost:50510',
        changeOrigin: true,
      },
      '/streams': {
        target: 'http://localhost:50510',
        changeOrigin: true,
      },
      // Only proxy the question-bank API routes under /quiz — all other /quiz/* paths
      // are React Router SPA routes and must be handled by Vite's dev server.
      '^/quiz/question-bank': {
        target: 'http://localhost:50510',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
