import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'DyeShape',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'shape.js';
        if (format === 'cjs') return 'shape.cjs';
        return 'shape.umd.js';
      },
    },
    rollupOptions: {
      external: (id: string) => id.startsWith('@dye/'),
    },
  },
});
