const {App, Node, Group} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Root group
const root = new Group();
root.setName('root');
root.translate(300, 200);

// Branch A
const branchA = new Group();
branchA.setName('branch-a');
branchA.translate(-120, -60);

for (let i = 0; i < 3; i++) {
  const c = Node.create('circle', {fill: '#ff6b6b'});
  c.shape.from(i * 50, 0, 18);
  c.setName('a-' + i);
  branchA.add(c);
}

// Branch B
const branchB = new Group();
branchB.setName('branch-b');
branchB.translate(-60, 60);

for (let i = 0; i < 4; i++) {
  const r = Node.create('rect', {fill: '#4dabf7'});
  r.shape.from(i * 50, 0, 30, 30);
  r.setName('b-' + i);
  branchB.add(r);
}

root.add(branchA);
root.add(branchB);
app.scene.add(root);
app.render();

// Demonstrate tree query (deep=true to search nested children)
const found = root.find('a-1', true);
console.log(
  'Tree path of a-1:',
  found
    ?.path()
    .map(n => n.name || '(unnamed)')
    .join(' → '),
);
console.log('Branch B children count:', branchB.children.length);
