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

import {gridPlugin} from '../src/main';
import {App} from 'rendx-engine';

describe('gridPlugin', () => {
  describe('factory', () => {
    it('creates a plugin instance', () => {
      const plugin = gridPlugin();
      expect(plugin).toBeDefined();
      expect(typeof plugin.install).toBe('function');
      expect(typeof plugin.draw).toBe('function');
      expect(typeof plugin.resize).toBe('function');
      expect(typeof plugin.update).toBe('function');
      expect(typeof plugin.dispose).toBe('function');
    });

    it('accepts custom options', () => {
      const plugin = gridPlugin({spacing: 30, dotRadius: 2, color: '#ccc'});
      expect(plugin).toBeDefined();
    });
  });

  describe('install', () => {
    it('creates a canvas when installed on an app', () => {
      const container = document.createElement('div');
      const app = new App({width: 400, height: 300});
      app.mount(container);

      const plugin = gridPlugin();
      app.use(plugin);

      // The grid canvas should be added as a child
      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('update', () => {
    it('updates options without error', () => {
      const container = document.createElement('div');
      const app = new App({width: 400, height: 300});
      app.mount(container);

      const plugin = gridPlugin();
      app.use(plugin);

      expect(() => plugin.update({spacing: 40, color: '#aaa'})).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('cleans up resources', () => {
      const container = document.createElement('div');
      const app = new App({width: 400, height: 300});
      app.mount(container);

      const plugin = gridPlugin();
      app.use(plugin);

      expect(() => plugin.dispose()).not.toThrow();
    });
  });
});
