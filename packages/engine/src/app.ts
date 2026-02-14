import EventEmitter from 'eventemitter3';

import {Scene} from './scene';
import {Layer} from './scene/layer';
import {EventObserver} from './events';
import {Scheduler} from './scheduler';
import {serialize, deserialize} from './serialization';
import {imageLoader} from './core/image-loader';

import type {Mat2d} from 'rendx-core';
import type {RendererConfig} from './renderers/renderer';
import type {RendxJSON} from './serialization';
import type {Plugin} from './plugin';

export interface AppConfig extends RendererConfig {
  layers?: string[];
  /** 是否监听容器尺寸变化自动 resize（默认 false） */
  autoResize?: boolean;
}

/** state 元信息（调试/快照用） */
interface StateMeta {
  owner: string;
  description: string;
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

  /**
   * 中心化事件总线 — 纯信号（不传数据）。
   * 插件通过 `app.bus.emit('eventName')` 发布信号，
   * 消费方通过 `app.bus.on('eventName', handler)` 订阅。
   */
  bus = new EventEmitter();

  #rafId: number | null = null;
  #renderDirty = false;
  #mounted = false;
  #container: HTMLDivElement | null = null;
  #eventLayer: Layer;
  #resizeObserver: ResizeObserver | null = null;
  #plugins: Plugin[] = [];

  // ========================
  // State Management
  // ========================
  #state = new Map<string, unknown>();
  #stateMeta = new Map<string, StateMeta>();
  #scheduler: Scheduler;

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

    // 调度器：batch state 通知到微任务
    this.#scheduler = new Scheduler(keys => {
      for (const key of keys) {
        this.bus.emit(`state:${key}`);
      }
    });

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
   * 获取或创建图层（get-or-create 语义）。
   * 多个插件声明同名图层时，只会创建一次。
   * @param name - 层名称
   * @param zIndex - 层级（仅在首次创建时生效）
   */
  acquireLayer(name: string, zIndex: number): Layer {
    const existing = this.scene.getLayer(name);
    if (existing) return existing;
    return this.addLayer(name, zIndex);
  }

  /**
   * 注册插件。流程：
   * 1. 去重检查（同名跳过）
   * 2. 注册 state 声明（key 冲突则抛错）
   * 3. 自动 acquireLayer（声明的图层）
   * 4. 调用 plugin.install(app)
   *
   * @param plugin - 实现 Plugin 接口的插件实例
   */
  use(plugin: Plugin) {
    if (this.#plugins.some(p => p.name === plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered.`);
      return this;
    }

    // 注册 state 声明
    if (plugin.state) {
      for (const decl of plugin.state) {
        if (this.#stateMeta.has(decl.key)) {
          const owner = this.#stateMeta.get(decl.key)!.owner;
          throw new Error(`State key "${decl.key}" already declared by plugin "${owner}". ` + `Plugin "${plugin.name}" cannot redeclare it.`);
        }
        this.#stateMeta.set(decl.key, {owner: plugin.name, description: decl.description});
        this.#state.set(decl.key, decl.initial);
      }
    }

    // 自动创建/复用图层
    if (plugin.layers) {
      for (const decl of plugin.layers) {
        this.acquireLayer(decl.name, decl.zIndex);
      }
    }

    this.#plugins.push(plugin);
    plugin.install(this);
    return this;
  }

  /** 获取已注册的插件 */
  getPlugin(name: string): Plugin | undefined {
    return this.#plugins.find(p => p.name === name);
  }

  // ========================
  // Centralized State
  // ========================

  /**
   * 写入 state（同步写入 + 异步批量通知）。
   * key 必须先由某个插件在 `state[]` 中声明，否则抛错。
   * 写入后立即可通过 `getState()` 读到最新值，通知在微任务中批量发出。
   */
  setState(key: string, value: unknown) {
    if (!this.#stateMeta.has(key)) {
      throw new Error(`State key "${key}" is not declared by any plugin. ` + `Plugins must declare state keys in their "state" array.`);
    }
    this.#state.set(key, value);
    this.#scheduler.markState(key);
  }

  /**
   * 读取 state（同步读取，始终返回最新值）。
   * @returns 对应 key 的当前值，不存在则返回 undefined
   */
  getState<T>(key: string): T | undefined {
    return this.#state.get(key) as T | undefined;
  }

  /**
   * 导出完整 state 快照（调试/devtools 用）。
   * 返回每个 key 的当前值、所属插件和描述信息。
   */
  dumpState(): Record<string, {value: unknown; owner: string; description: string}> {
    const result: Record<string, {value: unknown; owner: string; description: string}> = {};
    for (const [key, value] of this.#state) {
      const meta = this.#stateMeta.get(key)!;
      result[key] = {value, owner: meta.owner, description: meta.description};
    }
    return result;
  }

  /** 同步渲染一帧。适用于静态内容，仅重绘脏层 */
  render() {
    for (const layer of this.scene.layers) {
      if (layer.sign()) {
        layer.draw();
      }
    }
  }

  /** 请求异步渲染帧（幂等，一帧只执行一次）。无变化时自动停止 rAF 链 */
  requestRender() {
    this.#renderDirty = true;
    if (this.#rafId === null) {
      this.#rafId = requestAnimationFrame(t => this.#frame(t));
    }
  }

  #frame(time: number) {
    // 先清标记，frame 执行期间如果又有新请求会重新标脏
    this.#renderDirty = false;

    this.scene.tick(time);

    let anyDirty = false;
    for (const layer of this.scene.layers) {
      if (layer.sign()) {
        layer.draw();
        anyDirty = true;
      }
    }

    // 决定是否继续下一帧：
    // 1. 有脏层（动画还在跑）→ 继续
    // 2. frame 执行期间又有新的 requestRender 调用 → 继续
    // 3. 否则彻底停止，等下次 requestRender 唤醒
    if (anyDirty || this.#renderDirty) {
      this.#rafId = requestAnimationFrame(t => this.#frame(t));
    } else {
      this.#rafId = null;
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

    // 清理事件总线和状态
    this.bus.removeAllListeners();
    this.#state.clear();
    this.#stateMeta.clear();
    this.#scheduler.clear();

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
  toJSON(): RendxJSON {
    return serialize(this.scene.layers, this.cfg.width ?? 800, this.cfg.height ?? 600);
  }

  /**
   * 从 JSON 快照创建新的 App 实例（静态工厂方法）
   * @param json - 由 toJSON() 生成的场景快照
   * @param cfg - 可选的额外配置（会与 json 中的 width/height 合并）
   */
  static fromJSON(json: RendxJSON, cfg: Partial<AppConfig> = {}): App {
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
  restoreFromJSON(json: RendxJSON) {
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
