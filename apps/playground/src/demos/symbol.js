const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Showcase symbol types in a grid
const fillSymbols = ['circle', 'cross', 'diamond', 'square', 'triangle', 'iTriangle'];
const featureSymbols = ['line', 'hLine', 'vLine', 'eye'];

const allSymbols = [...fillSymbols, ...featureSymbols];
const cols = 5;

allSymbols.forEach((symbolType, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const cx = 80 + col * 110;
  const cy = 100 + row * 130;

  const hue = (i * 36) % 360;

  const symbol = Node.create('symbol', {
    fill: `hsl(${hue}, 65%, 55%)`,
    stroke: `hsl(${hue}, 65%, 35%)`,
    strokeWidth: 2,
  });
  symbol.shape.from(25);
  symbol.shape.options(symbolType);
  symbol.translate(cx, cy);
  app.scene.add(symbol);

  // Label
  const label = Node.create('text', {fill: '#555', fontSize: 11, fontFamily: 'sans-serif'});
  label.shape.from(symbolType, cx - 20, cy + 40);
  app.scene.add(label);
});

// Title
const title = Node.create('text', {fill: '#333', fontSize: 16, fontFamily: 'sans-serif'});
title.shape.from('Symbol Types', 240, 30);
app.scene.add(title);

app.render();
console.log('SymbolShape: fill symbols + feature symbols');
