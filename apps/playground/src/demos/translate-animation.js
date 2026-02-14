const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Bouncing circle — translate animation with repeat
const circle = Node.create('circle', {fill: '#ff6b6b', stroke: '#c92a2a', strokeWidth: 2});
circle.shape.from(80, 200, 30);
circle.useTransform();
circle.transform.translate(440, 0).duration(2000).easing('inOutCubic').repeat(true);
app.scene.add(circle);

// Scaling rectangle
const rect = Node.create('rect', {fill: '#4dabf7', stroke: '#1c7ed6', strokeWidth: 2});
rect.shape.from(250, 160, 80, 80);
rect.useTransform();
rect.transform.scale(2, 2).duration(1500).easing('outElastic').repeat(true);
app.scene.add(rect);

app.requestRender();
console.log('Translate + Scale animation running (requestRender loop)');
