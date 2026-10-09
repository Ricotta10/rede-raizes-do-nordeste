// Estado da aplicação e "back-end simulado".
//  - db    (localStorage): dados compartilhados que, em produção, ficariam no servidor
//                          (usuários, pedidos, estoque, campanhas, auditoria).
//  - local (localStorage): estado do dispositivo do cliente (unidade, sacola, sessão, cookies).
//  - aba   (sessionStorage): estado da aba (sessão da equipe, modo totem), permitindo
//                          abrir cliente, cozinha e balcão em abas diferentes ao mesmo tempo.

import * as D from './data.js';
import * as R from './domain.js';
import * as gateway from './services/gateway.js';

const VERSAO = 3;
const CHAVE_DB = 'raizes:db';
const CHAVE_LOCAL = 'raizes:local';
const CHAVE_ABA = 'raizes:aba';

let db = null;
let local = null;
let aba = null;
const ouvintes = new Set();
const pagamentosEmAndamento = new Set();

const agoraISO = () => new Date().toISOString();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).slice(0, 18);

function ler(storage, chave) {
  try {
    const v = storage.getItem(chave);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function gravar(storage, chave, valor) {
  try { storage.setItem(chave, JSON.stringify(valor)); } catch { /* modo privado ou cota cheia */ }
}

const carrinhoVazio = () => ({ unidadeId: null, itens: [], cupom: null, voucherId: null });
const localPadrao = () => ({
  unidadeId: null,
  clienteId: null,
  carrinho: carrinhoVazio(),
  cookies: null,
  demo: { gateway: 'auto', cozinhaAutomatica: true },
  tentativasLogin: {},
});
const abaPadrao = () => ({
  equipeId: null,
  totem: null,
  carrinhoTotem: carrinhoVazio(),
  carrinhoBalcao: carrinhoVazio(),
  clienteIdentificado: { totem: null, balcao: null },
});

function salvar() {
  gravar(localStorage, CHAVE_DB, db);
  gravar(localStorage, CHAVE_LOCAL, local);
  gravar(sessionStorage, CHAVE_ABA, aba);
}

function recarregar() {
  const d = ler(localStorage, CHAVE_DB);
  if (d && d.versao === VERSAO) db = d;
  const l = ler(localStorage, CHAVE_LOCAL);
  if (l) local = { ...localPadrao(), ...l };
}

function notificar() {
  ouvintes.forEach((fn) => {
    try { fn(); } catch (e) { console.error(e); }
  });
}

// Toda escrita relê o armazenamento antes (ler-modificar-gravar) para não
// sobrescrever alterações feitas em outra aba.
function alterar(fn) {
  recarregar();
  const resultado = fn();
  salvar();
  notificar();
  return resultado;
}

export const assinar = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

export async function hashSenha(senha, sal) {
  const dados = new TextEncoder().encode(`${sal}:${senha}`);
  if (globalThis.crypto?.subtle) {
    const h = await crypto.subtle.digest('SHA-256', dados);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;
  for (const b of dados) h = ((h << 5) + h + b) >>> 0;
  return `djb2-${h.toString(16)}`;
}

// ---------------------------------------------------------------------------
// Inicialização e dados de demonstração
// ---------------------------------------------------------------------------

export async function iniciar() {
  db = ler(localStorage, CHAVE_DB);
  if (!db || db.versao !== VERSAO) db = await semear();
  local = { ...localPadrao(), ...(ler(localStorage, CHAVE_LOCAL) || {}) };
  local.demo = { ...localPadrao().demo, ...local.demo };
  aba = { ...abaPadrao(), ...(ler(sessionStorage, CHAVE_ABA) || {}) };
  if (local.clienteId && !db.usuarios.some((u) => u.id === local.clienteId)) local.clienteId = null;
  salvar();
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE_DB || e.key === CHAVE_LOCAL) {
      recarregar();
      notificar();
    }
  });
}

function prng(semente) {
  let s = semente;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES = ['João', 'Maria', 'Severino', 'Luiza', 'Pedro', 'Rita', 'Antônio', 'Cícera', 'Rafael', 'Bruna',
  'Thiago', 'Juliana', 'Raimundo', 'Lúcia', 'Gabriel', 'Fernanda', 'Davi', 'Helena', 'Lucas', 'Iracema'];

async function semear() {
  const agora = new Date();
  const rnd = prng(20261009);
  const escolher = (lista) => lista[Math.floor(rnd() * lista.length)];
  const ponderado = (pares) => {
    const total = pares.reduce((s, [, p]) => s + p, 0);
    let r = rnd() * total;
    for (const [v, p] of pares) {
      if ((r -= p) <= 0) return v;
    }
    return pares[0][0];
  };

  const usuarios = [];
  for (const c of D.CLIENTES_DEMO) {
    const { senha, ...resto } = c;
    usuarios.push({
      ...resto,
      senhaHash: await hashSenha(senha, c.id),
      criadoEm: new Date(agora.getTime() - 200 * 864e5).toISOString(),
      extrato: [
        { em: new Date(agora.getTime() - 3 * 864e5).toISOString(), descricao: 'Pedido RN-0987', pontos: 42 },
        { em: new Date(agora.getTime() - 10 * 864e5).toISOString(), descricao: 'Resgate: R$ 10,00 de desconto', pontos: -200 },
        { em: new Date(agora.getTime() - 25 * 864e5).toISOString(), descricao: 'Pedido RN-0912', pontos: 35 },
      ],
      vouchers: [],
      consentimentos: { termos: { versao: D.VERSAO_TERMOS, em: new Date(agora.getTime() - 200 * 864e5).toISOString() }, ...c.consentimentos },
      historicoConsentimentos: Object.entries(c.consentimentos).map(([finalidade, valor]) => ({
        finalidade, valor, em: new Date(agora.getTime() - 200 * 864e5).toISOString(), canal: 'App',
      })),
    });
  }

  // Base sintética de clientes (sem login) para os relatórios agregados de campanhas.
  for (let i = 0; i < 80; i++) {
    const nascimento = `${1960 + Math.floor(rnd() * 46)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-15`;
    const personalizacao = rnd() < 0.55;
    usuarios.push({
      id: `cli-s${i}`, sintetico: true,
      nome: `${escolher(NOMES)} ${escolher(['Silva', 'Santos', 'Oliveira', 'Lima', 'Araújo', 'Costa'])}`,
      email: `cliente${String(i).padStart(3, '0')}@exemplo.com`,
      nascimento: personalizacao ? nascimento : null,
      pontos: Math.floor(rnd() * 900), pontosAcumulados: Math.floor(rnd() * 1500),
      consentimentos: { fidelidade: rnd() < 0.7, personalizacao, comunicacoes: rnd() < 0.35 },
      extrato: [], vouchers: [], historicoConsentimentos: [],
    });
  }

  const equipe = [];
  for (const e of D.EQUIPE) {
    const { senha, ...resto } = e;
    equipe.push({ ...resto, senhaHash: await hashSenha(senha, e.id) });
  }

  const estoque = {};
  const pausados = {};
  for (const u of D.UNIDADES) {
    estoque[u.id] = {};
    pausados[u.id] = [];
    for (const p of D.PRODUTOS) {
      if (!R.produtoNaUnidade(p, u)) continue;
      estoque[u.id][p.id] = 15 + Math.floor(rnd() * 45);
    }
  }
  // Situações reais de operação para a demonstração.
  estoque['recife-boa-viagem']['suco-graviola'] = 0;
  estoque['recife-boa-viagem']['bolo-rolo'] = 4;
  estoque['sao-paulo-paulista']['tap-carne-sol'] = 0;
  pausados['fortaleza-aldeota'].push('cartola');

  // Histórico de vendas dos últimos 14 dias para os painéis da gerência e da matriz.
  const peso = {
    'recife-boa-viagem': 1.5, 'caruaru-centro': 0.9, 'fortaleza-aldeota': 1.3,
    'salvador-barra': 0.8, 'sao-paulo-paulista': 1.1, 'brasilia-asa-sul': 0.6,
  };
  const pedidos = [];
  const auditoria = [];
  let seq = 1000;
  for (let d = 13; d >= 0; d--) {
    for (const u of D.UNIDADES) {
      const n = Math.round((3 + rnd() * 4) * peso[u.id]);
      for (let k = 0; k < n; k++) {
        const data = new Date(agora);
        data.setDate(data.getDate() - d);
        const ini = R.minutosDoDia(u.abre);
        const fim = R.minutosDoDia(u.fecha);
        const m = ini + Math.floor(rnd() * (fim - ini));
        data.setHours(Math.floor(m / 60), m % 60, 0, 0);
        if (data > agora) continue;
        const canal = ponderado([['app', 35], ['totem', 25], ['balcao', 30], ['web', 10]]);
        const opcoes = D.PRODUTOS.filter((p) => R.produtoNaUnidade(p, u) && R.emTemporada(p, data));
        const itens = [];
        const qtdItens = 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < qtdItens; i++) {
          const p = escolher(opcoes);
          const ja = itens.find((x) => x.produtoId === p.id);
          if (ja) ja.qtd += 1;
          else itens.push({ produtoId: p.id, nome: R.adaptarProduto(p, u).nome, emoji: p.emoji, categoria: p.categoria, preco: p.preco, qtd: 1, obs: '' });
        }
        const totais = R.calcularTotais({ itens });
        const metodo = canal === 'balcao'
          ? ponderado([['dinheiro', 20], ['cartao_balcao', 55], ['pix_balcao', 25]])
          : canal === 'totem'
            ? ponderado([['cartao_totem', 70], ['pix', 30]])
            : ponderado([['pix', 45], ['credito', 40], ['debito', 15]]);
        const cancelado = rnd() < 0.04;
        const em = data.toISOString();
        seq += 1;
        const pedido = {
          id: `h${seq}`, codigo: `RN-${String(seq).padStart(4, '0')}`, unidadeId: u.id, canal,
          clienteId: null, nomeChamada: escolher(NOMES),
          itens, subtotal: totais.subtotal, descontos: [], total: totais.total,
          retirada: { tipo: rnd() < 0.5 ? 'local' : 'retirada', horario: null },
          pagamento: { metodo, status: cancelado ? 'estornado' : 'aprovado', tentativas: 1, transacaoId: `txn_H${seq}` },
          status: cancelado ? 'CANCELADO' : 'ENTREGUE',
          historico: [{ status: 'CONFIRMADO', em, por: R.nomeCanal(canal) }, { status: cancelado ? 'CANCELADO' : 'ENTREGUE', em, por: 'Equipe' }],
          pontos: 0, criadoEm: em,
        };
        if (cancelado) {
          const motivo = escolher(['Cliente desistiu', 'Item indisponível após o pedido', 'Pedido duplicado']);
          pedido.cancelamento = { motivo, por: 'Carlos Lima', em };
          auditoria.push({
            id: `a${seq}`, em, acao: 'PEDIDO_CANCELADO', unidadeId: u.id, alvo: pedido.codigo,
            ator: { nome: 'Carlos Lima', papel: 'atendente' },
            detalhes: `Motivo: ${motivo}. Valor: ${R.moeda(pedido.total)} (estorno solicitado)`,
          });
        }
        pedidos.push(pedido);
      }
    }
  }
  auditoria.push({
    id: 'a-est-1', em: new Date(agora.getTime() - 2 * 3600e3).toISOString(), acao: 'ESTOQUE_AJUSTADO',
    unidadeId: 'recife-boa-viagem', alvo: 'Suco de graviola (300 ml)',
    ator: { nome: 'Marcos Bezerra', papel: 'gerente' }, detalhes: 'Quantidade alterada de 12 para 0 (polpa vencida descartada)',
  });
  auditoria.push({
    id: 'a-pau-1', em: new Date(agora.getTime() - 26 * 3600e3).toISOString(), acao: 'PRODUTO_PAUSADO',
    unidadeId: 'fortaleza-aldeota', alvo: 'Cartola',
    ator: { nome: 'Francisca Raízes', papel: 'admin' }, detalhes: 'Produto pausado: chapa em manutenção',
  });
  pedidos.reverse();

  // Pedidos anteriores da cliente de demonstração.
  const ana = pedidos.filter((p) => p.unidadeId === 'recife-boa-viagem' && p.status === 'ENTREGUE').slice(2, 5);
  ana.forEach((p) => {
    p.clienteId = 'cli-ana';
    p.nomeChamada = 'Ana';
    p.canal = 'app';
    p.pagamento.metodo = 'pix';
    p.pontos = R.pontosPorValor(p.total);
  });

  auditoria.sort((a, b) => b.em.localeCompare(a.em));
  gateway.limparTransacoes();

  return {
    versao: VERSAO,
    criadoEm: agoraISO(),
    sequencia: seq,
    usuarios, equipe, estoque, pausados, pedidos, auditoria,
    promocoes: D.PROMOCOES.map((p) => ({ ...p })),
  };
}

export async function restaurarDemonstracao() {
  try {
    localStorage.removeItem(CHAVE_DB);
    localStorage.removeItem(CHAVE_LOCAL);
    sessionStorage.removeItem(CHAVE_ABA);
  } catch { /* sem armazenamento */ }
  gateway.limparTransacoes();
  db = await semear();
  local = localPadrao();
  aba = abaPadrao();
  salvar();
  notificar();
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export const demo = () => local.demo;
export const consentimentoCookies = () => local.cookies;
export const unidadePorId = (id) => D.UNIDADES.find((u) => u.id === id) || null;
export const produtoPorId = (id) => D.PRODUTOS.find((p) => p.id === id) || null;
export const promocoes = () => db.promocoes;
export const pedidoPorId = (id) => db.pedidos.find((p) => p.id === id) || null;
export const auditoria = () => db.auditoria;
export const usuarios = () => db.usuarios;
export const estoqueDaUnidade = (id) => db.estoque[id] || {};
export const pausadosDaUnidade = (id) => db.pausados[id] || [];
export const todosPedidos = () => db.pedidos;

export const clienteAtual = () =>
  (local.clienteId ? db.usuarios.find((u) => u.id === local.clienteId) || null : null);

export const membroEquipe = () =>
  (aba.equipeId ? db.equipe.find((e) => e.id === aba.equipeId) || null : null);

export const modoTotem = () => aba.totem;

export function canalAtual() {
  if (aba.totem) return 'totem';
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches;
  return instalado || window.innerWidth < 768 ? 'app' : 'web';
}

export const contextoAtual = () => (aba.totem ? 'totem' : 'cliente');

function caminhoCarrinho(ctx) {
  if (ctx === 'balcao') return [aba, 'carrinhoBalcao'];
  if (ctx === 'totem') return [aba, 'carrinhoTotem'];
  return [local, 'carrinho'];
}
export function carrinho(ctx = contextoAtual()) {
  const [obj, chave] = caminhoCarrinho(ctx);
  return obj[chave];
}
function definirCarrinho(ctx, valor) {
  const [obj, chave] = caminhoCarrinho(ctx);
  obj[chave] = valor;
}

export function unidadeAtual(ctx = contextoAtual()) {
  if (ctx === 'totem') return unidadePorId(aba.totem?.unidadeId);
  if (ctx === 'balcao') return unidadePorId(membroEquipe()?.unidadeId);
  return unidadePorId(local.unidadeId);
}

export function clienteDoContexto(ctx = contextoAtual()) {
  if (ctx === 'cliente') return clienteAtual();
  const id = aba.clienteIdentificado?.[ctx];
  return id ? db.usuarios.find((u) => u.id === id) || null : null;
}

export function cardapio(unidade, agora = new Date()) {
  return D.PRODUTOS.filter((p) => R.produtoNaUnidade(p, unidade)).map((p) => ({
    ...R.adaptarProduto(p, unidade),
    disp: R.disponibilidade(p, unidade, { estoque: estoqueDaUnidade(unidade.id), pausados: pausadosDaUnidade(unidade.id) }, agora),
  }));
}

export function itensCarrinho(ctx = contextoAtual()) {
  const c = carrinho(ctx);
  const u = unidadeAtual(ctx);
  if (!u) return [];
  return c.itens.map((l) => {
    const p = produtoPorId(l.produtoId);
    if (!p) return null;
    const ad = R.adaptarProduto(p, u);
    return {
      linhaId: l.id, produtoId: p.id, nome: ad.nome, emoji: p.emoji, categoria: p.categoria,
      preco: p.preco, qtd: l.qtd, obs: l.obs || '',
      disp: R.disponibilidade(p, u, { estoque: estoqueDaUnidade(u.id), pausados: pausadosDaUnidade(u.id) }),
    };
  }).filter(Boolean);
}

export const pedidosDoCliente = (clienteId) =>
  (clienteId ? db.pedidos.filter((p) => p.clienteId === clienteId) : []);

export const pedidosDaUnidade = (unidadeId, estados = null) =>
  db.pedidos.filter((p) => p.unidadeId === unidadeId && (!estados || estados.includes(p.status)));

export function resumoCarrinho(ctx = contextoAtual()) {
  const c = carrinho(ctx);
  const unidade = unidadeAtual(ctx);
  const itens = itensCarrinho(ctx);
  const cliente = clienteDoContexto(ctx);
  const canal = ctx === 'balcao' ? 'balcao' : canalAtual();
  let promocao = null;
  let cupomErro = null;
  if (c.cupom && unidade) {
    const anteriores = pedidosDoCliente(cliente?.id).filter((p) => p.status !== 'CANCELADO').length;
    const v = R.validarCupom(c.cupom, {
      promocoes: db.promocoes, canal, unidade, itens, usuario: cliente, pedidosAnteriores: anteriores,
    });
    if (v.ok) promocao = v.promocao;
    else cupomErro = v.erro;
  }
  const voucher = !c.cupom && c.voucherId && cliente
    ? (cliente.vouchers || []).find((v) => v.id === c.voucherId && !v.usadoEm && !v.pedidoId) || null
    : null;
  const nivel = cliente?.consentimentos?.fidelidade ? R.nivelPorPontos(cliente.pontosAcumulados) : null;
  const totais = R.calcularTotais({ itens, promocao, voucher, nivel });
  const indisponiveis = itens.filter((i) => !i.disp.disponivel || i.qtd > i.disp.quantidade);
  return {
    carrinho: c, unidade, itens, canal, cliente, promocao, cupomErro, voucher, nivel, totais, indisponiveis,
    quantidade: itens.reduce((s, i) => s + i.qtd, 0),
  };
}

// ---------------------------------------------------------------------------
// Unidade e sacola
// ---------------------------------------------------------------------------

export function selecionarUnidade(id) {
  alterar(() => {
    local.unidadeId = id;
    if (local.carrinho.unidadeId && local.carrinho.unidadeId !== id) local.carrinho = carrinhoVazio();
  });
}

export function adicionarAoCarrinho(produtoId, qtd = 1, obs = '', ctx = contextoAtual()) {
  return alterar(() => {
    const c = carrinho(ctx);
    const u = unidadeAtual(ctx);
    const p = produtoPorId(produtoId);
    if (!u || !p) return { ok: false, erro: 'Selecione uma unidade antes de adicionar itens.' };
    const disp = R.disponibilidade(p, u, { estoque: estoqueDaUnidade(u.id), pausados: pausadosDaUnidade(u.id) });
    if (!disp.disponivel) return { ok: false, erro: `${p.nome}: ${disp.rotulo.toLowerCase()}.` };
    const jaNaSacola = c.itens.filter((i) => i.produtoId === produtoId).reduce((s, i) => s + i.qtd, 0);
    if (jaNaSacola + qtd > disp.quantidade) {
      return { ok: false, erro: `Só temos ${disp.quantidade} unidade(s) de ${p.nome} disponível(is) agora.` };
    }
    c.unidadeId = u.id;
    const obsLimpa = String(obs || '').trim().slice(0, 140);
    const existente = c.itens.find((i) => i.produtoId === produtoId && (i.obs || '') === obsLimpa);
    if (existente) existente.qtd += qtd;
    else c.itens.push({ id: uid(), produtoId, qtd, obs: obsLimpa });
    return { ok: true };
  });
}

export function alterarQuantidade(linhaId, qtd, ctx = contextoAtual()) {
  return alterar(() => {
    const c = carrinho(ctx);
    const linha = c.itens.find((i) => i.id === linhaId);
    if (!linha) return { ok: false };
    if (qtd <= 0) {
      c.itens = c.itens.filter((i) => i.id !== linhaId);
      return { ok: true };
    }
    const u = unidadeAtual(ctx);
    const outras = c.itens.filter((i) => i.produtoId === linha.produtoId && i.id !== linhaId).reduce((s, i) => s + i.qtd, 0);
    const disponivel = estoqueDaUnidade(u.id)[linha.produtoId] ?? 0;
    if (qtd + outras > disponivel) return { ok: false, erro: `Quantidade máxima disponível: ${disponivel - outras}.` };
    linha.qtd = qtd;
    return { ok: true };
  });
}

export const removerItem = (linhaId, ctx = contextoAtual()) => alterarQuantidade(linhaId, 0, ctx);

export function limparCarrinho(ctx = contextoAtual()) {
  alterar(() => definirCarrinho(ctx, carrinhoVazio()));
}

export function aplicarCupom(codigo, ctx = contextoAtual()) {
  recarregar();
  const cliente = clienteDoContexto(ctx);
  const anteriores = pedidosDoCliente(cliente?.id).filter((p) => p.status !== 'CANCELADO').length;
  const v = R.validarCupom(codigo, {
    promocoes: db.promocoes, canal: ctx === 'balcao' ? 'balcao' : canalAtual(), unidade: unidadeAtual(ctx),
    itens: itensCarrinho(ctx), usuario: cliente, pedidosAnteriores: anteriores,
  });
  if (!v.ok) return v; // validação falhou: nada muda no estado
  alterar(() => {
    const c = carrinho(ctx);
    c.cupom = v.promocao.cupom;
    c.voucherId = null;
  });
  return v;
}

export function removerCupom(ctx = contextoAtual()) {
  alterar(() => { carrinho(ctx).cupom = null; });
}

export function selecionarVoucher(voucherId, ctx = contextoAtual()) {
  alterar(() => {
    const c = carrinho(ctx);
    c.voucherId = voucherId || null;
    if (voucherId) c.cupom = null;
  });
}

// ---------------------------------------------------------------------------
// Pedidos e pagamento
// ---------------------------------------------------------------------------

function transicionar(p, para, observacao = '', por = 'Sistema') {
  if (!R.podeTransitar(p.status, para)) return false;
  p.status = para;
  p.historico.push({ status: para, em: agoraISO(), por, observacao });
  return true;
}

function liberarEstoque(p) {
  const est = db.estoque[p.unidadeId];
  if (!est) return;
  for (const i of p.itens) est[i.produtoId] = (est[i.produtoId] ?? 0) + i.qtd;
}

function liberarVoucher(p) {
  const d = p.descontos.find((x) => x.tipo === 'recompensa');
  if (!d || !p.clienteId) return;
  const c = db.usuarios.find((u) => u.id === p.clienteId);
  const v = c?.vouchers?.find((x) => x.id === d.voucherId);
  if (v && !v.usadoEm) v.pedidoId = null;
}

function auditar({ acao, ator, unidadeId = null, alvo = '', detalhes = '' }) {
  db.auditoria.unshift({
    id: uid(), em: agoraISO(), acao, unidadeId, alvo, detalhes,
    ator: ator ? { id: ator.id, nome: ator.nome, papel: ator.papel || 'cliente' } : { nome: 'Sistema', papel: 'sistema' },
  });
  if (db.auditoria.length > 500) db.auditoria.length = 500;
}

export function identificarCliente(cpf, ctx) {
  return alterar(() => {
    if (!R.validarCPF(cpf)) return { ok: false, erro: 'CPF inválido. Confira os números digitados.' };
    const d = cpf.replace(/\D/g, '');
    const u = db.usuarios.find((x) => (x.cpf || '').replace(/\D/g, '') === d);
    if (!u) return { ok: false, erro: 'Não encontramos cadastro com este CPF. Você pode continuar sem identificação.' };
    if (!u.consentimentos?.fidelidade) {
      return { ok: false, erro: 'Este cadastro não participa do programa de fidelidade. Ative pelo app em Privacidade.' };
    }
    aba.clienteIdentificado[ctx] = u.id;
    return { ok: true, primeiroNome: u.nome.split(' ')[0] };
  });
}

export function removerIdentificacao(ctx) {
  alterar(() => {
    aba.clienteIdentificado[ctx] = null;
    carrinho(ctx).voucherId = null;
  });
}

export function criarPedido(ctx, { retirada, metodo, nomeChamada }) {
  return alterar(() => {
    const r = resumoCarrinho(ctx);
    if (!r.unidade) return { ok: false, erro: 'Selecione uma unidade.' };
    if (!r.itens.length) return { ok: false, erro: 'Sua sacola está vazia.' };
    if (r.indisponiveis.length) {
      return { ok: false, erro: `Itens indisponíveis ou acima do estoque: ${r.indisponiveis.map((i) => i.nome).join(', ')}. Revise a sacola.` };
    }
    if (r.carrinho.cupom && !r.promocao) return { ok: false, erro: r.cupomErro };
    // Totem e balcão ficam dentro da loja em operação; a regra de horário vale para os canais remotos.
    if (['app', 'web'].includes(r.canal) && !R.unidadeAberta(r.unidade) && !retirada?.horario) {
      return { ok: false, erro: 'A unidade está fechada agora. Escolha um horário de retirada.' };
    }
    if (!metodo) return { ok: false, erro: 'Escolha a forma de pagamento.' };

    const est = db.estoque[r.unidade.id];
    for (const i of r.itens) est[i.produtoId] -= i.qtd; // reserva de estoque

    const agora = agoraISO();
    db.sequencia += 1;
    const atendente = ctx === 'balcao' ? membroEquipe() : null;
    const pedido = {
      id: uid(),
      codigo: `RN-${String(db.sequencia).padStart(4, '0')}`,
      unidadeId: r.unidade.id,
      canal: r.canal,
      clienteId: r.cliente?.id || null,
      nomeChamada: (nomeChamada || '').trim().slice(0, 30) || (r.cliente ? r.cliente.nome.split(' ')[0] : null),
      itens: r.itens.map(({ produtoId, nome, emoji, categoria, preco, qtd, obs }) => ({ produtoId, nome, emoji, categoria, preco, qtd, obs })),
      subtotal: r.totais.subtotal,
      descontos: r.totais.descontos,
      total: r.totais.total,
      retirada: { tipo: retirada?.tipo || 'retirada', horario: retirada?.horario || null },
      pagamento: { metodo, status: 'nao_iniciado', tentativas: 0 },
      status: 'AGUARDANDO_PAGAMENTO',
      historico: [{ status: 'AGUARDANDO_PAGAMENTO', em: agora, por: atendente ? atendente.nome : R.nomeCanal(r.canal) }],
      pontos: 0,
      criadoEm: agora,
      atendenteId: atendente?.id || null,
    };
    if (r.voucher) {
      const v = r.cliente.vouchers.find((x) => x.id === r.voucher.id);
      if (v) v.pedidoId = pedido.id;
    }
    db.pedidos.unshift(pedido);
    definirCarrinho(ctx, carrinhoVazio());
    if (ctx !== 'cliente') aba.clienteIdentificado[ctx] = null;
    return { ok: true, pedido };
  });
}

function confirmarPagamento(p) {
  if (p.status === 'CANCELADO') {
    // Pagamento aprovado depois do cancelamento: devolve o valor ao cliente.
    p.pagamento.status = 'estorno_solicitado';
    const chave = p.pagamento.chave;
    gateway.solicitarEstorno(chave).then((r) => alterar(() => {
      const q = pedidoPorId(p.id);
      if (q) q.pagamento.status = r.ok ? 'estornado' : 'estorno_falhou';
    }));
    return;
  }
  transicionar(p, 'CONFIRMADO', 'Pagamento aprovado', p.canal === 'balcao' ? 'Caixa' : 'Provedor de pagamento');
  const c = p.clienteId && db.usuarios.find((u) => u.id === p.clienteId);
  if (c?.consentimentos?.fidelidade) {
    const pts = R.pontosPorValor(p.total);
    c.pontos += pts;
    c.pontosAcumulados += pts;
    c.extrato.unshift({ em: agoraISO(), descricao: `Pedido ${p.codigo}`, pontos: pts });
    p.pontos = pts;
  }
  const d = p.descontos.find((x) => x.tipo === 'recompensa');
  if (d && c) {
    const v = c.vouchers.find((x) => x.id === d.voucherId);
    if (v) v.usadoEm = agoraISO();
  }
}

function registrarRespostaGateway(pedidoId, r) {
  alterar(() => {
    const p = pedidoPorId(pedidoId);
    if (!p) return;
    p.pagamento.transacaoId = r.transacaoId;
    p.pagamento.atualizadoEm = agoraISO();
    if (r.status === 'aprovado') {
      if (p.pagamento.status === 'aprovado') return;
      p.pagamento.status = 'aprovado';
      p.pagamento.autorizacao = r.autorizacao;
      p.pagamento.mensagem = null;
      confirmarPagamento(p);
    } else if (r.status === 'recusado' || r.status === 'expirado') {
      p.pagamento.status = r.status;
      p.pagamento.mensagem = r.motivo;
      if (p.status === 'AGUARDANDO_PAGAMENTO') transicionar(p, 'PAGAMENTO_RECUSADO', r.motivo, 'Provedor de pagamento');
    } else if (r.status === 'pendente') {
      p.pagamento.status = 'pendente';
      p.pagamento.pix = r.pix;
    }
  });
}

export const pagamentoEmAndamento = (pedidoId) => pagamentosEmAndamento.has(pedidoId);

export async function pagarPedido(pedidoId, metodo = null) {
  const atual = pedidoPorId(pedidoId);
  if (!atual || pagamentosEmAndamento.has(pedidoId)) return;
  if (!['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_RECUSADO'].includes(atual.status)) return;
  pagamentosEmAndamento.add(pedidoId);
  let chave;
  let valor;
  let forma;
  alterar(() => {
    const p = pedidoPorId(pedidoId);
    p.pagamento.tentativas += 1;
    if (metodo) p.pagamento.metodo = metodo;
    chave = `${p.id}-t${p.pagamento.tentativas}`;
    valor = p.total;
    forma = p.pagamento.metodo;
    Object.assign(p.pagamento, { chave, status: 'processando', mensagem: null, pix: null, atualizadoEm: agoraISO() });
    if (p.status === 'PAGAMENTO_RECUSADO') transicionar(p, 'AGUARDANDO_PAGAMENTO', 'Nova tentativa de pagamento', 'Cliente');
  });
  try {
    const r = await gateway.solicitarPagamento({ chaveIdempotencia: chave, valor, metodo: forma, modo: local.demo.gateway });
    registrarRespostaGateway(pedidoId, r);
  } catch (e) {
    alterar(() => {
      const p = pedidoPorId(pedidoId);
      if (!p) return;
      if (e instanceof gateway.GatewaySemResposta) {
        p.pagamento.status = 'sem_resposta';
        p.pagamento.mensagem = e.message;
      } else {
        p.pagamento.status = 'erro';
        p.pagamento.mensagem = 'Falha de comunicação com o provedor. Nenhum valor foi cobrado.';
      }
    });
  } finally {
    pagamentosEmAndamento.delete(pedidoId);
  }
}

// Reconciliação: consulta o provedor antes de permitir nova cobrança.
export async function verificarPagamento(pedidoId) {
  const p = pedidoPorId(pedidoId);
  if (!p?.pagamento?.chave) return null;
  const r = await gateway.consultarPagamento(p.pagamento.chave);
  if (!r) {
    alterar(() => {
      const q = pedidoPorId(pedidoId);
      q.pagamento.status = 'nao_recebido';
      q.pagamento.mensagem = 'O provedor não recebeu a solicitação. Você pode tentar novamente com segurança.';
    });
    return null;
  }
  if (r.status !== 'processando') registrarRespostaGateway(pedidoId, r);
  return r;
}

export function pagarPedidoTrocandoMetodo(pedidoId, metodo) {
  const p = pedidoPorId(pedidoId);
  if (p?.pagamento?.status === 'pendente' && p.pagamento.chave) gateway.cancelarCobranca(p.pagamento.chave);
  return pagarPedido(pedidoId, metodo);
}

export function simularPixPago(pedidoId) {
  const p = pedidoPorId(pedidoId);
  if (p?.pagamento?.chave) gateway.simularPixPago(p.pagamento.chave);
}

export function confirmarPagamentoCaixa(pedidoId) {
  return alterar(() => {
    const p = pedidoPorId(pedidoId);
    if (!p || p.status !== 'AGUARDANDO_PAGAMENTO') return { ok: false };
    Object.assign(p.pagamento, {
      status: 'aprovado', tentativas: 1, transacaoId: `caixa-${uid().slice(0, 8)}`, atualizadoEm: agoraISO(),
    });
    confirmarPagamento(p);
    return { ok: true };
  });
}

export function avancarPedido(pedidoId, para, ator) {
  return alterar(() => {
    const p = pedidoPorId(pedidoId);
    if (!p) return { ok: false, erro: 'Pedido não encontrado.' };
    if (!transicionar(p, para, '', ator?.nome || 'Equipe')) {
      return { ok: false, erro: `Não é possível mudar de "${R.ESTADOS_PEDIDO[p.status].rotulo}" para "${R.ESTADOS_PEDIDO[para].rotulo}".` };
    }
    return { ok: true, pedido: p };
  });
}

export async function cancelarPedido(pedidoId, { motivo, ator = null }) {
  let chave = null;
  const res = alterar(() => {
    const p = pedidoPorId(pedidoId);
    if (!p || !R.podeTransitar(p.status, 'CANCELADO')) return { ok: false, erro: 'Este pedido não pode mais ser cancelado.' };
    const por = ator?.nome || 'Cliente';
    transicionar(p, 'CANCELADO', motivo, por);
    p.cancelamento = { motivo, por, em: agoraISO() };
    liberarEstoque(p);
    liberarVoucher(p);
    if (p.pontos > 0 && p.clienteId) {
      const c = db.usuarios.find((u) => u.id === p.clienteId);
      if (c) {
        c.pontos = Math.max(0, c.pontos - p.pontos);
        c.pontosAcumulados = Math.max(0, c.pontosAcumulados - p.pontos);
        c.extrato.unshift({ em: agoraISO(), descricao: `Estorno de pontos – ${p.codigo} cancelado`, pontos: -p.pontos });
      }
      p.pontos = 0;
    }
    if (p.pagamento.status === 'aprovado') {
      chave = p.pagamento.chave || null;
      p.pagamento.status = chave ? 'estorno_solicitado' : 'estornado';
    }
    auditar({
      acao: 'PEDIDO_CANCELADO', ator: ator || clienteAtual(), unidadeId: p.unidadeId, alvo: p.codigo,
      detalhes: `Motivo: ${motivo}. Valor: ${R.moeda(p.total)}${p.pagamento.status.startsWith('estorno') ? ' (estorno solicitado ao provedor)' : ''}`,
    });
    return { ok: true };
  });
  if (res.ok && chave) {
    const r = await gateway.solicitarEstorno(chave);
    alterar(() => {
      const p = pedidoPorId(pedidoId);
      if (p) p.pagamento.status = r.ok ? 'estornado' : 'estorno_falhou';
    });
  }
  return res;
}

// Relógio da aplicação: expira pedidos sem pagamento e simula a cozinha (modo demonstração).
export function processarRelogio() {
  if (!db) return;
  const agora = Date.now();
  const precisaExpirar = (p) =>
    ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_RECUSADO'].includes(p.status)
    && !['processando', 'pendente'].includes(p.pagamento.status)
    && agora - Date.parse(p.criadoEm) > 15 * 60e3;
  const ultimo = (p) => Date.parse(p.historico[p.historico.length - 1].em);
  const podeIniciar = (p) => !p.retirada?.horario || agora >= Date.parse(p.retirada.horario) - 15 * 60e3;
  const precisaCozinha = (p) => local.demo.cozinhaAutomatica && (
    (p.status === 'CONFIRMADO' && podeIniciar(p) && agora - ultimo(p) > 10e3)
    || (p.status === 'EM_PREPARO' && agora - ultimo(p) > 20e3));

  const ativos = db.pedidos.filter((p) => ESTADOS_RELOGIO.includes(p.status));
  if (!ativos.some((p) => precisaExpirar(p) || precisaCozinha(p))) return;

  alterar(() => {
    for (const p of db.pedidos) {
      if (!ESTADOS_RELOGIO.includes(p.status)) continue;
      if (precisaExpirar(p)) {
        transicionar(p, 'CANCELADO', 'Pagamento não concluído em 15 minutos', 'Sistema');
        p.cancelamento = { motivo: 'Pagamento não concluído em 15 minutos', por: 'Sistema', em: agoraISO() };
        liberarEstoque(p);
        liberarVoucher(p);
      } else if (precisaCozinha(p)) {
        if (p.status === 'CONFIRMADO') transicionar(p, 'EM_PREPARO', 'Simulação automática', 'Cozinha');
        else transicionar(p, 'PRONTO', 'Simulação automática', 'Cozinha');
      }
    }
  });
}
const ESTADOS_RELOGIO = ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_RECUSADO', 'CONFIRMADO', 'EM_PREPARO'];

// ---------------------------------------------------------------------------
// Autenticação do cliente
// ---------------------------------------------------------------------------

export async function entrar(email, senha) {
  const e = String(email || '').trim().toLowerCase();
  const bloqueio = local.tentativasLogin[e];
  if (bloqueio?.ate && Date.now() < bloqueio.ate) {
    return { ok: false, erro: `Muitas tentativas sem sucesso. Aguarde ${Math.ceil((bloqueio.ate - Date.now()) / 1000)} segundos.` };
  }
  await esperar(500);
  const u = db.usuarios.find((x) => x.email === e && x.senhaHash);
  const valido = u && u.senhaHash === (await hashSenha(senha, u.id));
  if (!valido) {
    alterar(() => {
      const t = local.tentativasLogin[e] || { n: 0 };
      t.n += 1;
      if (t.n >= 5) {
        t.ate = Date.now() + 30e3;
        t.n = 0;
      }
      local.tentativasLogin[e] = t;
    });
    return { ok: false, erro: 'E-mail ou senha incorretos.' };
  }
  alterar(() => {
    delete local.tentativasLogin[e];
    local.clienteId = u.id;
  });
  return { ok: true, usuario: u };
}

export function sair() {
  alterar(() => {
    local.clienteId = null;
    local.carrinho.voucherId = null;
  });
}

export function validarCadastro(d) {
  const erros = {};
  if (!d.nome || d.nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe nome e sobrenome.';
  if (!R.validarEmail(d.email)) erros.email = 'Informe um e-mail válido (ex.: nome@dominio.com).';
  else if (db.usuarios.some((u) => u.email === d.email.trim().toLowerCase())) erros.email = 'Já existe uma conta com este e-mail. Tente entrar.';
  if (d.telefone && !R.validarTelefone(d.telefone)) erros.telefone = 'Telefone deve ter DDD + número.';
  if (d.cpf && !R.validarCPF(d.cpf)) erros.cpf = 'CPF inválido.';
  else if (d.cpf && db.usuarios.some((u) => (u.cpf || '').replace(/\D/g, '') === d.cpf.replace(/\D/g, ''))) erros.cpf = 'CPF já cadastrado.';
  const faltas = R.validarSenha(d.senha || '');
  if (faltas.length) erros.senha = `A senha precisa de ${faltas.join(', ')}.`;
  if (d.senha !== d.confirmacao) erros.confirmacao = 'As senhas não conferem.';
  if (d.nascimento) {
    const anos = R.idade(d.nascimento);
    if (anos == null || anos < 0 || anos > 120) erros.nascimento = 'Data de nascimento inválida.';
  }
  if (!d.termos) erros.termos = 'É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta.';
  return erros;
}

export async function cadastrar(d) {
  const erros = validarCadastro(d);
  if (Object.keys(erros).length) return { ok: false, erros };
  await esperar(600);
  const id = `cli-${uid()}`;
  const em = agoraISO();
  const consentimentos = { fidelidade: !!d.fidelidade, personalizacao: !!d.personalizacao, comunicacoes: !!d.comunicacoes };
  const usuario = {
    id,
    nome: d.nome.trim().replace(/\s+/g, ' '),
    email: d.email.trim().toLowerCase(),
    telefone: d.telefone ? R.formatarTelefone(d.telefone) : null,
    cpf: d.cpf ? R.formatarCPF(d.cpf) : null,
    // Minimização: a data de nascimento só é guardada se houver consentimento de personalização.
    nascimento: consentimentos.personalizacao ? d.nascimento || null : null,
    senhaHash: await hashSenha(d.senha, id),
    criadoEm: em,
    pontos: 0, pontosAcumulados: 0, extrato: [], vouchers: [],
    consentimentos: { termos: { versao: D.VERSAO_TERMOS, em }, ...consentimentos },
    historicoConsentimentos: [
      { finalidade: 'termos', valor: true, em, canal: R.nomeCanal(canalAtual()) },
      ...Object.entries(consentimentos).map(([finalidade, valor]) => ({ finalidade, valor, em, canal: R.nomeCanal(canalAtual()) })),
    ],
  };
  alterar(() => {
    db.usuarios.push(usuario);
    local.clienteId = id;
  });
  return { ok: true, usuario };
}

export function atualizarPerfil({ nome, telefone }) {
  return alterar(() => {
    const u = clienteAtual();
    if (!u) return { ok: false };
    const erros = {};
    if (!nome || nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe nome e sobrenome.';
    if (telefone && !R.validarTelefone(telefone)) erros.telefone = 'Telefone deve ter DDD + número.';
    if (Object.keys(erros).length) return { ok: false, erros };
    u.nome = nome.trim().replace(/\s+/g, ' ');
    u.telefone = telefone ? R.formatarTelefone(telefone) : null;
    return { ok: true };
  });
}

export function atualizarConsentimentos(novos, nascimento = undefined) {
  return alterar(() => {
    const u = clienteAtual();
    if (!u) return { ok: false };
    const em = agoraISO();
    for (const finalidade of ['fidelidade', 'personalizacao', 'comunicacoes']) {
      if (finalidade in novos && !!novos[finalidade] !== !!u.consentimentos[finalidade]) {
        u.consentimentos[finalidade] = !!novos[finalidade];
        u.historicoConsentimentos.unshift({ finalidade, valor: !!novos[finalidade], em, canal: R.nomeCanal(canalAtual()) });
      }
    }
    if (!u.consentimentos.personalizacao) u.nascimento = null;
    else if (nascimento !== undefined) u.nascimento = nascimento || null;
    return { ok: true };
  });
}

export function exportarDados() {
  const u = clienteAtual();
  if (!u) return null;
  const { senhaHash, ...perfil } = u;
  return {
    geradoEm: agoraISO(),
    controlador: 'Rede Raízes do Nordeste (dados fictícios de demonstração)',
    titular: perfil,
    pedidos: pedidosDoCliente(u.id).map((p) => ({
      codigo: p.codigo, data: p.criadoEm, unidade: unidadePorId(p.unidadeId)?.nome, canal: R.nomeCanal(p.canal),
      itens: p.itens.map((i) => `${i.qtd}x ${i.nome}`), total: p.total, status: R.ESTADOS_PEDIDO[p.status].rotulo,
    })),
  };
}

export function excluirConta() {
  return alterar(() => {
    const u = clienteAtual();
    if (!u) return { ok: false };
    // Pedidos são mantidos de forma anonimizada (obrigação fiscal), sem vínculo com o titular.
    for (const p of db.pedidos) {
      if (p.clienteId === u.id) {
        p.clienteId = null;
        p.nomeChamada = null;
      }
    }
    db.usuarios = db.usuarios.filter((x) => x.id !== u.id);
    auditar({
      acao: 'CONTA_EXCLUIDA', ator: { nome: 'Titular dos dados', papel: 'cliente' },
      alvo: `Titular ${u.id.slice(0, 8)}…`, detalhes: 'Exclusão solicitada pelo titular. Pedidos mantidos anonimizados.',
    });
    local.clienteId = null;
    local.carrinho.voucherId = null;
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Fidelidade
// ---------------------------------------------------------------------------

export function resgatarRecompensa(recompensaId) {
  return alterar(() => {
    const u = clienteAtual();
    const r = D.RECOMPENSAS.find((x) => x.id === recompensaId);
    if (!u || !r) return { ok: false, erro: 'Recompensa indisponível.' };
    if (!u.consentimentos.fidelidade) return { ok: false, erro: 'Ative o programa de fidelidade para resgatar.' };
    if (u.pontos < r.pontos) return { ok: false, erro: `Faltam ${r.pontos - u.pontos} pontos para este resgate.` };
    u.pontos -= r.pontos;
    const em = agoraISO();
    u.vouchers.unshift({
      id: uid(), recompensaId: r.id, nome: r.nome, valor: r.valor, emoji: r.emoji, criadoEm: em,
      validoAte: new Date(Date.now() + 30 * 864e5).toISOString(), usadoEm: null, pedidoId: null,
    });
    u.extrato.unshift({ em, descricao: `Resgate: ${r.nome}`, pontos: -r.pontos });
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Equipe (balcão, cozinha, gerência e matriz)
// ---------------------------------------------------------------------------

export async function entrarEquipe(email, senha) {
  await esperar(400);
  const e = String(email || '').trim().toLowerCase();
  const m = db.equipe.find((x) => x.email === e);
  if (!m || m.senhaHash !== (await hashSenha(senha, m.id))) return { ok: false, erro: 'Credenciais inválidas.' };
  alterar(() => {
    aba.equipeId = m.id;
    auditar({ acao: 'LOGIN_EQUIPE', ator: m, unidadeId: m.unidadeId, alvo: m.email, detalhes: 'Acesso ao sistema interno' });
  });
  return { ok: true, membro: m };
}

export function sairEquipe() {
  alterar(() => {
    aba.equipeId = null;
    aba.carrinhoBalcao = carrinhoVazio();
    aba.clienteIdentificado.balcao = null;
  });
}

export function registrarAcessoDados(ator, alvo, detalhes) {
  alterar(() => auditar({ acao: 'DADOS_PESSOAIS_ACESSADOS', ator, unidadeId: ator.unidadeId, alvo, detalhes }));
}

export function ajustarEstoque(unidadeId, produtoId, quantidade, ator, motivo = '') {
  return alterar(() => {
    const q = Math.max(0, Math.floor(Number(quantidade)));
    if (!Number.isFinite(q)) return { ok: false, erro: 'Quantidade inválida.' };
    const anterior = db.estoque[unidadeId][produtoId] ?? 0;
    if (anterior === q) return { ok: true };
    db.estoque[unidadeId][produtoId] = q;
    auditar({
      acao: 'ESTOQUE_AJUSTADO', ator, unidadeId, alvo: produtoPorId(produtoId)?.nome,
      detalhes: `Quantidade alterada de ${anterior} para ${q}${motivo ? ` (${motivo})` : ''}`,
    });
    return { ok: true };
  });
}

export function alternarPausa(unidadeId, produtoId, ator) {
  alterar(() => {
    const lista = db.pausados[unidadeId];
    const pausado = lista.includes(produtoId);
    db.pausados[unidadeId] = pausado ? lista.filter((x) => x !== produtoId) : [...lista, produtoId];
    auditar({
      acao: pausado ? 'PRODUTO_REATIVADO' : 'PRODUTO_PAUSADO', ator, unidadeId, alvo: produtoPorId(produtoId)?.nome,
      detalhes: pausado ? 'Produto voltou a ser vendido' : 'Produto retirado temporariamente do cardápio',
    });
  });
}

export function alternarPromocao(promoId, ator) {
  alterar(() => {
    const p = db.promocoes.find((x) => x.id === promoId);
    p.ativa = !p.ativa;
    auditar({ acao: 'PROMOCAO_ALTERADA', ator, alvo: p.cupom, detalhes: p.ativa ? 'Campanha ativada' : 'Campanha desativada' });
  });
}

// ---------------------------------------------------------------------------
// Totem, cookies e demonstração
// ---------------------------------------------------------------------------

export function iniciarTotem(unidadeId) {
  alterar(() => {
    aba.totem = { unidadeId };
    aba.carrinhoTotem = carrinhoVazio();
    aba.clienteIdentificado.totem = null;
  });
}

export function reiniciarTotem() {
  alterar(() => {
    aba.carrinhoTotem = carrinhoVazio();
    aba.clienteIdentificado.totem = null;
  });
}

export function sairTotem() {
  alterar(() => {
    aba.totem = null;
    aba.carrinhoTotem = carrinhoVazio();
  });
}

export function salvarCookies(preferencias) {
  alterar(() => {
    local.cookies = { necessarios: true, desempenho: !!preferencias.desempenho, personalizacao: !!preferencias.personalizacao, em: agoraISO(), versao: D.VERSAO_TERMOS };
  });
}

export function configurarDemo(parcial) {
  alterar(() => { local.demo = { ...local.demo, ...parcial }; });
}
