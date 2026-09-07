import { defineConfig } from 'vite';

export default defineConfig({
  base: '/jvdaw/',
  build: {
    emptyOutDir: true,
    outDir: '../../app/jvdaw',
    sourcemap: false,
  },
});
