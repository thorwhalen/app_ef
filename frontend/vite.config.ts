import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// `resolve.dedupe` forces a single copy of React / zod / the zodal core so the
// app and the zodal packages share one instance — without it a transitively
// resolved second `react` breaks hooks.
//
// `base` defaults to `/` for local dev; tw_platform's deploy injects
// `VITE_PUBLIC_BASE=/app_ef/` at build time so the built asset URLs resolve
// under the mounted route. The build always targets `dist/` — app.toml's
// `frontend_dir = "frontend/dist"` is what enlace serves.
export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    dedupe: ['react', 'react-dom', 'zod', '@zodal/core', '@zodal/ui'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
