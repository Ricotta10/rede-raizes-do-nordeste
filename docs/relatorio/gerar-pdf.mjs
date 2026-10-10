// Gera o documento de entrega em PDF (A4, formatação ABNT como referência).
//
// Uso:  node docs/relatorio/gerar-pdf.mjs [pasta-de-saida]
// Dados do aluno: docs/relatorio/dados-aluno.json (não versionado; veja dados-aluno.exemplo.json).
//
// Etapas: injeta diagramas, evidências e dados no HTML → 1ª impressão para descobrir a página
// de cada título → 2ª impressão com o sumário preenchido → numeração de páginas no canto superior
// direito a partir da Introdução (as páginas pré-textuais são contadas, mas não numeradas).

import puppeteer from 'puppeteer-core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as D from './diagramas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const SAIDA = path.resolve(process.argv[2] || path.join(RAIZ, 'entrega'));
const NAVEGADOR = process.env.NAVEGADOR || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lerJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const arquivoDados = fs.existsSync(path.join(AQUI, 'dados-aluno.json')) ? 'dados-aluno.json' : 'dados-aluno.exemplo.json';
const dados = lerJSON(path.join(AQUI, arquivoDados));
const marcarPendente = (v) => (/^\[.*\]$/.test(v) ? `<span class="preencher">${esc(v)}</span>` : esc(v));

// ---------- Evidências ----------
const e2e = lerJSON(path.join(RAIZ, 'docs/evidencias/resultado-e2e.json'));
const dataE2E = new Date(e2e.executadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const tabelaE2E = `<table class="quadro"><thead><tr><th>ID</th><th>Cenário</th><th>Resultado obtido</th><th class="c">Status</th></tr></thead><tbody>${
  e2e.resultados.map((r) => `<tr><td>${r.id}</td><td>${esc(r.titulo)}</td><td>${esc(r.obtido)}</td><td class="c ok">${r.resultado}</td></tr>`).join('')
}</tbody></table>`;

let saidaUnit = '';
try {
  saidaUnit = execSync('node --test --test-reporter=spec', { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  saidaUnit = `${e.stdout || ''}${e.stderr || ''}`;
}
saidaUnit = saidaUnit.replace(/\x1b\[[0-9;]*m/g, '').trim();
const unitPassou = (saidaUnit.match(/(?:ℹ|#) pass (\d+)/) || [])[1];
const unitFalhou = (saidaUnit.match(/(?:ℹ|#) fail (\d+)/) || [])[1];

const log = execSync('git log --reverse --date=format:"%d/%m/%Y %H:%M" --pretty=format:"%h|%ad|%an|%s"', { cwd: RAIZ, encoding: 'utf8' })
  .split('\n').filter(Boolean).map((l) => l.split('|'));
const tabelaGit = `<table class="quadro"><thead><tr><th>Commit</th><th>Data</th><th>Autor</th><th>Descrição</th></tr></thead><tbody>${
  log.map(([h, d, a, s]) => `<tr><td><code>${h}</code></td><td>${d}</td><td>${esc(a)}</td><td>${esc(s)}</td></tr>`).join('')
}</tbody></table>`;

const tamanhoApp = ['index.html', 'css/estilos.css', ...fs.readdirSync(path.join(RAIZ, 'js'), { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => path.join('js', f))]
  .reduce((s, f) => s + fs.statSync(path.join(RAIZ, f)).size, 0);
const qtdTelas = fs.readdirSync(path.join(RAIZ, 'docs/evidencias/telas')).length;

const prompts = (dados.promptsIA || []).map((p, i) => `<p class="sem-recuo" style="margin-bottom:6pt"><b>Prompt ${i + 1}:</b> “${esc(p)}”</p>`).join('')
  || '<span class="preencher">[Listar os prompts utilizados]</span>';

const substituicoes = {
  NOME: marcarPendente(dados.nome), NOME_TEXTO: marcarPendente(dados.nome),
  CURSO: marcarPendente(dados.curso), CURSO_TEXTO: marcarPendente(dados.curso),
  RU: marcarPendente(dados.ru), POLO: marcarPendente(dados.polo), SEMESTRE: marcarPendente(dados.semestre),
  PROFESSOR: marcarPendente(dados.professor), CIDADE: marcarPendente(dados.cidade), ANO: esc(dados.ano),
  FIG_CASOS_USO: D.casosDeUso(), FIG_JORNADA: D.jornada(), FIG_ESTADOS: D.estadosPedido(),
  FIG_SEQUENCIA: D.sequenciaPagamento(), FIG_ARQUITETURA: D.arquitetura(), FIG_MAPA: D.mapaNavegacao(),
  E2E_TABELA: tabelaE2E,
  E2E_RESUMO: `Os ${e2e.total} cenários foram executados automaticamente em ${dataE2E}, no navegador ${esc(e2e.navegador.replace('.exe', ''))} em modo headless, contra a aplicação publicada (${esc(e2e.urlBase)}): <b>${e2e.aprovados} de ${e2e.total} aprovados</b>.`,
  E2E_DATA: dataE2E,
  UNIT_RESUMO: unitPassou ? `${unitPassou} testes aprovados e ${unitFalhou || 0} falhas` : 'resultado registrado',
  GIT_LOG: tabelaGit,
  TESTES_UNITARIOS: esc(saidaUnit),
  DATA_GERACAO: new Date().toLocaleDateString('pt-BR'),
  TAMANHO_APP: `cerca de ${Math.round(tamanhoApp / 1024)} KB`,
  QTD_TELAS: String(qtdTelas),
  PROMPTS_IA: prompts,
};

let html = fs.readFileSync(path.join(AQUI, 'relatorio.html'), 'utf8');
html = html.replace(/\$\{'(.+?)'\.repeat\((\d+)\)\}/g, (_, trecho, n) => trecho.repeat(Number(n)));
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in substituicoes ? substituicoes[k] : m));
const pendentes = html.match(/\{\{\w+\}\}/g);
if (pendentes) console.warn('Marcadores não substituídos:', [...new Set(pendentes)].join(', '));

const temporario = path.join(AQUI, '.relatorio-montado.html');

// ---------- Impressão ----------
const navegador = await puppeteer.launch({ executablePath: NAVEGADOR, headless: true });
async function imprimir(paginas) {
  fs.writeFileSync(temporario, html.replace('<script>', `<script>window.__PAGINAS__ = ${JSON.stringify(paginas)};</script>\n<script>`));
  const page = await navegador.newPage();
  await page.goto(pathToFileURL(temporario).href, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('print');
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  await page.close();
  return pdf;
}

async function localizarTitulos(pdfBytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes), useSystemFonts: true }).promise;
  const mapa = {};
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    const texto = conteudo.items.map((t) => t.str).join('');
    // Os títulos de seção são impressos em caixa alta, por isso a busca ignora maiúsculas.
    for (const m of texto.matchAll(/QQ([a-z0-9-]+?)QQ/gi)) {
      const id = m[1].toLowerCase();
      if (!(id in mapa)) mapa[id] = i;
    }
  }
  return { mapa, total: doc.numPages };
}

const primeira = await imprimir({});
const { mapa } = await localizarTitulos(primeira);
// Numeração ABNT: a capa não é contada; a folha de rosto é a página 1.
const paginas = Object.fromEntries(Object.entries(mapa).map(([id, p]) => [id, String(p - 1)]));
console.log(`Títulos localizados: ${Object.keys(paginas).length}`);
const segunda = await imprimir(paginas);
const conferencia = await localizarTitulos(segunda);
for (const [id, p] of Object.entries(conferencia.mapa)) {
  if (String(p - 1) !== paginas[id]) console.warn(`Atenção: título ${id} mudou de página (${paginas[id]} → ${p - 1}).`);
}
await navegador.close();
fs.rmSync(temporario, { force: true });

// ---------- Numeração das páginas ----------
const doc = await PDFDocument.load(segunda);
const fonte = await doc.embedFont(StandardFonts.Helvetica);
const inicio = mapa.s1 - 1; // índice (0) da página da Introdução
doc.getPages().forEach((pg, i) => {
  if (i < inicio) return;
  const { width, height } = pg.getSize();
  const numero = String(i);
  const tam = 10;
  const larg = fonte.widthOfTextAtSize(numero, tam);
  pg.drawText(numero, { x: width - 56.7 - larg, y: height - 56.7 + 14, size: tam, font: fonte, color: rgb(0, 0, 0) });
});
doc.setTitle('Rede Raízes do Nordeste – Projeto Multidisciplinar – Trilha Front-End');
doc.setAuthor(/^\[/.test(dados.nome) ? 'Aluno(a)' : dados.nome);
doc.setSubject('Documento de entrega – UNINTER 2026');
doc.setKeywords(['front-end', 'LGPD', 'mobile-first', 'UNINTER']);
const final = await doc.save();

fs.mkdirSync(SAIDA, { recursive: true });
const ru = /^\[/.test(dados.ru) ? 'RU' : dados.ru.replace(/\D/g, '');
const destino = path.join(SAIDA, `${ru}_Projeto_Front_End.pdf`);
fs.writeFileSync(destino, final);
console.log(`PDF gerado: ${destino} (${doc.getPageCount()} páginas, ${Math.round(final.length / 1024)} KB) usando ${arquivoDados}`);
