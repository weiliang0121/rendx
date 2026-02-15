import {describe, it, expect} from 'vitest';
import {
  setAttrs,
  setStyles,
  getSize,
  createSvgEl,
  createCanvasEl,
  getSvgElByTag,
  camelToKebab,
  convertSVGAttrs,
  setSVGAttrs,
  convertFontOptionsToCSS,
} from '../src/main';

describe('element utilities', () => {
  describe('setAttrs', () => {
    it('sets attributes on an element', () => {
      const el = document.createElement('div');
      setAttrs(el, {id: 'test', 'data-value': '42'});
      expect(el.getAttribute('id')).toBe('test');
      expect(el.getAttribute('data-value')).toBe('42');
    });

    it('removes attribute when value is null', () => {
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      setAttrs(el, {id: null});
      expect(el.hasAttribute('id')).toBe(false);
    });

    it('returns the element for chaining', () => {
      const el = document.createElement('div');
      const result = setAttrs(el, {});
      expect(result).toBe(el);
    });
  });

  describe('setStyles', () => {
    it('sets styles on an element', () => {
      const el = document.createElement('div');
      setStyles(el, {backgroundColor: 'red', fontSize: '14px'});
      expect(el.style.backgroundColor).toBe('red');
      expect(el.style.fontSize).toBe('14px');
    });

    it('removes style when value is null', () => {
      const el = document.createElement('div');
      el.style.color = 'red';
      setStyles(el, {color: null});
      expect(el.style.color).toBe('');
    });

    it('returns the element', () => {
      const el = document.createElement('div');
      expect(setStyles(el, {})).toBe(el);
    });
  });

  describe('getSize', () => {
    it('returns width and height', () => {
      const el = document.createElement('div');
      const size = getSize(el);
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
    });
  });

  describe('createSvgEl', () => {
    it('creates SVG element', () => {
      const el = createSvgEl('rect');
      expect(el.tagName).toBe('rect');
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });
  });

  describe('createCanvasEl', () => {
    it('creates canvas element', () => {
      const el = createCanvasEl();
      expect(el.tagName).toBe('CANVAS');
    });
  });

  describe('getSvgElByTag', () => {
    it('returns existing child or creates new one', () => {
      const svg = createSvgEl('svg');
      const rect = getSvgElByTag(svg, 'rect');
      expect(rect.tagName).toBe('rect');
      // Check it was appended
      expect(svg.children[0]).toBe(rect);
      // Calling again returns the same element
      const rect2 = getSvgElByTag(svg, 'rect');
      expect(rect2).toBe(rect);
    });
  });
});

describe('camelToKebab', () => {
  it('converts camelCase to kebab-case', () => {
    expect(camelToKebab('strokeWidth')).toBe('stroke-width');
    expect(camelToKebab('fontSize')).toBe('font-size');
    expect(camelToKebab('backgroundColor')).toBe('background-color');
  });

  it('handles single word', () => {
    expect(camelToKebab('fill')).toBe('fill');
  });
});

describe('convertSVGAttrs', () => {
  it('preserves whitelisted SVG attributes', () => {
    expect(convertSVGAttrs('preserveAspectRatio')).toBe('preserveAspectRatio');
    expect(convertSVGAttrs('gradientUnits')).toBe('gradientUnits');
  });

  it('converts non-whitelisted to kebab', () => {
    expect(convertSVGAttrs('strokeWidth')).toBe('stroke-width');
  });
});

describe('setSVGAttrs', () => {
  it('sets SVG attributes with conversion', () => {
    const rect = createSvgEl('rect');
    setSVGAttrs(rect, {strokeWidth: 2, fill: 'red'});
    expect(rect.getAttribute('stroke-width')).toBe('2');
    expect(rect.getAttribute('fill')).toBe('red');
  });
});

// ── font ──

describe('convertFontOptionsToCSS', () => {
  it('generates CSS font string with defaults', () => {
    const css = convertFontOptionsToCSS();
    expect(css).toContain('10px');
    expect(css).toContain('sans-serif');
  });

  it('includes all provided options', () => {
    const css = convertFontOptionsToCSS({
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'italic',
      fontVariant: 'small-caps',
    });
    expect(css).toContain('italic');
    expect(css).toContain('small-caps');
    expect(css).toContain('bold');
    expect(css).toContain('16px');
    expect(css).toContain('Arial');
  });

  it('includes lineHeight when specified', () => {
    const css = convertFontOptionsToCSS({fontSize: 14, lineHeight: 20});
    expect(css).toContain('/20px');
  });
});
