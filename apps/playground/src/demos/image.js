const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Image from URL
const img = Node.create('image');
img.shape.from('https://picsum.photos/200/150', 50, 50, 200, 150);
app.scene.add(img);

// Another image
const img2 = Node.create('image');
img2.shape.from('https://picsum.photos/seed/rendx/180/180', 300, 100, 180, 180);
app.scene.add(img2);

// Label
const label = Node.create('text', {fill: '#333', fontSize: 14, fontFamily: 'sans-serif'});
label.shape.from('Images load asynchronously via imageLoader', 50, 350);
app.scene.add(label);

app.requestRender();
console.log('Image demo: images load asynchronously and auto-render when ready');
