const {App, Node, Group} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Demonstrate event bubbling: capture → target → bubble
const log = msg => console.log(msg);

// Outer group (grandparent)
const outer = new Group();
outer.setName('outer');
outer.translate(300, 200);

const outerBg = Node.create('rect', {fill: '#e9ecef', stroke: '#adb5bd', strokeWidth: 1});
outerBg.shape.from(-200, -150, 400, 300);
outer.add(outerBg);

// Inner group (parent)
const inner = new Group();
inner.setName('inner');

const innerBg = Node.create('rect', {fill: '#d0ebff', stroke: '#74c0fc', strokeWidth: 1});
innerBg.shape.from(-100, -80, 200, 160);
inner.add(innerBg);

// Target circle
const target = Node.create('circle', {fill: '#ff6b6b', stroke: '#c92a2a', strokeWidth: 2});
target.shape.from(0, 0, 40);
target.setName('target');
inner.add(target);

outer.add(inner);
app.scene.add(outer);

// Capture phase listener on outer
outer.on('click', () => log('[capture] outer'), {capture: true});
inner.on('click', () => log('[capture] inner'), {capture: true});
// Bubble phase listeners
inner.on('click', () => log('[bubble]  inner'));
outer.on('click', () => log('[bubble]  outer'));
target.on('click', e => {
  log('[target]  target clicked!');
  log(
    'composedPath: ' +
      e
        .composedPath()
        .map(n => n.name || '?')
        .join(' → '),
  );
});

// Labels
const label1 = Node.create('text', {fill: '#666', fontSize: 11, fontFamily: 'sans-serif'});
label1.shape.from('outer (grey)', 115, 62);
app.scene.add(label1);
const label2 = Node.create('text', {fill: '#666', fontSize: 11, fontFamily: 'sans-serif'});
label2.shape.from('inner (blue)', 210, 130);
app.scene.add(label2);
const label3 = Node.create('text', {fill: '#fff', fontSize: 11, fontFamily: 'sans-serif'});
label3.shape.from('target', 280, 195);
app.scene.add(label3);

const hint = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
hint.shape.from('Click the red circle — watch console for event flow', 120, 380);
app.scene.add(hint);

app.render();
console.log('Event bubbling demo: capture → target → bubble');
console.log('Click the red circle to see the event flow');
