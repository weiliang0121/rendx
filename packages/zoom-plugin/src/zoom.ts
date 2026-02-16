import type {App, Plugin} from 'rendx-engine';

// ── Types ─────────────────────────────────────────────────

export interface ZoomPluginOptions {
  /** 最小缩放比例（默认 0.1） */
  minZoom?: number;
  /** 最大缩放比例（默认 5） */
  maxZoom?: number;
  /** 每次滚轮缩放的步进（默认 0.1） */
  zoomStep?: number;
  /** 是否启用滚轮缩放（默认 true） */
  enableWheelZoom?: boolean;
  /** 是否启用 Ctrl/Meta + 滚轮缩放模式（默认 true）。
   *  - true: 需按住 Ctrl/Meta 才缩放（或触控板 pinch），普通滚轮为平移
   *  - false: 滚轮直接缩放 */
  ctrlZoom?: boolean;
  /** 是否启用空格 + 拖拽平移（默认 true） */
  enableSpacePan?: boolean;
  /** 是否启用鼠标中键拖拽平移（默认 true） */
  enableMiddleButtonPan?: boolean;
  /** 触控板 pinch 缩放灵敏度（默认 0.01） */
  pinchSensitivity?: number;
  /** 缩放变化时的回调 */
  onZoomChange?: (e: ZoomChangeEvent) => void;
}

export interface ZoomChangeEvent {
  /** 当前缩放比例 */
  zoom: number;
  /** 当前平移 [tx, ty] */
  pan: [number, number];
}

// ── Defaults ──────────────────────────────────────────────

const DEFAULTS: Required<Omit<ZoomPluginOptions, 'onZoomChange'>> & {onZoomChange: null} = {
  minZoom: 0.1,
  maxZoom: 5,
  zoomStep: 0.1,
  enableWheelZoom: true,
  ctrlZoom: true,
  enableSpacePan: true,
  enableMiddleButtonPan: true,
  pinchSensitivity: 0.01,
  onZoomChange: null,
};

// ── Plugin ────────────────────────────────────────────────

class ZoomPlugin implements Plugin {
  readonly name = 'zoom';

  #app: App | null = null;
  #opts: Required<Omit<ZoomPluginOptions, 'onZoomChange'>> & {onZoomChange: ((e: ZoomChangeEvent) => void) | null};
  #zoom = 1;

  // Pan state
  #isPanning = false;
  #spaceDown = false;
  #panStart: [number, number] = [0, 0];
  #middleButtonPanning = false;

  // Cleanup
  #cleanups: (() => void)[] = [];

  constructor(options: ZoomPluginOptions = {}) {
    this.#opts = {
      ...DEFAULTS,
      ...options,
      onZoomChange: options.onZoomChange ?? null,
    };
  }

  // ════════════════════════════════════════════
  //  Plugin lifecycle
  // ════════════════════════════════════════════

  install(app: App) {
    this.#app = app;
    const container = app.container;
    if (!container) {
      throw new Error('[rendx-zoom-plugin] App must be mounted before calling use(). ' + 'Call app.mount(el) first, then app.use(zoomPlugin(...)).');
    }
    this.#bindEvents(container);
  }

  resize() {
    // no-op — zoom state is independent of canvas size
  }

  dispose() {
    for (const fn of this.#cleanups) fn();
    this.#cleanups = [];
    this.#app = null;
  }

  // ════════════════════════════════════════════
  //  Public API
  // ════════════════════════════════════════════

  /** 获取当前缩放比例 */
  getZoom(): number {
    return this.#zoom;
  }

  /** 获取当前平移量 [tx, ty]（场景空间） */
  getPan(): [number, number] {
    if (!this.#app) return [0, 0];
    const t = this.#app.scene.translation;
    return [t[0], t[1]];
  }

  /**
   * 以指定中心点设置缩放比例
   * @param zoom  目标缩放值
   * @param cx    缩放中心 X（容器像素坐标），默认容器中心
   * @param cy    缩放中心 Y（容器像素坐标），默认容器中心
   */
  setZoom(zoom: number, cx?: number, cy?: number) {
    if (!this.#app) return;
    const {minZoom, maxZoom} = this.#opts;
    zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    const oldZoom = this.#zoom;
    if (Math.abs(zoom - oldZoom) < 0.001) return;

    const scene = this.#app.scene;
    const [stx, sty] = scene.translation;
    const container = this.#app.container!;
    const rect = container.getBoundingClientRect();
    const centerX = cx ?? rect.width / 2;
    const centerY = cy ?? rect.height / 2;

    // Zoom around the focal point:
    // world = (screen - translate) / oldZoom
    // newTranslate = screen - world * newZoom
    const worldCX = (centerX - stx) / oldZoom;
    const worldCY = (centerY - sty) / oldZoom;
    const newTx = centerX - worldCX * zoom;
    const newTy = centerY - worldCY * zoom;

    scene.translate(newTx, newTy);
    scene.scale(zoom, zoom);

    this.#zoom = zoom;
    this.#app.render();
    this.#emitChange();
  }

  /**
   * 相对缩放（步进）
   * @param delta  正值放大，负值缩小
   * @param cx     缩放中心 X
   * @param cy     缩放中心 Y
   */
  zoomBy(delta: number, cx?: number, cy?: number) {
    this.setZoom(this.#zoom + delta, cx, cy);
  }

  /** 放大一步 */
  zoomIn() {
    this.setZoom(this.#zoom + this.#opts.zoomStep);
  }

  /** 缩小一步 */
  zoomOut() {
    this.setZoom(this.#zoom - this.#opts.zoomStep);
  }

  /**
   * 平移画布
   * @param dx  X 方向平移量（屏幕像素）
   * @param dy  Y 方向平移量（屏幕像素）
   */
  panBy(dx: number, dy: number) {
    if (!this.#app) return;
    this.#app.scene.translateXY(dx, dy);
    this.#app.render();
    this.#emitChange();
  }

  /**
   * 重置缩放和平移到初始状态（zoom=1, pan=[0,0]）
   */
  reset() {
    if (!this.#app) return;
    const scene = this.#app.scene;
    scene.translate(0, 0);
    scene.scale(1, 1);
    this.#zoom = 1;
    this.#app.render();
    this.#emitChange();
  }

  /**
   * 适应视口：将内容居中并缩放到合适大小
   * @param padding  内边距（像素），默认 40
   */
  fitView(padding = 40) {
    if (!this.#app) return;
    // First reset
    this.reset();

    // Get scene bounds
    const scene = this.#app.scene;
    const defaultLayer = this.#app.getLayer('default');
    if (!defaultLayer) return;

    const queue = defaultLayer.getQueue();
    if (queue.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const node of queue) {
      const bb = node.getWorldBBox();
      if (!bb || bb.empty) continue;
      if (bb.x < minX) minX = bb.x;
      if (bb.y < minY) minY = bb.y;
      if (bb.right > maxX) maxX = bb.right;
      if (bb.bottom > maxY) maxY = bb.bottom;
    }

    if (!isFinite(minX)) return;

    const container = this.#app.container!;
    const rect = container.getBoundingClientRect();
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const viewW = rect.width - padding * 2;
    const viewH = rect.height - padding * 2;

    if (contentW <= 0 || contentH <= 0 || viewW <= 0 || viewH <= 0) return;

    const zoom = Math.min(viewW / contentW, viewH / contentH, 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const targetTx = rect.width / 2 - centerX * zoom;
    const targetTy = rect.height / 2 - centerY * zoom;

    scene.translate(targetTx, targetTy);
    scene.scale(zoom, zoom);
    this.#zoom = zoom;
    this.#app.render();
    this.#emitChange();
  }

  /** 判断是否正在平移 */
  isPanning(): boolean {
    return this.#isPanning || this.#middleButtonPanning;
  }

  // ════════════════════════════════════════════
  //  Event binding
  // ════════════════════════════════════════════

  #bindEvents(container: HTMLElement) {
    // Wheel
    if (this.#opts.enableWheelZoom) {
      const onWheel = (e: WheelEvent) => this.#onWheel(e);
      container.addEventListener('wheel', onWheel, {passive: false});
      this.#cleanups.push(() => container.removeEventListener('wheel', onWheel));
    }

    // Space pan
    if (this.#opts.enableSpacePan) {
      const onKeyDown = (e: KeyboardEvent) => this.#onKeyDown(e, container);
      const onKeyUp = (e: KeyboardEvent) => this.#onKeyUp(e, container);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      this.#cleanups.push(() => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      });
    }

    // Pointer events for panning
    const onPointerDown = (e: PointerEvent) => this.#onPointerDown(e, container);
    const onPointerMove = (e: PointerEvent) => this.#onPointerMove(e);
    const onPointerUp = () => this.#onPointerUp(container);

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    this.#cleanups.push(() => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    });
  }

  // ════════════════════════════════════════════
  //  Event handlers
  // ════════════════════════════════════════════

  #onWheel(e: WheelEvent) {
    e.preventDefault();

    const hasModifier = e.ctrlKey || e.metaKey;

    // Determine if this is a zoom or pan gesture:
    // - ctrlZoom=true (default): Ctrl/Meta + wheel = zoom, plain wheel = pan
    //   (trackpad pinch fires with ctrlKey=true automatically)
    // - ctrlZoom=false: plain wheel = zoom, Ctrl/Meta + wheel = also zoom (pinch)
    const shouldZoom = this.#opts.ctrlZoom ? hasModifier : true;

    if (shouldZoom) {
      if (hasModifier) {
        // Pinch / Ctrl+wheel → smooth zoom (trackpad pinch sends fine-grained deltaY with ctrlKey)
        const delta = -e.deltaY * this.#opts.pinchSensitivity;
        this.setZoom(this.#zoom * (1 + delta), e.offsetX, e.offsetY);
      } else {
        // Regular wheel → step zoom (only reaches here when ctrlZoom=false)
        const delta = e.deltaY > 0 ? -this.#opts.zoomStep : this.#opts.zoomStep;
        this.setZoom(this.#zoom + delta, e.offsetX, e.offsetY);
      }
    } else {
      // Pan (only reaches here when ctrlZoom=true and no modifier pressed)
      const dx = -e.deltaX;
      const dy = -e.deltaY;
      this.panBy(dx, dy);
    }
  }

  #onKeyDown(e: KeyboardEvent, container: HTMLElement) {
    if (e.code === 'Space' && !e.repeat && !this.#isEditing()) {
      e.preventDefault();
      this.#spaceDown = true;
      container.style.cursor = 'grab';
    }
  }

  #onKeyUp(e: KeyboardEvent, container: HTMLElement) {
    if (e.code === 'Space') {
      this.#spaceDown = false;
      this.#isPanning = false;
      container.style.cursor = '';
    }
  }

  #onPointerDown(e: PointerEvent, container: HTMLElement) {
    // Space + click → start panning
    if (this.#spaceDown) {
      this.#isPanning = true;
      this.#panStart = [e.clientX, e.clientY];
      container.style.cursor = 'grabbing';
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Middle button → start panning
    if (this.#opts.enableMiddleButtonPan && e.button === 1) {
      this.#middleButtonPanning = true;
      this.#panStart = [e.clientX, e.clientY];
      container.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  #onPointerMove(e: PointerEvent) {
    if (!this.#isPanning && !this.#middleButtonPanning) return;
    const dx = e.clientX - this.#panStart[0];
    const dy = e.clientY - this.#panStart[1];
    this.#panStart = [e.clientX, e.clientY];
    this.panBy(dx, dy);
  }

  #onPointerUp(container: HTMLElement) {
    if (this.#isPanning) {
      this.#isPanning = false;
      container.style.cursor = this.#spaceDown ? 'grab' : '';
    }
    if (this.#middleButtonPanning) {
      this.#middleButtonPanning = false;
      container.style.cursor = '';
    }
  }

  #isEditing(): boolean {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  #emitChange() {
    const event: ZoomChangeEvent = {
      zoom: this.#zoom,
      pan: this.getPan(),
    };
    this.#opts.onZoomChange?.(event);
    this.#app?.bus.emit('zoom:change', event);
  }
}

/**
 * 创建画布缩放平移插件
 *
 * @example
 * ```ts
 * import {zoomPlugin} from 'rendx-zoom-plugin';
 *
 * const app = new App({width: 800, height: 600});
 * app.mount(container);
 *
 * const zoom = zoomPlugin({minZoom: 0.2, maxZoom: 4});
 * app.use(zoom);
 *
 * // 编程式控制
 * zoom.zoomIn();
 * zoom.zoomOut();
 * zoom.setZoom(1.5, 400, 300); // 以 (400,300) 为中心缩放到 150%
 * zoom.panBy(100, 50);          // 平移
 * zoom.reset();                 // 重置
 * zoom.fitView();               // 适应视口
 * ```
 */
export function zoomPlugin(options?: ZoomPluginOptions): ZoomPlugin {
  return new ZoomPlugin(options);
}
