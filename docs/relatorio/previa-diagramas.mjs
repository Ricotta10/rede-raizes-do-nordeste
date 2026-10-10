// Gera imagens PNG dos diagramas para revisão rápida (não faz parte da entrega).
// Uso: node docs/relatorio/previa-diagramas.mjs <pasta-de-saida>
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import * as D from './diagramas.mjs';

const saida = path.resolve(process.argv[2] || 'previa');
fs.mkdirSync(saida, { recursive: true });
const navegador = await puppeteer.launch({ executablePath: process.env.NAVEGADOR || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await navegador.newPage();
await page.setViewport({ width: 1000, height: 800, deviceScaleFactor: 1.5 });
for (const [nome, fn] of Object.entries(D)) {
  await page.setContent(`<body style="margin:0;padding:10px;width:900px;background:#fff">${fn()}</body>`);
  const el = await page.$('svg');
  await el.screenshot({ path: path.join(saida, `${nome}.png`) });
}
await navegador.close();
console.log('ok', saida);
