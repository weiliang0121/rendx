import type {App} from './app';

/**
 * 插件 state 声明 — 每个插件声明自己管理的 state key、描述和初始值。
 * App 在 use() 时校验 key 不冲突，并以初始值写入 state map。
 */
export interface PluginStateDeclaration {
  /** state key（推荐 `pluginName:field` 命名空间格式） */
  key: string;
  /** 描述（文档/调试用） */
  description: string;
  /** 初始值 */
  initial: unknown;
}

/**
 * 插件图层声明 — 插件声明需要使用的渲染层。
 * App 在 use() 时自动 acquireLayer（有则复用，无则创建）。
 */
export interface PluginLayerDeclaration {
  /** 层名称 */
  name: string;
  /**
   * 排序 hint（可选）。
   * - 同一插件内多个层按此值排序，值小的在下方
   * - 实际 CSS z-index 由 App 自增分配，不会与其他插件冲突
   * - 省略时按声明顺序递增
   */
  zIndex?: number;
}

/**
 * 插件接口
 *
 * 插件通过 `app.use(plugin)` 注册，框架会：
 * 1. 校验并注册 state 声明
 * 2. 自动创建/复用所需图层
 * 3. 调用 `install(app)` 完成初始化
 *
 * 当 App dispose 时，若插件提供了 `dispose` 方法，则会自动调用。
 */
export interface Plugin {
  /** 插件名称（用于去重和调试） */
  name: string;

  /** 声明本插件管理的 state keys */
  state?: PluginStateDeclaration[];

  /** 声明需要使用的渲染层 */
  layers?: PluginLayerDeclaration[];

  /** 安装插件，在 `app.use()` 时调用 */
  install(app: App): void;

  /** 当 App resize 时调用 */
  resize?(width: number, height: number): void;

  /** 序列化插件自身状态（持久化） */
  serialize?(): Record<string, unknown>;

  /** 从持久化数据恢复插件状态 */
  deserialize?(data: Record<string, unknown>): void;

  /** 卸载插件，在 `app.dispose()` 时自动调用 */
  dispose?(): void;
}
