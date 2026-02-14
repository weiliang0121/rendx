const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Showcase different easing functions
const easings = ['linear', 'inQuad', 'outQuad', 'inOutQuad', 'inCubic', 'outCubic', 'inOutCubic', 'outElastic', 'outBounce', 'outBack'];

const trackY = 35;
const trackH = (400 - 20) / easings.length;

easings.forEach((easing, i) => {
  const y = 10 + i * trackH;

  // Track line
  const track = Node.create('line', {stroke: '#e9ecef', strokeWidth: 1});
  track.shape.from(120, y + trackY, 550, y + trackY);
  app.scene.add(track);

  // Label
  const label = Node.create('text', {fill: '#555', fontSize: 11, fontFamily: 'monospace'});
  label.shape.from(easing, 10, y + trackY + 4);
  app.scene.add(label);

  // Animated dot
  const dot = Node.create('circle', {fill: `hsl(${i * 36}, 70%, 55%)`});
  dot.shape.from(120, y + trackY, 8);
  dot.useTransform();
  dot.transform.translate(430, 0).duration(2000).easing(easing).repeat(true);
  app.scene.add(dot);
});

app.requestRender();
console.log('Easing comparison: 10 easing functions side by side');
