import {defineConfig} from 'vite';
import path from 'node:path';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/rendx/playground/' : '/',
  resolve: {
    alias: {
      'rendx-engine': path.resolve(__dirname, '../../packages/engine/src/main.ts'),
      'rendx-canvas': path.resolve(__dirname, '../../packages/canvas/src/main.ts'),
      'rendx-svg': path.resolve(__dirname, '../../packages/svg/src/main.ts'),
      'rendx-shape': path.resolve(__dirname, '../../packages/shape/src/main.ts'),
      'rendx-path': path.resolve(__dirname, '../../packages/path/src/main.ts'),
      'rendx-bounding': path.resolve(__dirname, '../../packages/bounding/src/main.ts'),
      'rendx-ease': path.resolve(__dirname, '../../packages/ease/src/main.ts'),
      'rendx-curve': path.resolve(__dirname, '../../packages/curve/src/main.ts'),
      'rendx-interpolate': path.resolve(__dirname, '../../packages/interpolate/src/main.ts'),
      'rendx-core': path.resolve(__dirname, '../../packages/core/src/main.ts'),
      'rendx-gradient': path.resolve(__dirname, '../../packages/gradient/src/main.ts'),
      'rendx-dom': path.resolve(__dirname, '../../packages/dom/src/main.ts'),
      'rendx-graph-plugin': path.resolve(__dirname, '../../packages/graph-plugin/src/main.ts'),
      'rendx-selection-plugin': path.resolve(__dirname, '../../packages/selection-plugin/src/main.ts'),
      'rendx-drag-plugin': path.resolve(__dirname, '../../packages/drag-plugin/src/main.ts'),
      'rendx-connect-plugin': path.resolve(__dirname, '../../packages/connect-plugin/src/main.ts'),
      'rendx-history-plugin': path.resolve(__dirname, '../../packages/history-plugin/src/main.ts'),
      'rendx-grid-plugin': path.resolve(__dirname, '../../packages/grid-plugin/src/main.ts'),
      'rendx-minimap-plugin': path.resolve(__dirname, '../../packages/minimap-plugin/src/main.ts'),
      'rendx-zoom-plugin': path.resolve(__dirname, '../../packages/zoom-plugin/src/main.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        editor: path.resolve(__dirname, 'editor.html'),
      },
    },
  },
  server: {
    port: 5174,
  },
});
