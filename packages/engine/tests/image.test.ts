import {describe, it, expect, vi} from 'vitest';

import {ImageShape} from '../src/shapes/image';
import {imageLoader} from '../src/core/image-loader';

describe('ImageShape', () => {
  describe('fromElement', () => {
    it('直接设置已加载的图片', () => {
      const shape = new ImageShape();
      const fakeImg = document.createElement('img');
      shape.fromElement(fakeImg, 10, 20, 64, 32);

      expect(shape.source).toBe(fakeImg);
      expect(shape.x).toBe(10);
      expect(shape.y).toBe(20);
      expect(shape.width).toBe(64);
      expect(shape.height).toBe(32);
      expect(shape.needUpdate).toBe(true);
    });

    it('command 为 image', () => {
      const shape = new ImageShape();
      expect(shape.command).toBe('image');
    });
  });

  describe('hit', () => {
    it('点在矩形内返回 true', () => {
      const shape = new ImageShape();
      shape.fromElement(document.createElement('img'), 10, 10, 50, 50);
      expect(shape.hit([25, 25])).toBe(true);
      expect(shape.hit([10, 10])).toBe(true);
      expect(shape.hit([60, 60])).toBe(true);
    });

    it('点在矩形外返回 false', () => {
      const shape = new ImageShape();
      shape.fromElement(document.createElement('img'), 10, 10, 50, 50);
      expect(shape.hit([9, 25])).toBe(false);
      expect(shape.hit([61, 25])).toBe(false);
      expect(shape.hit([25, 9])).toBe(false);
      expect(shape.hit([25, 61])).toBe(false);
    });
  });

  describe('box', () => {
    it('返回正确的 BoundingBox', () => {
      const shape = new ImageShape();
      shape.fromElement(document.createElement('img'), 5, 10, 100, 60);
      const bb = shape.box();
      expect(bb.x).toBe(5);
      expect(bb.y).toBe(10);
      expect(bb.width).toBe(100);
      expect(bb.height).toBe(60);
    });
  });

  describe('from (URL 方式)', () => {
    it('调用 imageLoader.load', () => {
      const loadSpy = vi.spyOn(imageLoader, 'load').mockReturnValue(null);
      const shape = new ImageShape();
      shape.from('https://example.com/icon.png', 0, 0, 32, 32);

      expect(loadSpy).toHaveBeenCalledWith('https://example.com/icon.png', expect.any(Function));
      expect(shape.src).toBe('https://example.com/icon.png');
      expect(shape.source).toBeNull();
      loadSpy.mockRestore();
    });

    it('同一 URL 不重复加载', () => {
      const loadSpy = vi.spyOn(imageLoader, 'load').mockReturnValue(null);
      const shape = new ImageShape();
      shape.from('https://example.com/a.png', 0, 0, 32, 32);
      shape.from('https://example.com/a.png', 10, 10, 64, 64);

      // load 仅在 src 变化时调用
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(shape.x).toBe(10);
      expect(shape.y).toBe(10);
      loadSpy.mockRestore();
    });

    it('URL 变化时重新加载', () => {
      const loadSpy = vi.spyOn(imageLoader, 'load').mockReturnValue(null);
      const shape = new ImageShape();
      shape.from('https://example.com/a.png', 0, 0, 32, 32);
      shape.from('https://example.com/b.png', 0, 0, 32, 32);

      expect(loadSpy).toHaveBeenCalledTimes(2);
      expect(shape.src).toBe('https://example.com/b.png');
      loadSpy.mockRestore();
    });
  });
});

describe('ImageLoader', () => {
  it('初始状态为空', () => {
    expect(imageLoader.has('nonexistent')).toBe(false);
    expect(imageLoader.get('nonexistent')).toBeNull();
  });

  it('clear 清除缓存', () => {
    // 调用 clear 不应抛错
    expect(() => imageLoader.clear()).not.toThrow();
  });
});
