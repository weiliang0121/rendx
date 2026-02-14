import {easeMap} from '@dye/ease';

export type TransformStatus = 'start' | 'init' | 'waiting' | 'running' | 'last' | 'clear' | 'end';

/**
 * 动画变换基类
 * 统一管理 duration / delay / easing / repeat 和时间状态机
 * 子类只需实现 apply(t) 方法
 */
export abstract class BaseTransform {
  status: TransformStatus = 'start';
  protected _duration = 0;
  protected _delay = 0;
  protected _easing = 'linear';
  protected _repeat = false;
  protected _time = -1;

  /** 是否仍在活跃状态（未结束） */
  get active() {
    return this.status !== 'end';
  }

  duration(time: number) {
    this._duration = time;
    return this;
  }

  delay(time: number) {
    this._delay = time;
    return this;
  }

  easing(easing: string) {
    this._easing = easing;
    return this;
  }

  repeat(repeat: boolean) {
    this._repeat = repeat;
    return this;
  }

  /** 子类实现具体的插值逻辑 */
  protected abstract apply(t: number): void;

  /** 动画结束时的清理，子类可覆盖 */
  protected onEnd() {}

  interpolate(time: number) {
    if (this.status === 'end') return;

    if (this.status === 'last') {
      if (this._repeat) {
        this.status = 'start';
        this._time = -1;
        // fall through — immediately start next cycle so the rAF loop stays alive
      } else {
        this.status = 'end';
        this.onEnd();
        return;
      }
    }

    if (this._time === -1) this._time = time;
    const elapsed = time - this._time;

    if (elapsed < this._delay) {
      this.status = 'waiting';
      return;
    }

    this.status = elapsed > this._delay + this._duration ? 'last' : 'running';

    const ease = easeMap[this._easing] ?? easeMap['linear'];
    const raw = this._duration > 0 ? (elapsed - this._delay) / this._duration : 1;
    const t = ease(Math.max(0, Math.min(1, raw)));
    this.apply(t);
  }
}
