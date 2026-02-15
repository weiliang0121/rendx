const {App, Node} = __rendx_engine__;
const {createNode, createEdge, graphPlugin} = __rendx_graph_plugin__;

const app = new App({width: 800, height: 600});
app.mount(container);

// ── 定义元素类型 ──

const Box = createNode((ctx, data) => {
  const bg = Node.create('round', {
    fill: data.color ?? '#e3f2fd',
    stroke: data.borderColor ?? '#1976d2',
    strokeWidth: 2,
  });
  bg.shape.from(0, 0, ctx.width, ctx.height);
  bg.shape.options(8, 8);
  ctx.group.add(bg);

  const label = Node.create('text', {
    fill: '#333',
    fontSize: 13,
    fontWeight: 'bold',
    textAnchor: 'middle',
    dominantBaseline: 'central',
  });
  label.shape.from(data.title ?? data.id, ctx.width / 2, ctx.height / 2);
  ctx.group.add(label);

  // lifecycle: 注册 cleanup
  if (data.logCleanup) {
    ctx.onCleanup(() => {
      console.log(`  [cleanup] ${data.id}`);
    });
  }
});

const SimpleEdge = createEdge((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;

  const sx = src.data.x + (src.data.width ?? 0);
  const sy = src.data.y + (src.data.height ?? 0) / 2;
  const tx = tgt.data.x;
  const ty = tgt.data.y + (tgt.data.height ?? 0) / 2;

  const line = Node.create('line', {
    stroke: data.color ?? '#999',
    strokeWidth: 2,
  });
  line.shape.from(sx, sy, tx, ty);
  ctx.group.add(line);
});

// ── 注册 ──

const graph = graphPlugin();
app.use(graph);
graph.register('box', Box);
graph.register('edge', SimpleEdge);

// ── 初始场景 ──

graph.add('box', {id: 'A', x: 60, y: 100, width: 140, height: 60, title: 'Node A', color: '#e3f2fd', borderColor: '#1976d2', logCleanup: true});
graph.add('box', {id: 'B', x: 320, y: 60, width: 140, height: 60, title: 'Node B', color: '#fce4ec', borderColor: '#c62828', logCleanup: true});
graph.add('box', {id: 'C', x: 320, y: 200, width: 140, height: 60, title: 'Node C', color: '#e8f5e9', borderColor: '#2e7d32'});

graph.add('edge', {id: 'e-ab', source: 'A', target: 'B', color: '#1976d2'});
graph.add('edge', {id: 'e-ac', source: 'A', target: 'C', color: '#2e7d32'});

app.render();

console.log('── Element Lifecycle Demo ──');
console.log(
  'Initial nodes:',
  graph.getNodes().map(n => n.id),
);
console.log(
  'Initial edges:',
  graph.getEdges().map(e => e.id),
);

// ── Step 1: Position-only update (translate optimization) ──
setTimeout(() => {
  console.log('\n[Step 1] Position-only update → translate, no rebuild');
  graph.get('A').update({x: 100, y: 120});
  app.render();
  console.log('  Node A moved to (100, 120)');
  console.log('  Edges auto-redrawn (auto deps from source/target)');
}, 800);

// ── Step 2: Data update triggers cleanup + rebuild ──
setTimeout(() => {
  console.log('\n[Step 2] Data update → cleanup called, subtree rebuilt');
  graph.get('A').update({title: 'Updated A', color: '#bbdefb'});
  app.render();
  console.log('  Node A title changed, cleanup fired');
}, 1600);

// ── Step 3: Edge auto-deps — move target, edges follow ──
setTimeout(() => {
  console.log('\n[Step 3] Move Node B → edges auto-redraw');
  graph.get('B').update({x: 350, y: 30});
  app.render();
  console.log('  Edge e-ab auto-redrawn');
}, 2400);

// ── Step 4: Dynamic add ──
setTimeout(() => {
  console.log('\n[Step 4] Dynamic add — new node D + edge');
  graph.add('box', {id: 'D', x: 580, y: 130, width: 140, height: 60, title: 'Node D', color: '#fff3e0', borderColor: '#e65100'});
  graph.add('edge', {id: 'e-bd', source: 'B', target: 'D', color: '#e65100'});
  app.render();
  console.log(
    '  Nodes:',
    graph.getNodes().map(n => n.id),
  );
  console.log(
    '  Edges:',
    graph.getEdges().map(e => e.id),
  );
}, 3200);

// ── Step 5: Dynamic remove ──
setTimeout(() => {
  console.log('\n[Step 5] Remove Node C + its edge');
  graph.remove('e-ac');
  graph.remove('C');
  app.render();
  console.log(
    '  Remaining nodes:',
    graph.getNodes().map(n => n.id),
  );
  console.log(
    '  Remaining edges:',
    graph.getEdges().map(e => e.id),
  );
}, 4000);

// ── Step 6: Graph queries ──
setTimeout(() => {
  console.log('\n[Step 6] Graph queries');
  console.log(
    '  getNodes():',
    graph.getNodes().map(n => n.id),
  );
  console.log(
    '  getEdges():',
    graph.getEdges().map(e => e.id),
  );
  console.log(
    '  getEdgesOf("B"):',
    graph.getEdgesOf('B').map(e => e.id),
  );
  console.log('  count:', graph.count);
}, 4800);

// ── Step 7: Batch operation ──
setTimeout(() => {
  console.log('\n[Step 7] Batch add — single bus event');
  graph.batch(() => {
    graph.add('box', {id: 'E', x: 60, y: 300, width: 120, height: 50, title: 'Batch E', color: '#f3e5f5', borderColor: '#7b1fa2'});
    graph.add('box', {id: 'F', x: 250, y: 350, width: 120, height: 50, title: 'Batch F', color: '#f3e5f5', borderColor: '#7b1fa2'});
    graph.add('edge', {id: 'e-ef', source: 'E', target: 'F', color: '#7b1fa2'});
  });
  app.render();
  console.log('  Total elements:', graph.count);
  console.log(
    '  Final nodes:',
    graph.getNodes().map(n => n.id),
  );
  console.log(
    '  Final edges:',
    graph.getEdges().map(e => e.id),
  );
}, 5600);
