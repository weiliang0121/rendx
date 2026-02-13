import type {App} from './app';

/**
 * 插件接口
 *
 * 插件通过 `app.use(plugin)` 注册，框架会调用 `install(app)` 完成初始化。
 * 当 App dispose 时，若插件提供了 `dispose` 方法，则会自动调用。
 */
export interface Plugin {
  /** 插件名称（用于去重和调试） */
  name: string;

  /** 安装插件，在 `app.use()` 时调用 */
  install(app: App): void;

  /** 当 App resize 时调用 */
  resize?(width: number, height: number): void;

  /** 卸载插件，在 `app.dispose()` 时自动调用 */
  dispose?(): void;
}
