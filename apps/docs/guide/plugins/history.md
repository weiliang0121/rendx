# History Plugin（撤销重做）

**包名**：`rendx-history-plugin` · [包参考](/packages/history-plugin)

基于场景快照的撤销/重做能力。每次调用 `push()` 保存整个场景状态，`undo()`/`redo()` 在快照间切换。

## 快照机制

```
push()  →  app.toJSON() → 压入 undoStack → 清空 redoStack
undo()  →  undoStack 弹出 → 当前状态压入 redoStack → restoreFromJSON() → render()
redo()  →  redoStack 弹出 → 当前状态压入 undoStack → restoreFromJSON() → render()
```

## 调用时机

::: warning push() 要在操作之前调用
`push()` 保存的是调用时刻的场景状态。应在用户操作**之前**调用，这样 `undo()` 才能恢复到操作前的状态。
:::

```typescript
import {historyPlugin} from 'rendx-history-plugin';

const history = historyPlugin({maxSteps: 100});
app.use(history);

// 用户操作前保存
history.push();
// ... 执行操作（添加节点、修改属性等）

// 撤销 / 重做
if (history.canUndo) history.undo();
if (history.canRedo) history.redo();

// 快捷键
document.addEventListener('keydown', e => {
  if (e.metaKey && e.key === 'z') {
    e.shiftKey ? history.redo() : history.undo();
  }
});
```

## 限制

- 基于整体场景 JSON 快照，不支持增量记录。大场景时内存占用较高
- `maxSteps` 超出后 FIFO 淘汰最早记录
