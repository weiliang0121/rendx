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

import {historyPlugin} from '../src/main';
import {App} from 'rendx-engine';

describe('historyPlugin', () => {
  describe('factory', () => {
    it('creates a plugin instance', () => {
      const plugin = historyPlugin();
      expect(plugin).toBeDefined();
      expect(typeof plugin.install).toBe('function');
      expect(typeof plugin.push).toBe('function');
      expect(typeof plugin.undo).toBe('function');
      expect(typeof plugin.redo).toBe('function');
      expect(typeof plugin.reset).toBe('function');
      expect(typeof plugin.dispose).toBe('function');
    });

    it('accepts custom maxSteps', () => {
      const plugin = historyPlugin({maxSteps: 100});
      expect(plugin).toBeDefined();
    });
  });

  describe('with App', () => {
    let app: any;
    let plugin: ReturnType<typeof historyPlugin>;

    beforeEach(() => {
      const container = document.createElement('div');
      app = new App({width: 400, height: 300});
      app.mount(container);

      plugin = historyPlugin();
      app.use(plugin);
    });

    it('initially cannot undo or redo', () => {
      expect(plugin.canUndo).toBe(false);
      expect(plugin.canRedo).toBe(false);
      expect(plugin.undoCount).toBe(0);
      expect(plugin.redoCount).toBe(0);
    });

    it('push creates an undo entry', () => {
      plugin.push();
      expect(plugin.canUndo).toBe(true);
      expect(plugin.undoCount).toBe(1);
    });

    it('undo returns false when no history', () => {
      expect(plugin.undo()).toBe(false);
    });

    it('undo works after push', () => {
      plugin.push();
      const result = plugin.undo();
      expect(result).toBe(true);
      expect(plugin.canRedo).toBe(true);
    });

    it('redo returns false when no redo history', () => {
      expect(plugin.redo()).toBe(false);
    });

    it('redo works after undo', () => {
      plugin.push();
      plugin.undo();
      const result = plugin.redo();
      expect(result).toBe(true);
    });

    it('push clears redo stack', () => {
      plugin.push();
      plugin.undo();
      expect(plugin.canRedo).toBe(true);
      plugin.push(); // new action clears redo
      expect(plugin.canRedo).toBe(false);
    });

    it('reset clears all history', () => {
      plugin.push();
      plugin.push();
      plugin.reset();
      expect(plugin.canUndo).toBe(false);
      expect(plugin.canRedo).toBe(false);
    });

    it('respects maxSteps limit', () => {
      const limitedPlugin = historyPlugin({maxSteps: 3});
      app.use(limitedPlugin);

      limitedPlugin.push();
      limitedPlugin.push();
      limitedPlugin.push();
      limitedPlugin.push(); // exceeds limit

      expect(limitedPlugin.undoCount).toBeLessThanOrEqual(3);
    });

    it('dispose cleans up', () => {
      plugin.push();
      plugin.dispose();
      expect(plugin.canUndo).toBe(false);
    });
  });
});
