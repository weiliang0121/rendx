/**
 * InteractionManager — 插件交互协调器
 *
 * 提供两个核心能力：
 * 1. **通道锁**（Channel Lock）— 解决 pointer-exclusive 等互斥操作
 * 2. **元素特征查询**（Element Traits）— 运行时查询元素是否具有某种能力
 *
 * 设计原则：
 * - 开放：任何插件可以声明和获取锁通道，无需预定义
 * - 可编排：用户可以设置优先级，高优先级插件抢占低优先级插件的锁
 * - 无硬依赖：插件通过协调器通信，不直接引用其他插件
 *
 * @example
 * ```ts
 * // 插件安装时声明参与的通道和优先级
 * app.interaction.register('drag', { channels: ['pointer-exclusive'], priority: 10 });
 * app.interaction.register('connect', { channels: ['pointer-exclusive'], priority: 20 });
 * app.interaction.register('selection', { channels: ['pointer-exclusive'], priority: 5 });
 *
 * // 交互开始时获取锁
 * if (app.interaction.acquire('pointer-exclusive', 'drag')) {
 *   // 拖拽逻辑...
 *   app.interaction.release('pointer-exclusive', 'drag');
 * }
 *
 * // 查询某通道是否被占用
 * if (app.interaction.isLocked('pointer-exclusive')) return;
 *
 * // 查询某通道的当前持有者
 * const owner = app.interaction.getOwner('pointer-exclusive'); // 'drag' | null
 * ```
 */

import EventEmitter from 'eventemitter3';

// ══════════════════════════════════════════════════════════
//  类型定义
// ══════════════════════════════════════════════════════════

/**
 * 插件交互注册选项
 */
export interface InteractionRegistration {
  /**
   * 参与的通道名列表。
   * 常见通道：
   * - `pointer-exclusive` — pointer 事件独占（drag / connect / selection marquee）
   *
   * 也支持自定义通道：
   * - `keyboard-exclusive` — 键盘独占
   * - `viewport` — 视口控制（zoom/pan）
   */
  channels?: string[];

  /**
   * 优先级。数值越大优先级越高。
   *
   * 相同通道中，高优先级插件在低优先级持有锁时：
   * - `acquire()` 会抢占（force），低优先级的锁被自动释放并收到通知
   * - 同优先级遵循先到先得
   *
   * 默认值 0。
   */
  priority?: number;
}

/**
 * 通道锁状态
 */
interface ChannelLock {
  /** 当前持有者插件名 */
  owner: string;
  /** 持有者的优先级 */
  priority: number;
}

/**
 * 元素特征声明。
 * 键为特征名，值为 boolean 或任意可序列化值。
 *
 * 已知特征：
 * - `draggable` — 是否可拖拽（boolean）
 * - `selectable` — 是否可选中（boolean）
 * - `connectable` — 是否可连线（boolean）
 * - `deletable` — 是否可删除（boolean）
 * - `positionDerived` — 位置是否由其他元素派生（boolean）
 */
export type ElementTraits = Record<string, unknown>;

/**
 * 特征提供者注册项。
 * 插件通过 `registerTraitProvider` 注册一个查询函数，
 * 当 `queryTraits(target)` 时依次调用所有提供者。
 */
export type TraitProvider = (target: unknown) => ElementTraits | null;

// ══════════════════════════════════════════════════════════
//  InteractionManager
// ══════════════════════════════════════════════════════════

export class InteractionManager {
  /** 事件发射器 — 用于通知锁变化 */
  readonly events = new EventEmitter();

  /** 插件注册信息 */
  #registrations = new Map<string, Required<InteractionRegistration>>();

  /** 通道锁状态 */
  #channels = new Map<string, ChannelLock>();

  /** 元素特征提供者 */
  #traitProviders: {pluginName: string; provider: TraitProvider}[] = [];

  // ═══════════════════════════════════════════
  //  插件注册
  // ═══════════════════════════════════════════

  /**
   * 注册插件到交互管理器。
   * 通常在 `plugin.install()` 中调用。
   *
   * @param pluginName - 插件名
   * @param options - 注册选项（通道、优先级）
   */
  register(pluginName: string, options: InteractionRegistration = {}): void {
    this.#registrations.set(pluginName, {
      channels: options.channels ?? [],
      priority: options.priority ?? 0,
    });
  }

  /**
   * 取消注册插件。
   * 释放该插件持有的所有锁。
   */
  unregister(pluginName: string): void {
    // 释放所有该插件持有的锁
    for (const [channel, lock] of this.#channels) {
      if (lock.owner === pluginName) {
        this.release(channel, pluginName);
      }
    }
    this.#registrations.delete(pluginName);

    // 移除特征提供者
    this.#traitProviders = this.#traitProviders.filter(p => p.pluginName !== pluginName);
  }

  /**
   * 更新插件的优先级。
   * 允许用户在运行时动态调整交互优先级。
   */
  setPriority(pluginName: string, priority: number): void {
    const reg = this.#registrations.get(pluginName);
    if (reg) {
      reg.priority = priority;
    }
  }

  /**
   * 获取已注册的插件优先级。
   */
  getPriority(pluginName: string): number {
    return this.#registrations.get(pluginName)?.priority ?? 0;
  }

  // ═══════════════════════════════════════════
  //  通道锁
  // ═══════════════════════════════════════════

  /**
   * 尝试获取通道锁。
   *
   * 规则：
   * 1. 通道空闲 → 立即获取
   * 2. 自己已持有 → 幂等返回 true
   * 3. 别人持有，自己优先级更高 → **抢占**：释放对方，自己获取
   * 4. 别人持有，优先级相同或更低 → 返回 false
   *
   * @param channel - 通道名
   * @param pluginName - 请求方插件名
   * @returns 是否成功获取
   */
  acquire(channel: string, pluginName: string): boolean {
    const existing = this.#channels.get(channel);

    // 1. 空闲
    if (!existing) {
      return this.#setLock(channel, pluginName);
    }

    // 2. 幂等
    if (existing.owner === pluginName) {
      return true;
    }

    // 3. 优先级比较
    const myPriority = this.#registrations.get(pluginName)?.priority ?? 0;
    if (myPriority > existing.priority) {
      // 抢占：先通知被抢占方
      const preempted = existing.owner;
      this.#channels.delete(channel);
      this.events.emit('interaction:preempted', {channel, preempted, by: pluginName});
      return this.#setLock(channel, pluginName);
    }

    // 4. 无法获取
    return false;
  }

  /**
   * 释放通道锁。
   * 仅持有者本人可以释放（其他人调用静默忽略）。
   */
  release(channel: string, pluginName: string): void {
    const existing = this.#channels.get(channel);
    if (!existing || existing.owner !== pluginName) return;

    this.#channels.delete(channel);
    this.events.emit('interaction:released', {channel, owner: pluginName});
  }

  /**
   * 释放指定插件持有的所有通道锁。
   */
  releaseAll(pluginName: string): void {
    for (const [channel, lock] of this.#channels) {
      if (lock.owner === pluginName) {
        this.release(channel, pluginName);
      }
    }
  }

  /**
   * 查询通道是否被锁定。
   */
  isLocked(channel: string): boolean {
    return this.#channels.has(channel);
  }

  /**
   * 查询通道的当前持有者。
   */
  getOwner(channel: string): string | null {
    return this.#channels.get(channel)?.owner ?? null;
  }

  /**
   * 查询通道是否被指定插件之外的插件锁定。
   * 常用于 "我能操作吗？" 的判断。
   *
   * @param channel - 通道名
   * @param pluginName - 自己的插件名
   * @returns 是否被其他插件锁定
   */
  isLockedByOther(channel: string, pluginName: string): boolean {
    const lock = this.#channels.get(channel);
    if (!lock) return false;
    return lock.owner !== pluginName;
  }

  #setLock(channel: string, pluginName: string): boolean {
    const priority = this.#registrations.get(pluginName)?.priority ?? 0;
    this.#channels.set(channel, {owner: pluginName, priority});
    this.events.emit('interaction:acquired', {channel, owner: pluginName});
    return true;
  }

  // ═══════════════════════════════════════════
  //  元素特征查询
  // ═══════════════════════════════════════════

  /**
   * 注册元素特征提供者。
   * 多个插件可以为同一个元素提供不同维度的特征。
   * 查询时按注册顺序调用，后注册的覆盖先注册的同名特征。
   *
   * @param pluginName - 提供者插件名（卸载时自动清理）
   * @param provider - 特征查询函数，接收目标对象，返回特征 map 或 null
   */
  registerTraitProvider(pluginName: string, provider: TraitProvider): void {
    this.#traitProviders.push({pluginName, provider});
  }

  /**
   * 查询元素的合并特征。
   * 依次调用所有提供者，合并结果（后注册的覆盖先注册的同名 key）。
   *
   * @param target - 目标对象（通常是 Graphics 节点）
   * @returns 合并后的特征 map
   */
  queryTraits(target: unknown): ElementTraits {
    const merged: ElementTraits = {};
    for (const {provider} of this.#traitProviders) {
      const traits = provider(target);
      if (traits) {
        Object.assign(merged, traits);
      }
    }
    return merged;
  }

  /**
   * 查询目标的单个特征值。
   * 便捷方法，等价于 `queryTraits(target)[traitName]`。
   */
  queryTrait<T = unknown>(target: unknown, traitName: string): T | undefined {
    return this.queryTraits(target)[traitName] as T | undefined;
  }

  // ═══════════════════════════════════════════
  //  生命周期
  // ═══════════════════════════════════════════

  /**
   * 清理所有状态。
   */
  dispose(): void {
    this.#channels.clear();
    this.#registrations.clear();
    this.#traitProviders = [];
    this.events.removeAllListeners();
  }
}
