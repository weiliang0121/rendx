import {describe, it, expect, vi, beforeEach} from 'vitest';

// Mock canvas 2d context since happy-dom doesn't support it
const mockCtx = {
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  rect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({width: 0})),
  createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  createRadialGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  drawImage: vi.fn(),
  canvas: document.createElement('canvas'),
  globalAlpha: 1,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  lineDashOffset: 0,
  font: '',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  globalCompositeOperation: 'source-over',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  setLineDash: vi.fn(),
  getLineDash: vi.fn(() => []),
};

(globalThis as any).Path2D = class Path2D {
  constructor(_d?: string) {}
};

const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any;
  return () => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  };
});

import {minimapPlugin} from '../src/main';
import {App} from 'rendx-engine';

describe('minimapPlugin', () => {
  describe('factory', () => {
    it('creates a plugin instance', () => {
      const plugin = minimapPlugin();
      expect(plugin).toBeDefined();
      expect(typeof plugin.install).toBe('function');
      expect(typeof plugin.draw).toBe('function');
      expect(typeof plugin.resize).toBe('function');
      expect(typeof plugin.update).toBe('function');
      expect(typeof plugin.dispose).toBe('function');
    });

    it('accepts custom options', () => {
      const plugin = minimapPlugin({
        width: 200,
        height: 150,
        position: 'top-left',
        margin: 20,
        background: '#f0f0f0',
      });
      expect(plugin).toBeDefined();
    });
  });

  describe('with App', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
    });

    it('installs and creates minimap DOM elements', () => {
      const app = new App({width: 800, height: 600});
      app.mount(container);

      const plugin = minimapPlugin();
      app.use(plugin);

      // Should create minimap wrapper
      const minimapCanvas = container.querySelectorAll('canvas');
      expect(minimapCanvas.length).toBeGreaterThanOrEqual(1);
    });

    it('draw does not throw', () => {
      const app = new App({width: 800, height: 600});
      app.mount(container);

      const plugin = minimapPlugin();
      app.use(plugin);

      expect(() => plugin.draw()).not.toThrow();
    });

    it('update changes options', () => {
      const app = new App({width: 800, height: 600});
      app.mount(container);

      const plugin = minimapPlugin();
      app.use(plugin);

      expect(() => plugin.update({background: '#eee', margin: 15})).not.toThrow();
    });

    it('dispose cleans up', () => {
      const app = new App({width: 800, height: 600});
      app.mount(container);

      const plugin = minimapPlugin();
      app.use(plugin);

      expect(() => plugin.dispose()).not.toThrow();
    });

    it('resize triggers redraw without error', () => {
      const app = new App({width: 800, height: 600});
      app.mount(container);

      const plugin = minimapPlugin();
      app.use(plugin);

      expect(() => plugin.resize()).not.toThrow();
    });
  });
});
