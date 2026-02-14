import {Scene} from './scene';
import {Layer} from './scene/layer';
import {EventObserver} from './events';
import {serialize, deserialize} from './serialization';
import {imageLoader} from './core/image-loader';

import type {Mat2d} from 'rendx-core';
import type {RendererConfig} from './renderers/renderer';
import type {DyeJSON} from './serialization';
import type {Plugin} from './plugin';

export interface AppConfig extends RendererConfig {
  layers?: string[];
  /** 是否监听容器尺寸变化自动 resize（默认 false） */
  autoResize?: boolean;
}

/**
 * Rendx 引擎顶层控制器，负责场景、渲染层、事件和插件的统一管理。
 *
 * @example
 * ```ts
 * const app = new App({ width: 800, height: 600 });
 * app.mount(document.getElementById('container')!);
 *
 * const circle = Node.create('circle', { fill: '#f00' });
 * circle.shape.from(400, 300, 50);
 * app.scene.add(circle);
 * app.render();
 * ```
 */
export class App {
  cfg: AppConfig;
  scene: Scene;
  observer: EventObserver;
  #rafId: number | null = null;
  #mounted = false;
  #container: HTMLDivElement | null = null;
  #eventLayer: Layer;
  #resizeObserver: ResizeObserver | null = null;
  #plugins: Plugin[] = [];

  /** 挂载容器（供插件访问） */
  get container(): HTMLDivElement | null {
    return this.#container;
  }

  /** 是否已挂载 */
  get mounted(): boolean {
    return this.#mounted;
  }

  /**
   * @param cfg - 引擎配置（width/height/layers/autoResize 等）
   */
  constructor(cfg: Partial<AppConfig> = {}) {
    this.cfg = cfg as AppConfig;
    this.scene = new Scene();

    // 创建内置事件层（透明 Canvas，不渲染，仅接收事件）
    this.#eventLayer = new Layer('__event__', 99999, this.cfg, true);
    this.scene.registerLayer(this.#eventLayer);

    // 创建默认渲染层
    this.scene.registerLayer(new Layer('default', 0, this.cfg));

    // 创建用户指定的额外渲染层
    if (cfg.layers) {
      cfg.layers.forEach((name, i) => {
        if (name === 'default') return; // 已创建
        this.scene.registerLayer(new Layer(name, i + 1, this.cfg));
      });
    }

    // EventObserver 绑定事件层的 Renderer
    this.observer = new EventObserver(this.scene, this.#eventLayer.renderer);

    // 图片加载完成时自动重启渲染循环
    imageLoader.onChange = () => this.requestRender();
  }

  /**
   * 挂载到 DOM 容器，初始化渲染层并绑定事件。必须在 render() 之前调用。
   * @param container - 目标 DOM 元素，引擎会在其中创建 Canvas 元素
   */
  mount(container: HTMLElement) {
    if (this.#mounted) return this;

    // 创建包装 DIV（position:relative），所有 Canvas 堆叠其中
    this.#container = document.createElement('div');
    this.#container.style.position = 'relative';
    this.#container.style.width = `${this.cfg.width ?? 800}px`;
    this.#container.style.height = `${this.cfg.height ?? 600}px`;
    this.#container.style.overflow = 'hidden';
    container.appendChild(this.#container);

    // 按 layerIndex 顺序挂载各层 Canvas
    const viewMatrix = this.#eventLayer.renderer.viewMatrix as Mat2d;
    for (const layer of this.scene.layers) {
      this.#container.appendChild(layer.renderer.el);
      layer.setMatrix(viewMatrix);
    }

    this.scene.setMatrix(viewMatrix);
    this.observer.bindEvents();
    this.#mounted = true;

    // 自动 resize
    if (this.cfg.autoResize) {
      this.#resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        if (!entry) return;
        const {width, height} = entry.contentRect;
        if (width > 0 && height > 0) {
          this.resize(width, height);
        }
      });
      this.#resizeObserver.observe(container);
    }

    return this;
  }

  /** 添加渲染层 */
  addLayer(name: string, index: number) {
    if (this.scene.getLayer(name)) {
      throw new Error(`Layer "${name}" already exists.`);
    }
    const layer = new Layer(name, index, this.cfg);
    this.scene.registerLayer(layer);

    // 如果已挂载，动态插入 DOM (在事件层之前)
    if (this.#mounted && this.#container) {
      const viewMatrix = this.#eventLayer.renderer.viewMatrix as Mat2d;
      layer.setMatrix(viewMatrix);
      // 事件层始终在最上面，其他层按 z-index 排列
      this.#container.insertBefore(layer.renderer.el, this.#eventLayer.renderer.el);
    }
    return layer;
  }

  /** 获取层 */
  getLayer(name: string) {
    return this.scene.getLayer(name);
  }

  /**
   * 注册插件（同名插件不会重复注册）
   * @param plugin - 实现 Plugin 接口的插件实例
   */
  use(plugin: Plugin) {
    if (this.#plugins.some(p => p.name === plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered.`);
      return this;
    }
    this.#plugins.push(plugin);
    plugin.install(this);
    return this;
  }

  /** 获取已注册的插件 */
  getPlugin(name: string): Plugin | undefined {
    return this.#plugins.find(p => p.name === name);
  }

  /** 同步渲染一帧。适用于静态内容，仅重绘脏层 */
  render() {
    for (const layer of this.scene.layers) {
      if (layer.sign()) {
        layer.draw();
      }
    }
  }

  /** 请求异步渲染循环（rAF），有动画时自动继续，无变化时停止 */
  requestRender() {
    if (this.#rafId !== null) return;
    this.#rafId = requestAnimationFrame(t => this.#tick(t));
  }

  #tick(time: number) {
    this.#rafId = null;
    this.scene.tick(time);

    let anyDirty = false;
    for (const layer of this.scene.layers) {
      if (layer.sign()) {
        layer.draw();
        anyDirty = true;
      }
    }

    if (anyDirty) {
      this.requestRender();
    }
  }

  /**
   * 调整画布尺寸，同步更新所有层、容器和视口矩阵
   * @param width - 新宽度（像素）
   * @param height - 新高度（像素）
   */
  resize(width: number, height: number) {
    this.cfg.width = width;
    this.cfg.height = height;

    // 同步 resize 所有层
    for (const layer of this.scene.layers) {
      layer.resize({width, height});
    }

    // 更新容器尺寸
    if (this.#container) {
      this.#container.style.width = `${width}px`;
      this.#container.style.height = `${height}px`;
    }

    // 所有层共享同一 viewMatrix
    const viewMatrix = this.#eventLayer.renderer.viewMatrix as Mat2d;
    this.scene.setMatrix(viewMatrix);
    for (const layer of this.scene.layers) {
      layer.setMatrix(viewMatrix);
    }

    // 通知插件 resize
    for (const plugin of this.#plugins) {
      plugin.resize?.(width, height);
    }
  }

  clear() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    for (const layer of this.scene.layers) {
      layer.clear();
    }
  }

  dispose() {
    this.clear();

    // 卸载所有插件
    for (const plugin of this.#plugins) {
      plugin.dispose?.();
    }
    this.#plugins = [];

    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
    for (const layer of this.scene.layers) {
      layer.dispose();
    }
    this.observer.dispose();
    this.scene.dispose();
    if (this.#container) {
      this.#container.remove();
      this.#container = null;
    }
  }

  // ========================
  // Export & Serialization
  // ========================

  /** 将所有渲染层合成到一个 Canvas 上并返回 */
  toCanvas(): HTMLCanvasElement {
    this.render();
    const width = this.cfg.width ?? 800;
    const height = this.cfg.height ?? 600;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    for (const layer of this.scene.layers) {
      if (layer.isEventLayer) continue;
      ctx.drawImage(layer.renderer.el as HTMLCanvasElement, 0, 0);
    }
    return canvas;
  }

  /** 序列化所有渲染层的场景图为 JSON，可用于保存/回放 */
  toJSON(): DyeJSON {
    return serialize(this.scene.layers, this.cfg.width ?? 800, this.cfg.height ?? 600);
  }

  /**
   * 从 JSON 快照创建新的 App 实例（静态工厂方法）
   * @param json - 由 toJSON() 生成的场景快照
   * @param cfg - 可选的额外配置（会与 json 中的 width/height 合并）
   */
  static fromJSON(json: DyeJSON, cfg: Partial<AppConfig> = {}): App {
    const merged: Partial<AppConfig> = {
      ...cfg,
      width: json.width,
      height: json.height,
    };
    const app = new App(merged);

    // 移除默认层（fromJSON 自行管理层）
    app.scene.removeLayer('default');

    // 反序列化各层
    const layers = deserialize(json, merged);
    for (const layer of layers) {
      app.scene.registerLayer(layer);
    }

    return app;
  }

  /**
   * 将 JSON 快照恢复到当前 App 实例（就地替换所有渲染层内容）。
   * 与静态 fromJSON 不同，此方法不创建新 App，保留挂载状态和插件。
   */
  restoreFromJSON(json: DyeJSON) {
    // 收集需要移除的渲染层名称（跳过事件层）
    const names = this.scene.layers.filter(l => !l.isEventLayer).map(l => l.layerName);
    for (const name of names) {
      this.scene.removeLayer(name);
    }

    // 反序列化新层并注册
    const layers = deserialize(json, this.cfg);
    const viewMatrix = this.#eventLayer.renderer.viewMatrix as Mat2d;
    for (const layer of layers) {
      this.scene.registerLayer(layer);
      if (this.#mounted && this.#container) {
        layer.setMatrix(viewMatrix);
        this.#container.insertBefore(layer.renderer.el, this.#eventLayer.renderer.el);
      }
    }
  }
}
