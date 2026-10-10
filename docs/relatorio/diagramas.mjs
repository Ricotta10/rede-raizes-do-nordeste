// Gera os diagramas do documento em SVG (vetorial, nítido na impressão).

const COR = {
  traco: '#2a1f1a', suave: '#6b5d52', fundo: '#ffffff',
  urucum: '#b5462b', urucumClaro: '#fbe9e3', sol: '#fdf0d2', verde: '#2f6b4f', verdeClaro: '#e3f0e8',
  anil: '#1f3a5f', anilClaro: '#e5edf6', cinza: '#f3efe9', vermelhoClaro: '#fdeceb',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svg(w, h, conteudo) {
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="${COR.traco}">
  <defs>
    <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${COR.traco}"/></marker>
    <marker id="seta-aberta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="${COR.traco}" stroke-width="1.4"/></marker>
  </defs>
  ${conteudo}
</svg>`;
}

function texto(x, y, linhas, { anchor = 'middle', size = 11, weight = 'normal', cor = COR.traco, italico = false } = {}) {
  const ls = Array.isArray(linhas) ? linhas : String(linhas).split('\n');
  const lh = size * 1.22;
  const y0 = y - ((ls.length - 1) * lh) / 2 + size * 0.35;
  return `<text x="${x}" y="${y0}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${cor}"${italico ? ' font-style="italic"' : ''}>${ls
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lh}">${esc(l)}</tspan>`).join('')}</text>`;
}

function caixa(cx, cy, w, h, linhas, { fill = COR.fundo, stroke = COR.traco, rx = 6, dash = '', size = 10.5, weight = 'normal', sw = 1.2 } = {}) {
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>${texto(cx, cy, linhas, { size, weight })}`;
}

function losango(cx, cy, w, h, linhas, { fill = COR.sol, size = 9.5 } = {}) {
  return `<polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}" fill="${fill}" stroke="${COR.traco}" stroke-width="1.2"/>${texto(cx, cy, linhas, { size })}`;
}

function elipse(cx, cy, rx, ry, linhas, { fill = COR.fundo, size = 10 } = {}) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${COR.traco}" stroke-width="1.2"/>${texto(cx, cy, linhas, { size })}`;
}

function linha(pontos, { seta = true, aberta = false, tracejada = false, rotulo = '', rx = null, ry = null, anchor = 'middle', cor = COR.traco, size = 9 } = {}) {
  const d = pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  let s = `<path d="${d}" fill="none" stroke="${cor}" stroke-width="1.2"${tracejada ? ' stroke-dasharray="5 4"' : ''}${seta ? ` marker-end="url(#${aberta ? 'seta-aberta' : 'seta'})"` : ''}/>`;
  if (rotulo) {
    const [x1, y1] = pontos[0];
    const [x2, y2] = pontos[pontos.length - 1];
    const lx = rx ?? (x1 + x2) / 2;
    const ly = ry ?? (y1 + y2) / 2 - 6;
    const ls = rotulo.split('\n');
    const larg = Math.max(...ls.map((l) => l.length)) * size * 0.52 + 6;
    const alt = ls.length * size * 1.22 + 2;
    const bx = anchor === 'start' ? lx - 3 : anchor === 'end' ? lx - larg + 3 : lx - larg / 2;
    s += `<rect x="${bx}" y="${ly - alt / 2}" width="${larg}" height="${alt}" fill="#fff" opacity="0.92"/>${texto(lx, ly, ls, { size, anchor, cor: COR.suave, italico: true })}`;
  }
  return s;
}

function ator(x, y, nome, { sistema = false } = {}) {
  if (sistema) {
    return `<rect x="${x - 55}" y="${y - 28}" width="110" height="56" rx="4" fill="${COR.anilClaro}" stroke="${COR.anil}" stroke-width="1.2"/>${texto(x, y - 13, '«sistema externo»', { size: 8.5, cor: COR.anil, italico: true })}${texto(x, y + 7, nome, { size: 10, weight: 'bold' })}`;
  }
  return `<g stroke="${COR.traco}" stroke-width="1.5" fill="none">
    <circle cx="${x}" cy="${y - 30}" r="9" fill="#fff"/>
    <line x1="${x}" y1="${y - 21}" x2="${x}" y2="${y + 5}"/>
    <line x1="${x - 15}" y1="${y - 12}" x2="${x + 15}" y2="${y - 12}"/>
    <line x1="${x}" y1="${y + 5}" x2="${x - 12}" y2="${y + 24}"/>
    <line x1="${x}" y1="${y + 5}" x2="${x + 12}" y2="${y + 24}"/>
  </g>${texto(x, y + 38, nome, { size: 10, weight: 'bold' })}`;
}

// ---------------------------------------------------------------------------
// Diagrama de casos de uso
// ---------------------------------------------------------------------------
export function casosDeUso() {
  const A = 330;
  const B = 600;
  const rx = 98;
  const ry = 21;
  const colA = [
    ['UC01', 'Cadastrar-se e autenticar', 50],
    ['UC02', 'Escolher unidade', 102],
    ['UC03', 'Consultar cardápio da unidade', 154],
    ['UC04', 'Montar sacola', 206],
    ['UC05', 'Aplicar cupom ou recompensa', 258],
    ['UC06', 'Realizar pedido', 330],
    ['UC08', 'Acompanhar pedido', 398],
    ['UC09', 'Participar da fidelidade', 450],
    ['UC10', 'Gerenciar consentimentos (LGPD)', 502],
    ['UC17', 'Cancelar o próprio pedido', 554],
  ];
  const colB = [
    ['UC11', 'Registrar pedido no balcão', 70],
    ['UC12', 'Confirmar retirada', 122],
    ['UC18', 'Cancelar pedido (auditado)', 174],
    ['UC07', 'Realizar pagamento', 330],
    ['UC13', 'Atualizar status de preparo', 420],
    ['UC14', 'Gerenciar estoque e disponibilidade', 500],
    ['UC15', 'Consultar relatórios e indicadores', 552],
    ['UC16', 'Gerenciar campanhas', 604],
    ['UC19', 'Consultar trilha de auditoria', 656],
  ];
  const OFF = 26;
  for (const l of [colA, colB]) for (const uc of l) uc[2] += OFF;
  let s = `<g transform="translate(0,0)"><rect x="215" y="10" width="500" height="${686 + OFF}" rx="10" fill="${COR.cinza}" stroke="${COR.suave}" stroke-width="1.2"/>`;
  s += texto(465, 26, 'Sistema Raízes do Nordeste – Front-end multicanal', { size: 10.5, weight: 'bold', cor: COR.suave });
  s += '</g>';
  return casosDeUsoCorpo(s, colA, colB, A, B, rx, ry, OFF);
}

function casosDeUsoCorpo(s0, colA, colB, A, B, rx, ry, OFF) {
  let s = s0;
  const Y = (y) => y + OFF;
  const cli = [92, Y(300)];
  for (const [, , y] of colA) s += linha([[cli[0] + 18, cli[1] - 10], [A - rx, y]], { seta: false });
  const atd = [820, Y(122)];
  for (const y of [70, 122, 174]) s += linha([[atd[0] - 18, atd[1] - 10], [B + rx, Y(y)]], { seta: false });
  s += linha([[765, Y(330)], [B + rx, Y(330)]], { seta: false });
  s += linha([[atd[0] - 18, Y(420)], [B + rx, Y(420)]], { seta: false });
  const ger = [820, Y(578)];
  for (const y of [500, 552, 604, 656]) s += linha([[ger[0] - 18, ger[1] - 10], [B + rx, Y(y)]], { seta: false });
  for (const [id, nome, y] of colA) s += elipse(A, y, rx, ry, [`${id}`, nome], { size: 9.2 });
  for (const [id, nome, y] of colB) s += elipse(B, y, rx, ry, [`${id}`, nome], { size: 9.2, fill: id === 'UC07' ? COR.sol : COR.fundo });
  // UC06 inclui UC07 (o pedido sempre passa pelo pagamento)
  s += linha([[A + rx, Y(330)], [B - rx, Y(330)]], { tracejada: true, aberta: true, rotulo: '«include»', ry: Y(320) });
  // UC05 estende UC06 (cupom/recompensa é opcional)
  s += `<path d="M${A + 70},${Y(258) + 16} C${A + 135},${Y(280)} ${A + 135},${Y(310)} ${A + 72},${Y(330) - 16}" fill="none" stroke="${COR.traco}" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#seta-aberta)"/>`;
  s += texto(A + 125, Y(296), '«extend»', { size: 9, cor: COR.suave, italico: true, anchor: 'start' });
  // UC06 inclui UC01 no app/site (pedido exige conta)
  s += `<path d="M${A + 60},${Y(330) - 18} C${A + 190},${Y(250)} ${A + 190},${Y(110)} ${A + 78},${Y(50) + 14}" fill="none" stroke="${COR.traco}" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#seta-aberta)"/>`;
  s += texto(A + 150, Y(262), '«include»\n(app/site)', { size: 9, cor: COR.suave, italico: true, anchor: 'start' });
  s += ator(cli[0], cli[1], 'Cliente');
  s += texto(cli[0], cli[1] + 62, '(app, site e totem)', { size: 8.5, cor: COR.suave });
  s += ator(atd[0], atd[1], 'Atendente');
  s += ator(820, Y(330), 'Pagamento', { sistema: true });
  s += ator(atd[0], Y(440), 'Cozinha');
  s += ator(ger[0], ger[1], 'Gerente /');
  s += texto(ger[0], ger[1] + 52, 'Administrador', { size: 10, weight: 'bold' });
  return svg(900, 712 + OFF, s);
}

// ---------------------------------------------------------------------------
// Jornada do usuário (raias verticais, fluxo de cima para baixo)
// ---------------------------------------------------------------------------
export function jornada() {
  const raias = [
    ['Cliente', 0, 175],
    ['Interface (app, site ou totem)', 175, 400],
    ['Front-end / API da rede', 400, 615],
    ['Provedor de pagamento', 615, 760],
    ['Loja (cozinha e balcão)', 760, 900],
  ];
  const C = 88; const I = 288; const S = 508; const P = 688; const L = 830;
  const fases = [
    ['1. Descoberta', 34, 168],
    ['2. Escolha', 168, 330],
    ['3. Identificação', 330, 452],
    ['4. Pagamento', 452, 790],
    ['5. Preparo', 790, 910],
    ['6. Retirada', 910, 1060],
  ];
  let s = '';
  raias.forEach(([nome, x1, x2], i) => {
    s += `<rect x="${x1}" y="0" width="${x2 - x1}" height="1060" fill="${i % 2 ? '#fbf8f3' : '#ffffff'}" stroke="${COR.suave}" stroke-width="0.8"/>`;
    s += `<rect x="${x1}" y="0" width="${x2 - x1}" height="30" fill="${COR.anil}"/>`;
    s += texto((x1 + x2) / 2, 15, nome, { size: 10, weight: 'bold', cor: '#fff' });
  });
  fases.forEach(([nome, y1]) => {
    s += `<line x1="0" y1="${y1}" x2="900" y2="${y1}" stroke="${COR.suave}" stroke-width="0.8" stroke-dasharray="3 3"/>`;
    s += texto(6, y1 + 11, nome, { size: 9, weight: 'bold', anchor: 'start', cor: COR.urucum });
  });
  const no = (x, y, t, o = {}) => caixa(x, y, o.w || 150, o.h || 38, t, { size: 9.3, ...o });
  const estado = { fill: COR.verdeClaro };
  const integ = { fill: COR.anilClaro };
  const erro = { fill: COR.vermelhoClaro };

  // 1. Descoberta
  s += caixa(C, 70, 140, 34, 'Abre app, site\nou totem', { rx: 17, fill: COR.urucumClaro, size: 9.3 });
  s += no(I, 70, 'Início + aviso de cookies\n(aceitar / recusar / personalizar)');
  s += no(I, 132, 'Escolhe a unidade\n(status, formato, endereço)');
  s += losango(S, 132, 130, 56, 'Unidade\naberta?');
  s += no(I, 196, 'Pedido antecipado:\nagenda horário de retirada', { h: 34 });
  s += linha([[C + 70, 70], [I - 75, 70]]);
  s += linha([[I, 89], [I, 113]]);
  s += linha([[I + 75, 132], [S - 65, 132]]);
  s += linha([[S, 160], [S, 196], [I + 75, 196]], { rotulo: 'não', rx: S + 14, ry: 178, anchor: 'start' });

  // 2. Escolha
  s += no(I, 252, 'Cardápio da unidade\n(estoque, sazonais, regional)');
  s += linha([[S + 65, 132], [S + 90, 132], [S + 90, 222], [I + 55, 222], [I + 55, 233]], { rotulo: 'sim', rx: S + 96, ry: 150, anchor: 'start' });
  s += linha([[I, 213], [I, 233]]);
  s += no(C, 252, 'Escolhe itens,\nquantidade e observação', { w: 145 });
  s += linha([[I - 75, 252], [C + 73, 252]]);
  s += no(I, 308, 'Sacola: cupom, recompensa\ne desconto de nível');
  s += linha([[C, 271], [C, 308], [I - 75, 308]]);
  s += losango(S, 308, 120, 46, 'Cupom\nválido?');
  s += linha([[I + 75, 308], [S - 60, 308]]);
  s += linha([[S, 285], [S, 272], [I + 75, 272]], { rotulo: 'não: mensagem\ncom o motivo', rx: S + 10, ry: 262, anchor: 'start' });

  // 3. Identificação
  s += losango(S, 372, 130, 50, 'Cliente\nidentificado?');
  s += linha([[S, 331], [S, 347]], { rotulo: 'sim', rx: S + 8, ry: 339, anchor: 'start' });
  s += no(I, 372, 'Entrar ou cadastrar\n(consentimentos LGPD)', { w: 150 });
  s += linha([[S - 65, 372], [I + 75, 372]], { rotulo: 'não (app/site)', ry: 362 });
  s += no(C, 372, 'Totem/balcão:\nCPF opcional p/ pontos', { w: 145, fill: COR.cinza });
  s += no(I, 430, 'Checkout: consumo, horário\ne forma de pagamento');
  s += linha([[I, 391], [I, 411]]);
  s += linha([[S, 397], [S, 430], [I + 75, 430]], { rotulo: 'sim', rx: S + 8, ry: 414, anchor: 'start' });

  // 4. Pagamento
  s += no(S, 488, 'Cria pedido AGUARDANDO_\nPAGAMENTO e reserva estoque', { w: 170, ...estado });
  s += linha([[I, 449], [I, 470], [S - 85, 470], [S - 85, 476]]);
  s += no(P, 488, 'Processa Pix ou\ncartão (PCI-DSS)', { w: 125, ...integ });
  s += linha([[S + 85, 488], [P - 62, 488]], { rotulo: 'solicita (chave de idempotência)', rx: 600, ry: 460 });
  s += losango(S, 568, 140, 60, 'Resposta do\nprovedor?');
  s += linha([[P, 507], [P, 568], [S + 70, 568]], { rotulo: 'resposta', rx: P + 6, ry: 540, anchor: 'start' });
  s += no(I, 568, 'Recusado: motivo + tentar\noutra forma ou cancelar', { ...erro });
  s += linha([[S - 70, 568], [I + 75, 568]], { rotulo: 'recusado', ry: 558 });
  s += linha([[I, 549], [I, 520], [S - 85, 520], [S - 85, 507]], { rotulo: 'nova tentativa', rx: I + 6, ry: 532, anchor: 'start' });
  s += no(I, 650, 'Pix: QR Code + copia e cola\n(aguarda confirmação)', { ...integ });
  s += linha([[S - 50, 577], [S - 50, 650], [I + 75, 650]], { rotulo: 'Pix pendente', rx: S - 112, ry: 640, anchor: 'start' });
  s += no(S + 55, 694, 'Sem resposta (7 s):\nconsulta o status,\nsem nova cobrança', { w: 100, h: 52, size: 8.8, ...erro });
  s += linha([[S + 20, 590], [S + 20, 668]], { rotulo: 'timeout', rx: S + 26, ry: 618, anchor: 'start' });
  s += linha([[S + 105, 694], [P, 694], [P, 507]], { tracejada: true, rotulo: 'consulta', rx: P + 6, ry: 610, anchor: 'start' });
  s += no(S, 768, 'Pedido CONFIRMADO\n+ pontos de fidelidade', { w: 170, ...estado });
  s += linha([[S - 20, 590], [S - 20, 749]], { rotulo: 'aprovado', rx: S - 26, ry: 720, anchor: 'end' });
  s += linha([[I, 669], [I, 700], [S - 20, 700]], { seta: false });

  // 5. Preparo
  s += no(L, 820, 'Cozinha (KDS):\nEM_PREPARO → PRONTO', { w: 125, ...estado });
  s += linha([[S + 85, 768], [L, 768], [L, 801]]);
  s += no(I, 860, 'Acompanhamento em\ntempo real + código', { w: 150 });
  s += linha([[L - 62, 830], [L - 90, 830], [L - 90, 860], [I + 75, 860]], { rotulo: 'status', rx: 600, ry: 850 });
  s += no(C, 860, 'Acompanha o status\nno app ou no painel', { w: 145 });
  s += linha([[I - 75, 860], [C + 73, 860]]);

  // 6. Retirada
  s += no(C, 950, 'Apresenta o código\nno balcão', { w: 145 });
  s += linha([[C, 879], [C, 931]]);
  s += no(L, 950, 'Balcão confirma:\nENTREGUE', { w: 125, ...estado });
  s += linha([[C + 73, 950], [L - 62, 950]]);
  s += caixa(C, 1020, 140, 34, 'Fim: avalia ou\npede de novo', { rx: 17, fill: COR.urucumClaro, size: 9.3 });
  s += linha([[L, 969], [L, 1020], [C + 70, 1020]]);

  // Legenda
  const leg = [[COR.verdeClaro, 'Estado do pedido'], [COR.anilClaro, 'Integração externa'], [COR.vermelhoClaro, 'Exceção tratada'], [COR.sol, 'Decisão']];
  leg.forEach(([cor, nome], i) => {
    const x = 410 + i * 125;
    s += `<rect x="${x}" y="1038" width="14" height="12" fill="${cor}" stroke="${COR.traco}" stroke-width="0.8"/>`;
    s += texto(x + 20, 1044, nome, { size: 9, anchor: 'start' });
  });
  return svg(900, 1060, s);
}

// ---------------------------------------------------------------------------
// Estados do pedido
// ---------------------------------------------------------------------------
export function estadosPedido() {
  let s = '';
  const y = 70;
  s += `<circle cx="22" cy="${y}" r="9" fill="${COR.traco}"/>`;
  const est = (cx, cy, w, t, fill = COR.fundo) => caixa(cx, cy, w, 44, t, { rx: 16, fill, size: 9.5, weight: 'bold' });
  s += est(130, y, 150, 'AGUARDANDO\nPAGAMENTO', COR.sol);
  s += est(330, y, 120, 'CONFIRMADO', COR.verdeClaro);
  s += est(500, y, 120, 'EM_PREPARO', COR.verdeClaro);
  s += est(670, y, 110, 'PRONTO', COR.verdeClaro);
  s += est(820, y + 120, 110, 'ENTREGUE');
  s += est(130, 250, 150, 'PAGAMENTO\nRECUSADO', COR.vermelhoClaro);
  s += est(500, 250, 140, 'CANCELADO', COR.vermelhoClaro);
  s += `<circle cx="820" cy="270" r="10" fill="none" stroke="${COR.traco}" stroke-width="1.5"/><circle cx="820" cy="270" r="6" fill="${COR.traco}"/>`;
  s += `<circle cx="500" cy="318" r="10" fill="none" stroke="${COR.traco}" stroke-width="1.5"/><circle cx="500" cy="318" r="6" fill="${COR.traco}"/>`;
  s += linha([[31, y], [55, y]], { rotulo: 'pedido criado', rx: 40, ry: y - 26 });
  s += linha([[205, y], [270, y]], { rotulo: 'aprovado', ry: y - 12 });
  s += linha([[390, y], [440, y]], { rotulo: 'inicia', ry: y - 12 });
  s += linha([[560, y], [615, y]], { rotulo: 'concluído', ry: y - 12 });
  s += linha([[725, y], [820, y], [820, y + 98]], { rotulo: 'retirado', rx: 790, ry: y - 12 });
  s += linha([[820, y + 142], [820, 260]]);
  s += linha([[100, y + 22], [100, 228]], { rotulo: 'recusado /\nPix expirado', rx: 94, ry: 160, anchor: 'end' });
  s += linha([[160, 228], [160, y + 22]], { rotulo: 'nova\ntentativa', rx: 166, ry: 160, anchor: 'start' });
  s += linha([[205, 250], [430, 250]], { rotulo: 'desistência ou 15 min', ry: 240 });
  s += linha([[190, y + 22], [190, 140], [455, 140], [455, 228]], { rotulo: 'cancelado /\nexpirou (15 min)', rx: 258, ry: 122 });
  s += linha([[330, y + 22], [330, 175], [480, 175], [480, 228]], { rotulo: 'cliente ou equipe\n(estorno)', rx: 395, ry: 192 });
  s += linha([[500, y + 22], [500, 228]], { rotulo: 'equipe\n(auditado)', rx: 506, ry: 160, anchor: 'start' });
  s += linha([[500, 272], [500, 308]]);
  return svg(900, 335, s);
}

// ---------------------------------------------------------------------------
// Sequência: Realizar pagamento
// ---------------------------------------------------------------------------
export function sequenciaPagamento() {
  const xs = { cli: 90, ui: 300, api: 540, psp: 790 };
  const nomes = { cli: 'Cliente', ui: 'Interface\n(tela Pagamento)', api: 'Front-end / API\n(store.js)', psp: 'Provedor de pagamento\n(serviço externo)' };
  let s = '';
  for (const [k, x] of Object.entries(xs)) {
    s += caixa(x, 28, k === 'psp' ? 170 : 150, 40, nomes[k], { fill: k === 'psp' ? COR.anilClaro : COR.cinza, size: 10, weight: 'bold' });
    s += `<line x1="${x}" y1="48" x2="${x}" y2="610" stroke="${COR.suave}" stroke-dasharray="4 4"/>`;
  }
  const msg = (de, para, y, t, { ret = false } = {}) => {
    const x1 = xs[de]; const x2 = xs[para];
    const dir = x2 > x1 ? 1 : -1;
    return linha([[x1 + dir * 4, y], [x2 - dir * 4, y]], { tracejada: ret, aberta: ret, rotulo: t, ry: y - 9, size: 9.3 });
  };
  const self = (k, y, t) => `<path d="M${xs[k] + 4},${y} h28 v18 h-26" fill="none" stroke="${COR.traco}" stroke-width="1.2" marker-end="url(#seta)"/>${texto(xs[k] + 38, y + 9, t, { size: 9, anchor: 'start', cor: COR.suave, italico: true })}`;
  let y = 78;
  s += msg('cli', 'ui', y, '1. Confirmar e pagar');
  s += msg('ui', 'api', y += 32, '2. criarPedido(retirada, forma)');
  s += self('api', y += 12, '3. valida estoque e cupom; reserva itens');
  s += msg('api', 'ui', y += 40, '4. pedido RN-xxxx (AGUARDANDO_PAGAMENTO)', { ret: true });
  s += msg('ui', 'api', y += 32, '5. pagarPedido(id, forma)');
  s += msg('api', 'psp', y += 32, '6. solicitarPagamento(valor, forma, chave)');
  const alt = (y1, y2, rotulos) => {
    let r = `<rect x="20" y="${y1}" width="870" height="${y2 - y1}" fill="none" stroke="${COR.traco}" stroke-width="1"/>`;
    r += `<path d="M20,${y1} h44 v14 l-8,8 h-36 z" fill="${COR.cinza}" stroke="${COR.traco}" stroke-width="1"/>${texto(40, y1 + 11, 'alt', { size: 9.5, weight: 'bold' })}`;
    rotulos.forEach(([yy, t], i) => {
      if (i) r += `<line x1="20" y1="${yy}" x2="890" y2="${yy}" stroke="${COR.traco}" stroke-dasharray="6 4"/>`;
      r += texto(100, yy + 12, `[${t}]`, { size: 9, anchor: 'start', italico: true, cor: COR.urucum });
    });
    return r;
  };
  const y1 = y + 18;
  s += alt(y1, y1 + 330, [[y1, 'aprovado'], [y1 + 92, 'recusado'], [y1 + 182, 'sem resposta em 7 s (timeout)']]);
  s += msg('psp', 'api', y1 + 30, '7a. aprovado (autorização)', { ret: true });
  s += msg('api', 'ui', y1 + 58, '8a. CONFIRMADO + pontos', { ret: true });
  s += msg('ui', 'cli', y1 + 80, '9a. "Pagamento aprovado!"', { ret: true });
  s += msg('psp', 'api', y1 + 120, '7b. recusado (motivo)', { ret: true });
  s += msg('api', 'ui', y1 + 146, '8b. PAGAMENTO_RECUSADO', { ret: true });
  s += msg('ui', 'cli', y1 + 168, '9b. motivo + tentar outra forma', { ret: true });
  s += msg('api', 'ui', y1 + 212, '7c. sem_resposta', { ret: true });
  s += msg('cli', 'ui', y1 + 238, '8c. Verificar status');
  s += msg('ui', 'api', y1 + 260, '9c. verificarPagamento(id)');
  s += msg('api', 'psp', y1 + 284, '10c. consultarPagamento(chave)');
  s += msg('psp', 'api', y1 + 312, '11c. status real (sem nova cobrança)', { ret: true });
  return svg(900, 620, s);
}

// ---------------------------------------------------------------------------
// Arquitetura do front-end
// ---------------------------------------------------------------------------
export function arquitetura() {
  let s = '';
  const camada = (y, h, nome, cor) => `<rect x="10" y="${y}" width="880" height="${h}" rx="8" fill="${cor}" stroke="${COR.suave}" stroke-width="0.8"/>${texto(22, y + 13, nome, { size: 9.5, weight: 'bold', anchor: 'start', cor: COR.suave })}`;
  s += camada(8, 82, 'CANAIS (layouts)', COR.urucumClaro);
  const canais = ['App / Site (PWA)\nmobile-first', 'Totem de\nautoatendimento', 'Balcão (PDV)', 'Cozinha (KDS)', 'Gerência e\nMatriz'];
  canais.forEach((c, i) => { s += caixa(105 + i * 172, 55, 150, 40, c, { size: 9.8 }); });
  s += camada(104, 70, 'APRESENTAÇÃO', COR.cinza);
  s += caixa(230, 145, 330, 38, 'app.js – roteador por hash, layouts por canal,\ncookies, painel de demonstração', { size: 9.5 });
  s += caixa(650, 145, 330, 38, 'views/*.js – telas (render + eventos)\nui.js – templates com escape (anti-XSS)', { size: 9.5 });
  s += camada(188, 82, 'DOMÍNIO E ESTADO', COR.verdeClaro);
  s += caixa(230, 235, 330, 44, 'domain.js – regras de negócio puras\n(máquina de estados, cupons, totais,\nfidelidade, validações, mascaramento)', { size: 9.5 });
  s += caixa(650, 235, 330, 44, 'store.js – estado + API simulada\n(pedidos, auth, estoque, auditoria);\nler-modificar-gravar entre abas', { size: 9.5 });
  s += camada(284, 82, 'DADOS E INTEGRAÇÕES', COR.anilClaro);
  s += caixa(150, 330, 230, 44, 'data.js – mock data\n(unidades, cardápio, campanhas)', { size: 9.5 });
  s += caixa(445, 330, 250, 44, 'localStorage / sessionStorage\n(simula banco e sessão)', { size: 9.5 });
  s += caixa(745, 330, 250, 44, 'services/gateway.js\nprovedor de pagamento EXTERNO', { size: 9.5, fill: COR.sol });
  s += caixa(450, 395, 520, 30, 'Back-end futuro: API REST + WebSocket/SSE (mesmos contratos de store.js)', { dash: '6 4', size: 9.5, fill: '#fff' });
  for (const x of [230, 650]) s += linha([[x, 90], [x, 126]]);
  s += linha([[230, 164], [230, 213]]);
  s += linha([[650, 164], [650, 213]]);
  s += linha([[485, 235], [395, 235]], { rotulo: 'usa', ry: 226 });
  s += linha([[600, 257], [445, 308]]);
  s += linha([[720, 257], [745, 308]]);
  s += linha([[560, 257], [150, 308]]);
  s += linha([[445, 352], [445, 380]], { tracejada: true, aberta: true });
  return svg(900, 420, s);
}

// ---------------------------------------------------------------------------
// Mapa de navegação (arquitetura de informação)
// ---------------------------------------------------------------------------
export function mapaNavegacao() {
  let s = '';
  const no = (x, y, t, o = {}) => caixa(x, y, o.w || 118, o.h || 30, t, { size: 9, rx: 5, ...o });
  const grupo = (x, y, w, h, nome, cor) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${cor}" stroke="${COR.suave}" stroke-width="0.8"/>${texto(x + 10, y + 13, nome, { size: 9.5, weight: 'bold', anchor: 'start', cor: COR.suave })}`;
  s += grupo(5, 5, 610, 300, 'CLIENTE – App / Site (#/)', COR.urucumClaro);
  s += grupo(625, 5, 270, 120, 'TOTEM (#/totem)', COR.sol);
  s += grupo(625, 135, 270, 170, 'EQUIPE (#/equipe)', COR.anilClaro);
  // Cliente: fluxo principal
  s += no(70, 50, 'Início', { fill: '#fff', weight: 'bold' });
  s += no(70, 100, 'Unidades');
  s += no(205, 50, 'Cardápio');
  s += no(205, 100, 'Produto (diálogo)');
  s += no(340, 50, 'Sacola');
  s += no(475, 50, 'Checkout');
  s += no(475, 100, 'Pagamento');
  s += no(475, 150, 'Acompanhamento');
  s += no(340, 100, 'Entrar / Cadastro');
  s += linha([[129, 50], [146, 50]]);
  s += linha([[70, 65], [70, 85]]);
  s += linha([[205, 65], [205, 85]]);
  s += linha([[264, 50], [281, 50]]);
  s += linha([[399, 50], [416, 50]]);
  s += linha([[475, 65], [475, 85]]);
  s += linha([[475, 115], [475, 135]]);
  s += linha([[416, 58], [380, 85]], { tracejada: true, rotulo: 'se não logado', rx: 430, ry: 78, anchor: 'start' });
  // Cliente: áreas de apoio
  const apoio = [['Promoções', 70], ['Fidelidade', 205], ['Meus pedidos', 340], ['Conta', 475]];
  apoio.forEach(([t, x]) => { s += no(x, 215, t); });
  s += no(475, 262, 'Central de privacidade');
  s += no(340, 262, 'Política de privacidade');
  s += no(205, 262, 'Preferências de cookies');
  s += linha([[475, 230], [475, 247]]);
  s += linha([[416, 262], [399, 262]]);
  s += texto(310, 188, 'Navegação global: menu superior (desktop) e barra inferior (celular)', { size: 9, cor: COR.suave, italico: true });
  // Totem
  s += no(690, 50, 'Tela de espera', { w: 110 });
  s += no(830, 50, 'Cardápio', { w: 100 });
  s += no(690, 100, 'Sacola + checkout\n(CPF opcional)', { w: 120, h: 34 });
  s += no(830, 100, 'Pagamento →\nconfirmação', { w: 100, h: 34 });
  s += linha([[745, 50], [780, 50]]);
  s += linha([[830, 65], [760, 83]]);
  s += linha([[750, 100], [780, 100]]);
  // Equipe
  s += no(760, 180, 'Login da equipe', { w: 130 });
  s += no(690, 240, 'Balcão\n(atendente)', { w: 100, h: 34 });
  s += no(800, 240, 'Cozinha', { w: 80, h: 34 });
  s += no(760, 285, 'Gerência / Matriz', { w: 150, h: 26 });
  s += linha([[730, 195], [700, 223]]);
  s += linha([[790, 195], [800, 223]]);
  s += linha([[825, 180], [868, 180], [868, 285], [835, 285]]);
  return svg(900, 310, s);
}
