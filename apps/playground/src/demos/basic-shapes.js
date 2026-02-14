const {App, Node} = __dye_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Circle
const circle = Node.create('circle', {fill: '#ff6b6b', stroke: '#c92a2a', strokeWidth: 2});
circle.shape.from(150, 200, 60);
app.scene.add(circle);

// Rectangle
const rect = Node.create('rect', {fill: '#4dabf7', stroke: '#1c7ed6', strokeWidth: 2});
rect.shape.from(280, 140, 120, 120);
app.scene.add(rect);

// Line
const line = Node.create('line', {stroke: '#51cf66', strokeWidth: 3});
line.shape.from(440, 120, 540, 280);
app.scene.add(line);

// Text
const text = Node.create('text', {fill: '#333', fontSize: 20, fontFamily: 'sans-serif'});
text.shape.from('Hello Rendx!', 230, 50);
app.scene.add(text);

app.render();
console.log('Basic Shapes rendered');
