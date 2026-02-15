import {describe, it, expect, beforeEach, vi} from 'vitest';
import {CanvasRenderer} from '../src/main';

// happy-dom does not support getContext('2d') / Path2D, so we mock them
(globalThis as any).Path2D = class Path2D {
  constructor(_d?: string) {}
};

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

const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any;
  return () => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  };
});

describe('CanvasRenderer', () => {
  let renderer: CanvasRenderer;

  beforeEach(() => {
    renderer = new CanvasRenderer({width: 800, height: 600});
  });

  describe('constructor', () => {
    it('creates a canvas element', () => {
      expect(renderer.el).toBeInstanceOf(HTMLCanvasElement);
    });

    it('uses default size when not specified', () => {
      const r = new CanvasRenderer();
      const size = r.getSize();
      expect(size.width).toBe(300);
      expect(size.height).toBe(150);
    });
  });

  describe('getSize', () => {
    it('returns the configured size', () => {
      const size = renderer.getSize();
      expect(size.width).toBe(800);
      expect(size.height).toBe(600);
    });
  });

  describe('resize', () => {
    it('updates size', () => {
      renderer.resize({width: 1024, height: 768});
      const size = renderer.getSize();
      expect(size.width).toBe(1024);
      expect(size.height).toBe(768);
    });
  });

  describe('dispose', () => {
    it('removes the canvas element', () => {
      const parent = document.createElement('div');
      parent.appendChild(renderer.el);
      renderer.dispose();
      expect(parent.children.length).toBe(0);
    });
  });

  describe('save / restore', () => {
    it('does not throw', () => {
      expect(() => {
        renderer.save();
        renderer.restore();
      }).not.toThrow();
    });
  });

  describe('clear', () => {
    it('does not throw', () => {
      expect(() => renderer.clear()).not.toThrow();
    });
  });

  describe('transform operations', () => {
    it('translate does not throw', () => {
      expect(() => renderer.translate(10, 20)).not.toThrow();
    });

    it('rotate does not throw', () => {
      expect(() => renderer.rotate(Math.PI / 4)).not.toThrow();
    });

    it('scale does not throw', () => {
      expect(() => renderer.scale(2, 2)).not.toThrow();
    });

    it('setTransform does not throw', () => {
      expect(() => renderer.setTransform(1, 0, 0, 1, 0, 0)).not.toThrow();
    });
  });

  describe('setAttributes', () => {
    it('accepts attribute object without error', () => {
      expect(() => renderer.setAttributes({fill: 'red', strokeWidth: 2})).not.toThrow();
    });
  });

  describe('drawing operations', () => {
    it('rect does not throw', () => {
      renderer.setAttributes({fill: 'red'});
      expect(() => renderer.rect()).not.toThrow();
    });

    it('path does not throw', () => {
      renderer.setAttributes({fill: 'blue'});
      expect(() => renderer.path('M0 0 L100 0 L100 100 Z')).not.toThrow();
    });
  });
});
