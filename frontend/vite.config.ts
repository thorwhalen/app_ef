import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// zodal is consumed from local source via `link:` deps (see README §"zodal is
// local-linked"). `resolve.dedupe` forces a single copy of React / zod / the
// zodal core so the linked packages and this app share one instance — without
// it, a linked package resolves its own `react` and hooks break. `server.fs`
// is widened so the dev server may read the linked package files outside the
// project root.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    dedupe: ['react', 'react-dom', 'zod', '@zodal/core', '@zodal/ui'],
  },
  server: {
    port: 5173,
    fs: { allow: ['..', '../../../i/_zodals'] },
  },
});
