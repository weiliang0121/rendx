import type {App, Plugin, Node} from 'rendx-engine';

export interface MinimapPluginOptions {
  /** 小地图宽度（px），默认 150 */
  width?: number;
  /** 小地图高度（px），默认 110 */
  height?: number;
  /** 位置，默认 'bottom-right' */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 距容器边缘的间距（px），默认 10 */
  margin?: number;
  /** 背景色，默认 'rgba(255,255,255,0.9)' */
  background?: string;
  /** 边框色，默认 '#ccc' */
  borderColor?: string;
  /** 视口指示器边框色，默认 'rgba(24,144,255,0.8)' */
  viewportColor?: string;
  /** 节点默认填充色（当节点无 fill 时），默认 '#999' */
  nodeFill?: string;
}

const DEFAULTS: Required<MinimapPluginOptions> = {
  width: 150,
  height: 110,
  position: 'bottom-right',
  margin: 10,
  background: 'rgba(255,255,255,0.9)',
  borderColor: '#ccc',
  viewportColor: 'rgba(24,144,255,0.8)',
  nodeFill: '#999',
};

class MinimapPlugin implements Plugin {
  name = 'minimap';

  #app: App | null = null;
  #wrapper: HTMLDivElement | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #ctx: CanvasRenderingContext2D | null = null;
  #options: Required<MinimapPluginOptions>;
  #ratio = 1;

  constructor(options: MinimapPluginOptions = {}) {
    this.#options = {...DEFAULTS, ...options};
  }

  install(app: App) {
    this.#app = app;
    const container = app.container;
    if (!container) {
      throw new Error(
        '[rendx-minimap-plugin] App must be mounted before calling use(). ' +
        'Call app.mount(el) first, then app.use(minimapPlugin(...)).',
      );
    }
    this.#ratio = window.devicePixelRatio || 1;
    this.#createElements(container);
    this.draw();
  }

  #createElements(container: HTMLDivElement) {
    const {width, height, position, margin, background, borderColor} = this.#options;

    // 外层包装
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.style.zIndex = '99998'; // 仅低于事件层
    wrapper.style.pointerEvents = 'none';
    wrapper.style.background = background;
    wrapper.style.border = `1px solid ${borderColor}`;
    wrapper.style.borderRadius = '4px';
    wrapper.style.overflow = 'hidden';
    wrapper.style.boxSizing = 'border-box';

    // 定位
    switch (position) {
      case 'top-left':
        wrapper.style.top = `${margin}px`;
        wrapper.style.left = `${margin}px`;
        break;
      case 'top-right':
        wrapper.style.top = `${margin}px`;
        wrapper.style.right = `${margin}px`;
        break;
      case 'bottom-left':
        wrapper.style.bottom = `${margin}px`;
        wrapper.style.left = `${margin}px`;
        break;
      case 'bottom-right':
      default:
        wrapper.style.bottom = `${margin}px`;
        wrapper.style.right = `${margin}px`;
        break;
    }

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * this.#ratio;
    canvas.height = height * this.#ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    wrapper.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('[rendx-minimap-plugin] Could not get 2d context');
    ctx.scale(this.#ratio, this.#ratio);

    container.appendChild(wrapper);

    this.#wrapper = wrapper;
    this.#canvas = canvas;
    this.#ctx = ctx;
  }

  /**
   * 绘制小地图：
   * 1. 计算场景总包围盒
   * 2. 缩放到小地图尺寸
   * 3. 为每个节点绘制简化矩形
   * 4. 绘制视口指示器
   */
  draw() {
    const ctx = this.#ctx;
    const app = this.#app;
    if (!ctx || !app) return;

    const {width, height, nodeFill, viewportColor} = this.#options;
    ctx.clearRect(0, 0, width, height);

    // 收集所有节点及其世界包围盒
    const entries: {node: Node; minX: number; minY: number; maxX: number; maxY: number}[] = [];
    let sceneMinX = Infinity, sceneMinY = Infinity;
    let sceneMaxX = -Infinity, sceneMaxY = -Infinity;

    for (const layer of app.scene.layers) {
      if (layer.isEventLayer) continue;
      const queue = layer.getQueue();
      for (const node of queue) {
        const bb = node.getWorldBBox();
        if (!bb) continue;
        const minX = bb.x, minY = bb.y, maxX = bb.right, maxY = bb.bottom;
        entries.push({node, minX, minY, maxX, maxY});
        if (minX < sceneMinX) sceneMinX = minX;
        if (minY < sceneMinY) sceneMinY = minY;
        if (maxX > sceneMaxX) sceneMaxX = maxX;
        if (maxY > sceneMaxY) sceneMaxY = maxY;
      }
    }

    // 如果没有节点，至少显示视口
    const appW = app.cfg.width ?? 800;
    const appH = app.cfg.height ?? 600;

    if (sceneMinX > sceneMaxX) {
      sceneMinX = 0;
      sceneMinY = 0;
      sceneMaxX = appW;
      sceneMaxY = appH;
    }

    // 扩展场景范围以包含画布原点
    sceneMinX = Math.min(sceneMinX, 0);
    sceneMinY = Math.min(sceneMinY, 0);
    sceneMaxX = Math.max(sceneMaxX, appW);
    sceneMaxY = Math.max(sceneMaxY, appH);

    const sceneW = sceneMaxX - sceneMinX || 1;
    const sceneH = sceneMaxY - sceneMinY || 1;

    // 计算缩放：保持纵横比，留 4px 内边距
    const pad = 4;
    const drawW = width - pad * 2;
    const drawH = height - pad * 2;
    const scale = Math.min(drawW / sceneW, drawH / sceneH);
    const offsetX = pad + (drawW - sceneW * scale) / 2;
    const offsetY = pad + (drawH - sceneH * scale) / 2;

    // 坐标变换函数
    const tx = (x: number) => offsetX + (x - sceneMinX) * scale;
    const ty = (y: number) => offsetY + (y - sceneMinY) * scale;

    // 绘制节点简化矩形
    for (const {node, minX, minY, maxX, maxY} of entries) {
      const fill = (node.attrs.values.fill as string) || nodeFill;
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(tx(minX), ty(minY), (maxX - minX) * scale, (maxY - minY) * scale);
    }

    // 绘制视口指示器
    ctx.globalAlpha = 1;
    ctx.strokeStyle = viewportColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx(0), ty(0), appW * scale, appH * scale);
  }

  resize() {
    this.draw();
  }

  /** 更新配置并重绘 */
  update(options: Partial<MinimapPluginOptions>) {
    const needReposition = options.position !== undefined || options.margin !== undefined;
    Object.assign(this.#options, options);

    if (this.#wrapper) {
      if (options.background) this.#wrapper.style.background = options.background;
      if (options.borderColor) this.#wrapper.style.border = `1px solid ${options.borderColor}`;

      if (options.width !== undefined || options.height !== undefined) {
        const {width, height} = this.#options;
        this.#wrapper.style.width = `${width}px`;
        this.#wrapper.style.height = `${height}px`;
        if (this.#canvas) {
          this.#canvas.width = width * this.#ratio;
          this.#canvas.height = height * this.#ratio;
          this.#canvas.style.width = `${width}px`;
          this.#canvas.style.height = `${height}px`;
          if (this.#ctx) this.#ctx.scale(this.#ratio, this.#ratio);
        }
      }

      if (needReposition) {
        const {position, margin} = this.#options;
        // 清除所有方向
        this.#wrapper.style.top = '';
        this.#wrapper.style.right = '';
        this.#wrapper.style.bottom = '';
        this.#wrapper.style.left = '';
        switch (position) {
          case 'top-left':
            this.#wrapper.style.top = `${margin}px`;
            this.#wrapper.style.left = `${margin}px`;
            break;
          case 'top-right':
            this.#wrapper.style.top = `${margin}px`;
            this.#wrapper.style.right = `${margin}px`;
            break;
          case 'bottom-left':
            this.#wrapper.style.bottom = `${margin}px`;
            this.#wrapper.style.left = `${margin}px`;
            break;
          case 'bottom-right':
          default:
            this.#wrapper.style.bottom = `${margin}px`;
            this.#wrapper.style.right = `${margin}px`;
            break;
        }
      }
    }

    this.draw();
  }

  dispose() {
    if (this.#wrapper) {
      this.#wrapper.remove();
      this.#wrapper = null;
      this.#canvas = null;
      this.#ctx = null;
    }
    this.#app = null;
  }
}

/**
 * 创建小地图插件
 *
 * @example
 * ```ts
 * import {minimapPlugin} from 'rendx-minimap-plugin';
 *
 * const app = new App({width: 800, height: 600});
 * app.mount(container);
 * app.use(minimapPlugin({position: 'bottom-right'}));
 *
 * // 场景变化后手动刷新小地图
 * app.render();
 * (app.getPlugin('minimap') as any).draw();
 * ```
 */
export function minimapPlugin(options?: MinimapPluginOptions): MinimapPlugin {
  return new MinimapPlugin(options);
}
