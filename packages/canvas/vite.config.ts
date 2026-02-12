import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'DyeCanvas',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'canvas.js';
        if (format === 'cjs') return 'canvas.cjs';
        return 'canvas.umd.js';
      },
    },
    rollupOptions: {
      external: (id: string) => id.startsWith('@dye/'),
    },
  },
});
