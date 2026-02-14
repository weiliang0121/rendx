const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Node.data — attach custom business data to nodes
const products = [
  {name: 'Product A', sales: 320, growth: 0.12},
  {name: 'Product B', sales: 280, growth: -0.05},
  {name: 'Product C', sales: 450, growth: 0.25},
  {name: 'Product D', sales: 180, growth: 0.08},
  {name: 'Product E', sales: 390, growth: 0.18},
];

const maxSales = Math.max(...products.map(p => p.sales));
const barWidth = 70;
const barGap = 20;
const maxHeight = 250;

products.forEach((product, i) => {
  const x = 60 + i * (barWidth + barGap);
  const height = (product.sales / maxSales) * maxHeight;
  const y = 320 - height;

  const color = product.growth >= 0 ? '#51cf66' : '#ff6b6b';

  const bar = Node.create('round', {fill: color, stroke: '#333', strokeWidth: 1});
  bar.shape.from(x, y, barWidth, height);
  bar.shape.options(4);

  // Attach business data
  bar.data = {
    product: product.name,
    sales: product.sales,
    growth: product.growth,
  };

  bar.on('click', () => {
    const d = bar.data;
    console.log(`${d.product}: sales=${d.sales}, growth=${(d.growth * 100).toFixed(0)}%`);
  });

  bar.on('pointerenter', () => {
    bar.attrs.set('opacity', 0.8);
    app.render();
  });
  bar.on('pointerleave', () => {
    bar.attrs.set('opacity', 1);
    app.render();
  });

  app.scene.add(bar);

  // Name label
  const nameLabel = Node.create('text', {fill: '#333', fontSize: 11, fontFamily: 'sans-serif'});
  nameLabel.shape.from(product.name, x + 5, 340);
  app.scene.add(nameLabel);

  // Value label
  const valLabel = Node.create('text', {fill: '#fff', fontSize: 12, fontFamily: 'sans-serif'});
  valLabel.shape.from(String(product.sales), x + 20, y + 20);
  app.scene.add(valLabel);

  // Growth indicator
  const growthText = (product.growth >= 0 ? '+' : '') + (product.growth * 100).toFixed(0) + '%';
  const growthLabel = Node.create('text', {
    fill: product.growth >= 0 ? '#2f9e44' : '#c92a2a',
    fontSize: 11,
    fontFamily: 'sans-serif',
  });
  growthLabel.shape.from(growthText, x + 20, y - 10);
  app.scene.add(growthLabel);
});

// Title
const title = Node.create('text', {fill: '#333', fontSize: 16, fontFamily: 'sans-serif'});
title.shape.from('Sales Dashboard (click bars for data)', 130, 25);
app.scene.add(title);

app.render();
console.log('node.data demo: click bars to see attached business data');
