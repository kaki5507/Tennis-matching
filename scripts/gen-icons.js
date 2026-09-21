const { Resvg } = require('@resvg/resvg-js');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync(path.join(__dirname, 'app-icon-source.svg'), 'utf-8');

function renderPng(size) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const pngData = resvg.render();
  return pngData.asPng();
}

const outDir = path.join(__dirname, '..', 'app');

fs.writeFileSync(path.join(outDir, 'apple-icon.png'), renderPng(180));
console.log('apple-icon.png done');

Promise.all([renderPng(16), renderPng(32), renderPng(48)]).then(async (buffers) => {
  const ico = await toIco(buffers);
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), ico);
  console.log('favicon.ico done');
});
