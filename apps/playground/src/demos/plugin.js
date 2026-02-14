const {App, Node} = __rendx_engine__;

// Create a custom plugin
const FPSPlugin = {
  name: 'fps-counter',
  _rafId: null,
  install(app) {
    // Create FPS display node
    const fpsText = Node.create('text', {fill: '#333', fontSize: 14, fontFamily: 'monospace'});
    fpsText.shape.from('FPS: --', 10, 20);
    app.scene.add(fpsText);
    this._fpsText = fpsText;
    this._app = app;

    // Use an independent rAF loop to measure actual FPS
    let frames = 0;
    let lastTime = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        fpsText.shape.from('FPS: ' + fps, 10, 20);
        frames = 0;
        lastTime = now;
        app.render(); // refresh the FPS text
      }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);

    console.log('[FPSPlugin] installed');
  },
  dispose() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    console.log('[FPSPlugin] disposed');
  },
};

const app = new App({width: 600, height: 400});
app.mount(container);

// Register plugin
app.use(FPSPlugin);
console.log('Plugin registered:', app.getPlugin('fps-counter')?.name);

// Add some animated content to see FPS
const circles = [];
for (let i = 0; i < 20; i++) {
  const circle = Node.create('circle', {
    fill: `hsl(${i * 18}, 70%, 60%)`,
    opacity: 0.7,
  });
  circle.shape.from(50 + Math.random() * 500, 50 + Math.random() * 300, 10 + Math.random() * 20);
  circle.useTransform();
  circle.transform
    .translate(Math.random() * 100 - 50, Math.random() * 100 - 50)
    .duration(1000 + Math.random() * 2000)
    .easing('inOutCubic')
    .repeat(true);
  app.scene.add(circle);
  circles.push(circle);
}

app.requestRender();
console.log('Plugin demo: custom FPS counter plugin + animated circles');
