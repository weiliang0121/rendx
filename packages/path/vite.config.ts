import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'DyePath',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'path.js';
        if (format === 'cjs') return 'path.cjs';
        return 'path.umd.js';
      },
    },
    rollupOptions: {
      external: (id: string) => id.startsWith('@dye/'),
    },
  },
});
