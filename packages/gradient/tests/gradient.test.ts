import {describe, it, expect} from 'vitest';
import {createSVGGradient} from '../src/main';

describe('createSVGGradient', () => {
  describe('linear gradient', () => {
    it('creates a linearGradient SVG element', () => {
      const el = createSVGGradient({
        id: 'lg1',
        type: 'linear',
        direction: [0, 0, 1, 1],
        stops: [
          [0, '#000000'],
          [1, '#ffffff'],
        ],
      });
      expect(el).toBeDefined();
      expect(el!.tagName).toBe('linearGradient');
      expect(el!.getAttribute('id')).toBe('lg1');
      expect(el!.getAttribute('x1')).toBe('0');
      expect(el!.getAttribute('y1')).toBe('0');
      expect(el!.getAttribute('x2')).toBe('1');
      expect(el!.getAttribute('y2')).toBe('1');
    });

    it('creates stop elements', () => {
      const el = createSVGGradient({
        id: 'lg2',
        type: 'linear',
        direction: [0, 0, 1, 0],
        stops: [
          [0, '#ff0000'],
          [0.5, '#00ff00'],
          [1, '#0000ff'],
        ],
      });
      const stops = el!.querySelectorAll('stop');
      expect(stops.length).toBe(3);
      expect(stops[0].getAttribute('offset')).toBe('0');
      expect(stops[0].getAttribute('stop-color')).toBe('#ff0000');
      expect(stops[1].getAttribute('offset')).toBe('0.5');
      expect(stops[2].getAttribute('stop-color')).toBe('#0000ff');
    });
  });

  describe('radial gradient', () => {
    it('creates a radialGradient SVG element', () => {
      const el = createSVGGradient({
        id: 'rg1',
        type: 'radial',
        direction: [0.5, 0.5, 0.5, 0.5, 0.5, 0],
        stops: [
          [0, '#fff'],
          [1, '#000'],
        ],
      });
      expect(el).toBeDefined();
      expect(el!.tagName).toBe('radialGradient');
      expect(el!.getAttribute('id')).toBe('rg1');
    });
  });

  describe('with region', () => {
    it('uses userSpaceOnUse units', () => {
      const el = createSVGGradient({
        id: 'lg3',
        type: 'linear',
        direction: [0, 0, 1, 0],
        stops: [
          [0, '#000'],
          [1, '#fff'],
        ],
        region: [10, 20, 100, 50],
      });
      expect(el!.getAttribute('gradientUnits')).toBe('userSpaceOnUse');
      // direction should be resolved: x0 = 10 + 100*0 = 10, x1 = 10 + 100*1 = 110
      expect(el!.getAttribute('x1')).toBe('10');
      expect(el!.getAttribute('x2')).toBe('110');
    });
  });

  describe('DSL string parsing', () => {
    it('parses linear gradient DSL', () => {
      const el = createSVGGradient("l(myGrad, [0,0,1,0], [[0, '#ff0000'],[1, '#0000ff']])");
      expect(el).toBeDefined();
      expect(el!.tagName).toBe('linearGradient');
      expect(el!.getAttribute('id')).toBe('myGrad');
      const stops = el!.querySelectorAll('stop');
      expect(stops.length).toBe(2);
    });
  });
});
