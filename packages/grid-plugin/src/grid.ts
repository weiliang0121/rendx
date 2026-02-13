import type {App, Plugin} from '@dye/engine';

export interface GridPluginOptions {
  /** 点阵间距（px），默认 20 */
  spacing?: number;
  /** 点半径（px），默认 1 */
  dotRadius?: number;
  /** 点颜色，默认 '#d0d0d0' */
  color?: string;
  /** 层级 z-index，默认 -1（在所有渲染层下方） */
  zIndex?: number;
}

const DEFAULTS: Required<GridPluginOptions> = {
  spacing: 20,
  dotRadius: 1,
  color: '#d0d0d0',
  zIndex: -1,
};

class GridPlugin implements Plugin {
  name = 'grid';

  #app: App | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #ctx: CanvasRenderingContext2D | null = null;
  #options: Required<GridPluginOptions>;

  constructor(options: GridPluginOptions = {}) {
    this.#options = {...DEFAULTS, ...options};
  }

  install(app: App) {
    this.#app = app;
    const container = app.container;
    if (!container) {
      throw new Error(
        '[@dye/grid-plugin] App must be mounted before calling use(). ' +
        'Call app.mount(el) first, then app.use(gridPlugin(...)).',
      );
    }
    this.#createCanvas(container);
    this.draw();
  }

  #createCanvas(container: HTMLDivElement) {
    const {width, height} = this.#app!.cfg;
    const w = width ?? 800;
    const h = height ?? 600;

    const canvas = document.createElement('canvas');
    const ratio = window.devicePixelRatio || 1;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.zIndex = String(this.#options.zIndex);
    canvas.style.pointerEvents = 'none';

    // 插入为容器第一个子元素（在所有渲染层下方）
    container.insertBefore(canvas, container.firstChild);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('[@dye/grid-plugin] Could not get 2d context');
    ctx.scale(ratio, ratio);

    this.#canvas = canvas;
    this.#ctx = ctx;
  }

  /** 绘制点阵网格 */
  draw() {
    const ctx = this.#ctx;
    const canvas = this.#canvas;
    if (!ctx || !canvas) return;

    const {width, height} = this.#app!.cfg;
    const w = width ?? 800;
    const h = height ?? 600;
    const {spacing, dotRadius, color} = this.#options;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;

    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** 调整网格 Canvas 尺寸并重绘（由 App.resize 或外部触发） */
  resize(width: number, height: number) {
    const canvas = this.#canvas;
    const ctx = this.#ctx;
    if (!canvas || !ctx) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(ratio, ratio);
    this.draw();
  }

  /** 更新配置并重绘 */
  update(options: Partial<GridPluginOptions>) {
    Object.assign(this.#options, options);
    if (options.zIndex !== undefined && this.#canvas) {
      this.#canvas.style.zIndex = String(options.zIndex);
    }
    this.draw();
  }

  dispose() {
    if (this.#canvas) {
      this.#canvas.remove();
      this.#canvas = null;
      this.#ctx = null;
    }
    this.#app = null;
  }
}

/**
 * 创建点阵网格背景插件
 *
 * @example
 * ```ts
 * import {gridPlugin} from '@dye/grid-plugin';
 *
 * const app = new App({width: 800, height: 600});
 * app.mount(container);
 * app.use(gridPlugin({spacing: 20, color: '#ccc'}));
 * ```
 */
export function gridPlugin(options?: GridPluginOptions): GridPlugin {
  return new GridPlugin(options);
}
