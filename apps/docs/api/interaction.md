# InteractionManager（交互协调器）

`app.interaction` 是引擎内置的插件交互协调器，提供两个核心能力：

1. **通道锁（Channel Lock）** — 解决 pointer-exclusive 等互斥操作
2. **元素特征查询（Element Traits）** — 运行时查询元素的能力特征

## 访问方式

```typescript
import {App} from 'rendx-engine';

const app = new App({width: 800, height: 600});
const im = app.interaction; // InteractionManager 实例
```

---

## 类型定义

### InteractionRegistration

插件注册时的选项。

```typescript
interface InteractionRegistration {
  /**
   * 参与的通道名列表。
   * 常见通道：
   * - `pointer-exclusive` — pointer 事件独占（drag / connect / selection marquee）
   * 也支持自定义通道：
   * - `keyboard-exclusive` — 键盘独占
   * - `viewport` — 视口控制（zoom/pan）
   */
  channels?: string[];

  /**
   * 优先级。数值越大优先级越高。
   * 相同通道中，高优先级插件可抢占低优先级插件的锁。
   * 同优先级遵循先到先得。默认值 0。
   */
  priority?: number;
}
```

### ElementTraits

元素特征声明。键为特征名，值为 `boolean` 或任意可序列化值。

```typescript
type ElementTraits = Record<string, unknown>;
```

已知特征：

| 特征              | 类型                      | 说明                              |
| ----------------- | ------------------------- | --------------------------------- |
| `draggable`       | `boolean`                 | 是否可拖拽                        |
| `selectable`      | `boolean`                 | 是否可选中                        |
| `connectable`     | `boolean \| PortResolver` | 是否可连线，或端口解析器函数      |
| `deletable`       | `boolean`                 | 是否可删除                        |
| `positionDerived` | `boolean`                 | 位置是否由其他元素派生（如 Edge） |

### TraitProvider

特征提供者函数。接收目标对象，返回该目标的特征 map，或 `null` 表示不关心。

```typescript
type TraitProvider = (target: unknown) => ElementTraits | null;
```

---

## 插件注册

### register(pluginName, options?)

注册插件到交互管理器。通常在 `plugin.install()` 中调用。

```typescript
app.interaction.register('drag', {
  channels: ['pointer-exclusive'],
  priority: 10,
});
```

| 参数         | 类型                      | 说明                     |
| ------------ | ------------------------- | ------------------------ |
| `pluginName` | `string`                  | 插件名                   |
| `options`    | `InteractionRegistration` | 注册选项（通道、优先级） |

### unregister(pluginName)

取消注册插件。自动释放该插件持有的所有通道锁，并移除该插件注册的 TraitProvider。

```typescript
app.interaction.unregister('drag');
```

### setPriority(pluginName, priority)

更新已注册插件的优先级。允许运行时动态调整交互优先级。

```typescript
app.interaction.setPriority('drag', 20);
```

### getPriority(pluginName)

获取已注册插件的优先级。未注册时返回 `0`。

```typescript
const p = app.interaction.getPriority('drag'); // 10
```

---

## 通道锁 API

### acquire(channel, pluginName): boolean

尝试获取通道锁。

**获取规则**：

| 场景                       | 行为                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| 通道空闲                   | 立即获取，返回 `true`                                                                    |
| 自己已持有                 | 幂等返回 `true`                                                                          |
| 别人持有，自己优先级更高   | **抢占**：释放对方的锁，自己获取，返回 `true`。被抢占方收到 `interaction:preempted` 事件 |
| 别人持有，优先级相同或更低 | 返回 `false`                                                                             |

```typescript
if (app.interaction.acquire('pointer-exclusive', 'drag')) {
  // 成功获取锁，开始拖拽逻辑
}
```

### release(channel, pluginName)

释放通道锁。仅持有者可释放（其他人调用静默忽略）。

```typescript
app.interaction.release('pointer-exclusive', 'drag');
```

### releaseAll(pluginName)

释放指定插件持有的所有通道锁。

```typescript
app.interaction.releaseAll('drag');
```

### isLocked(channel): boolean

查询通道是否被任何插件锁定。

```typescript
if (app.interaction.isLocked('pointer-exclusive')) {
  // 有其他插件正在独占 pointer 事件
}
```

### getOwner(channel): string | null

查询通道的当前持有者插件名。未锁定时返回 `null`。

```typescript
const owner = app.interaction.getOwner('pointer-exclusive');
// 'drag' | 'connect' | 'selection' | null
```

### isLockedByOther(channel, pluginName): boolean

查询通道是否被指定插件**之外**的插件锁定。常用于事件入口的 "我能操作吗？" 守卫判断。

```typescript
// selection-plugin 的事件入口
if (app.interaction.isLockedByOther('pointer-exclusive', 'selection')) {
  return; // 其他插件正在独占，跳过
}
```

---

## 元素特征 API

### registerTraitProvider(pluginName, provider)

注册元素特征提供者。多个插件可为同一元素提供不同维度的特征。查询时按注册顺序调用，后注册的同名特征覆盖先注册的。

插件卸载时（`unregister`）自动清理其注册的提供者。

```typescript
// graph-plugin 安装时注册 TraitProvider
app.interaction.registerTraitProvider('graph', target => {
  const element = findElement(target);
  if (!element) return null;
  return element.traits; // { draggable: true, selectable: true, connectable: PortResolver, ... }
});
```

### queryTraits(target): ElementTraits

查询元素的合并特征。依次调用所有已注册的提供者，合并结果。

```typescript
const traits = app.interaction.queryTraits(someNode);
// { draggable: true, selectable: true, connectable: true, deletable: true, positionDerived: false }

if (traits.draggable) {
  // 可拖拽
}
```

### queryTrait\<T\>(target, traitName): T | undefined

查询目标的单个特征值。便捷方法，等价于 `queryTraits(target)[traitName]`。

```typescript
const draggable = app.interaction.queryTrait<boolean>(someNode, 'draggable');
const connectable = app.interaction.queryTrait(someNode, 'connectable');
```

---

## 事件

InteractionManager 通过 `events` 属性（EventEmitter）发出以下事件：

### interaction:acquired

通道锁被成功获取时触发。

```typescript
app.interaction.events.on('interaction:acquired', ({channel, owner}) => {
  console.log(`${owner} 获取了 ${channel} 通道锁`);
});
```

| 字段      | 类型     | 说明         |
| --------- | -------- | ------------ |
| `channel` | `string` | 通道名       |
| `owner`   | `string` | 获取者插件名 |

### interaction:released

通道锁被释放时触发。

```typescript
app.interaction.events.on('interaction:released', ({channel, owner}) => {
  console.log(`${owner} 释放了 ${channel} 通道锁`);
});
```

| 字段      | 类型     | 说明         |
| --------- | -------- | ------------ |
| `channel` | `string` | 通道名       |
| `owner`   | `string` | 释放者插件名 |

### interaction:preempted

高优先级插件抢占低优先级插件的锁时触发。

```typescript
app.interaction.events.on('interaction:preempted', ({channel, preempted, by}) => {
  console.log(`${preempted} 的 ${channel} 锁被 ${by} 抢占`);
});
```

| 字段        | 类型     | 说明           |
| ----------- | -------- | -------------- |
| `channel`   | `string` | 通道名         |
| `preempted` | `string` | 被抢占的插件名 |
| `by`        | `string` | 抢占者插件名   |

---

## 生命周期

### dispose()

清理所有状态（通道锁、注册信息、特征提供者、事件监听）。通常由 `app.dispose()` 自动调用。

```typescript
app.interaction.dispose();
```

---

## 内置插件优先级

| 插件      | 通道              | 优先级 |
| --------- | ----------------- | ------ |
| connect   | pointer-exclusive | 15     |
| drag      | pointer-exclusive | 10     |
| selection | pointer-exclusive | 5      |

## 典型用法

### 完整的互斥协调流程

```typescript
// 1. install 时注册
app.interaction.register('my-plugin', {
  channels: ['pointer-exclusive'],
  priority: 8,
});

// 2. 事件入口守卫
scene.on('pointerdown', e => {
  if (app.interaction.isLockedByOther('pointer-exclusive', 'my-plugin')) return;

  // 3. 操作开始时获取锁
  if (!app.interaction.acquire('pointer-exclusive', 'my-plugin')) return;

  // ... 交互逻辑 ...
});

scene.on('pointerup', () => {
  // 4. 操作结束时释放锁
  app.interaction.release('pointer-exclusive', 'my-plugin');
});

// 5. dispose 时注销
app.interaction.unregister('my-plugin');
```

### 自定义通道

通道名是自由声明的，不限于 `pointer-exclusive`：

```typescript
app.interaction.register('keyboard-shortcuts', {
  channels: ['keyboard-exclusive'],
  priority: 5,
});

app.interaction.register('modal-input', {
  channels: ['keyboard-exclusive'],
  priority: 20,
});
```

### 查询元素特征决定交互行为

```typescript
scene.on('pointerdown', e => {
  const target = e.target;
  const traits = app.interaction.queryTraits(target);

  if (traits.draggable) {
    startDrag(target);
  } else if (traits.connectable) {
    startConnect(target);
  }
});
```
