type ImageSource = HTMLImageElement | ImageBitmap;

interface LoadEntry {
  source: ImageSource | null;
  ready: boolean;
  listeners: Set<() => void>;
}

class ImageLoader {
  #cache = new Map<string, LoadEntry>();

  /** 全局回调：任何图片加载完成时触发（用于重启渲染循环） */
  onChange: (() => void) | null = null;

  load(src: string, onReady?: () => void): ImageSource | null {
    let entry = this.#cache.get(src);
    if (!entry) {
      entry = this.#createEntry(src);
      this.#cache.set(src, entry);
    }
    if (onReady && !entry.ready) entry.listeners.add(onReady);
    return entry.source;
  }

  #createEntry(src: string): LoadEntry {
    const listeners = new Set<() => void>();
    const entry: LoadEntry = {source: null, ready: false, listeners};
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      entry.source = img;
      entry.ready = true;
      listeners.forEach(fn => fn());
      listeners.clear();
      this.onChange?.();
    };
    img.src = src;
    return entry;
  }

  get(src: string): ImageSource | null {
    return this.#cache.get(src)?.source ?? null;
  }

  has(src: string): boolean {
    return this.#cache.get(src)?.ready ?? false;
  }

  clear() {
    this.#cache.clear();
  }
}

export const imageLoader = new ImageLoader();
