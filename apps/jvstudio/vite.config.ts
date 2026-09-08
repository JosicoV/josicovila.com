import { defineConfig } from 'vite';

export default defineConfig({
  base: '/jvstudio/',
  build: {
    emptyOutDir: true,
    outDir: '../../app/jvstudio',
    sourcemap: false,
  },
});
