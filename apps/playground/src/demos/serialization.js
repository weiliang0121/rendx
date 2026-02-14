const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Create some shapes
const circle = Node.create('circle', {fill: '#ff6b6b'});
circle.shape.from(200, 200, 50);
circle.setName('my-circle');

const rect = Node.create('rect', {fill: '#4dabf7'});
rect.shape.from(350, 150, 100, 100);
rect.setName('my-rect');

app.scene.add(circle);
app.scene.add(rect);
app.render();

// Serialize
const json = app.toJSON();
console.log('Serialized JSON:', JSON.stringify(json, null, 2));
console.log('Scene has', json.layers.length, 'layers');
