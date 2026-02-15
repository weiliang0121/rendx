import {describe, it, expect, beforeEach} from 'vitest';
import {SvgRenderer} from '../src/main';

describe('SvgRenderer', () => {
  let renderer: SvgRenderer;

  beforeEach(() => {
    renderer = new SvgRenderer({width: 800, height: 600});
  });

  describe('constructor', () => {
    it('creates an SVG element', () => {
      expect(renderer.el.tagName).toBe('svg');
      expect(renderer.el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });

    it('uses default size when not specified', () => {
      const r = new SvgRenderer();
      const size = r.getSize();
      expect(size.width).toBe(300);
      expect(size.height).toBe(150);
    });

    it('contains defs and g elements', () => {
      const defs = renderer.el.querySelector('defs');
      const g = renderer.el.querySelector('g');
      expect(defs).not.toBeNull();
      expect(g).not.toBeNull();
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
    it('updates SVG dimensions', () => {
      renderer.resize({width: 1024, height: 768});
      const size = renderer.getSize();
      expect(size.width).toBe(1024);
      expect(size.height).toBe(768);
    });
  });

  describe('dispose', () => {
    it('removes the SVG element', () => {
      const parent = document.createElement('div');
      parent.appendChild(renderer.el);
      renderer.dispose();
      expect(parent.children.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('resets SVG content', () => {
      renderer.clear();
      // After clear, should have a fresh g element
      const g = renderer.el.querySelector('g g');
      expect(g).not.toBeNull();
    });
  });

  describe('save / restore', () => {
    it('creates nested g elements on save', () => {
      renderer.save();
      renderer.restore();
      // Should not throw
    });

    it('multiple save/restore cycles work', () => {
      renderer.save();
      renderer.save();
      renderer.restore();
      renderer.restore();
    });
  });

  describe('transform operations', () => {
    it('translate adds transform', () => {
      renderer.save(true);
      renderer.translate(10, 20);
      renderer.restore();
    });

    it('rotate adds transform', () => {
      renderer.save(true);
      renderer.rotate(Math.PI / 4);
      renderer.restore();
    });

    it('scale adds transform', () => {
      renderer.save(true);
      renderer.scale(2, 2);
      renderer.restore();
    });

    it('setTransform sets matrix', () => {
      renderer.save(true);
      renderer.setTransform(1, 0, 0, 1, 10, 20);
      renderer.restore();
    });
  });

  describe('setAttributes', () => {
    it('accepts attribute object', () => {
      expect(() => renderer.setAttributes({fill: 'red', stroke: '#333'})).not.toThrow();
    });
  });

  describe('drawing methods', () => {
    it('rect creates SVG rect element', () => {
      renderer.setAttributes({fill: 'red', width: 100, height: 50, x: 10, y: 20});
      renderer.rect();
      const rect = renderer.el.querySelector('rect');
      expect(rect).not.toBeNull();
    });

    it('circle creates SVG circle element', () => {
      renderer.setAttributes({fill: 'blue', cx: 50, cy: 50, r: 25});
      renderer.circle();
      const circle = renderer.el.querySelector('circle');
      expect(circle).not.toBeNull();
    });

    it('path creates SVG path element', () => {
      renderer.setAttributes({fill: 'green'});
      renderer.path('M0 0 L100 0 L100 100 Z');
      const path = renderer.el.querySelector('path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('d')).toBe('M0 0 L100 0 L100 100 Z');
    });

    it('text creates SVG text element', () => {
      renderer.setAttributes({fill: '#333'});
      renderer.text('Hello', 50, 50);
      const text = renderer.el.querySelector('text');
      expect(text).not.toBeNull();
    });

    it('line creates SVG line element', () => {
      renderer.setAttributes({stroke: '#000'});
      renderer.line();
      const line = renderer.el.querySelector('line');
      expect(line).not.toBeNull();
    });
  });

  describe('gradient', () => {
    it('creates gradient definition', () => {
      renderer.gradient({
        id: 'test-grad',
        type: 'linear',
        direction: [0, 0, 1, 0],
        stops: [
          [0, '#000'],
          [1, '#fff'],
        ],
      });
      const grad = renderer.el.querySelector('defs linearGradient');
      expect(grad).not.toBeNull();
    });
  });

  describe('clipPath', () => {
    it('creates clipPath definition', () => {
      renderer.clipPath({id: 'clip1', path: 'M0 0 L100 0 L100 100 Z'});
      const clip = renderer.el.querySelector('defs clipPath');
      expect(clip).not.toBeNull();
    });
  });
});
