import {Renderer} from './renderers';
import {Scene} from './scene';
import {EventObserver} from './events';

import type {Mat2d} from '@dye/core';
import type {RendererConfig} from './renderers/renderer';

export type AppConfig = RendererConfig;

export class App {
  cfg: AppConfig;
  scene: Scene;
  renderer: Renderer;
  observer: EventObserver;
  #rafId: number | null = null;
  #mounted = false;

  constructor(cfg: Partial<AppConfig> = {}) {
    this.cfg = cfg as AppConfig;
    this.scene = new Scene();
    this.renderer = new Renderer(this.cfg);
    this.observer = new EventObserver(this.scene, this.renderer);
  }

  /** 挂载到 DOM 容器 */
  mount(container: HTMLElement) {
    if (this.#mounted) return this;
    container.appendChild(this.renderer.el);
    this.scene.setMatrix(this.renderer.viewMatrix as Mat2d);
    this.observer.bindEvents();
    this.#mounted = true;
    return this;
  }

  /** 同步渲染一帧（适用于静态内容） */
  render() {
    if (!this.scene.sign()) return;
    this.scene.update();
    this.renderer.draw(this.scene.getQueue());
  }

  /** 请求异步渲染，自动维持动画循环直到无变化 */
  requestRender() {
    if (this.#rafId !== null) return;
    this.#rafId = requestAnimationFrame(t => this.#tick(t));
  }

  #tick(time: number) {
    this.#rafId = null;
    this.scene.tick(time);
    if (this.scene.sign()) {
      this.scene.update();
      this.renderer.draw(this.scene.getQueue());
      this.requestRender();
    }
  }

  resize(width: number, height: number) {
    this.renderer.resize({width, height});
    this.scene.setMatrix(this.renderer.viewMatrix as Mat2d);
  }

  clear() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.renderer.clear();
    this.scene.clear();
  }

  dispose() {
    this.clear();
    this.renderer.dispose();
    this.scene.dispose();
    this.observer.dispose();
  }
}
