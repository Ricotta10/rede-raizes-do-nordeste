// Regras de negócio puras (sem DOM e sem armazenamento).
// Ficam isoladas para serem testadas automaticamente (ver /tests).

import { NIVEIS, CANAIS } from './data.js';

export const ESTADOS_PEDIDO = {
  AGUARDANDO_PAGAMENTO: { rotulo: 'Aguardando pagamento', tom: 'alerta' },
  PAGAMENTO_RECUSADO: { rotulo: 'Pagamento não aprovado', tom: 'erro' },
  CONFIRMADO: { rotulo: 'Pedido confirmado', tom: 'info' },
  EM_PREPARO: { rotulo: 'Em preparo', tom: 'info' },
  PRONTO: { rotulo: 'Pronto para retirada', tom: 'sucesso' },
  ENTREGUE: { rotulo: 'Entregue', tom: 'neutro' },
  CANCELADO: { rotulo: 'Cancelado', tom: 'erro' },
};

export const ETAPAS_ACOMPANHAMENTO = ['CONFIRMADO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];

// Máquina de estados do pedido: só estas transições são aceitas.
export const TRANSICOES = {
  AGUARDANDO_PAGAMENTO: ['CONFIRMADO', 'PAGAMENTO_RECUSADO', 'CANCELADO'],
  PAGAMENTO_RECUSADO: ['CONFIRMADO', 'AGUARDANDO_PAGAMENTO', 'CANCELADO'],
  CONFIRMADO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADO: [],
};

export const podeTransitar = (de, para) => (TRANSICOES[de] || []).includes(para);

export const ESTADOS_ATIVOS = ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_RECUSADO', 'CONFIRMADO', 'EM_PREPARO', 'PRONTO'];
export const ESTADOS_VENDA = ['CONFIRMADO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];

// O cliente só pode cancelar sozinho antes de a cozinha começar o preparo.
export const clientePodeCancelar = (pedido) =>
  ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_RECUSADO', 'CONFIRMADO'].includes(pedido.status);

export const nomeCanal = (c) => CANAIS[c] || c;

// ---------- Utilidades numéricas e de formatação ----------

export const arred = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

export const moeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function minutosDoDia(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// ---------- Unidades e cardápio ----------

export function unidadeAberta(unidade, agora = new Date()) {
  const m = agora.getHours() * 60 + agora.getMinutes();
  return m >= minutosDoDia(unidade.abre) && m < minutosDoDia(unidade.fecha);
}

export const produtoNaUnidade = (produto, unidade) =>
  !produto.formatos || produto.formatos.includes(unidade.formato);

export const emTemporada = (produto, agora = new Date()) =>
  !produto.sazonal || produto.sazonal.meses.includes(agora.getMonth() + 1);

// Aplica a variação regional da receita (quando existir para a UF da unidade).
export function adaptarProduto(produto, unidade) {
  const v = produto.variacoes?.[unidade.uf];
  return v ? { ...produto, ...v, variacaoRegional: unidade.uf } : produto;
}

export function disponibilidade(produto, unidade, { estoque = {}, pausados = [] } = {}, agora = new Date()) {
  if (!produtoNaUnidade(produto, unidade)) {
    return { disponivel: false, motivo: 'formato', rotulo: 'Não servido nesta unidade' };
  }
  if (!emTemporada(produto, agora)) {
    return { disponivel: false, motivo: 'sazonal', rotulo: `Volta no ${produto.sazonal.nome}` };
  }
  if (pausados.includes(produto.id)) {
    return { disponivel: false, motivo: 'pausado', rotulo: 'Indisponível no momento' };
  }
  const quantidade = estoque[produto.id] ?? 0;
  if (quantidade <= 0) {
    return { disponivel: false, motivo: 'esgotado', rotulo: 'Esgotado nesta unidade', quantidade: 0 };
  }
  return { disponivel: true, quantidade, ultimas: quantidade <= 5 };
}

// Horários de retirada agendada (pedido antecipado), em intervalos de 15 minutos,
// sempre dentro do horário de funcionamento da unidade.
export function horariosRetirada(unidade, agora = new Date(), quantidade = 8) {
  const abre = minutosDoDia(unidade.abre);
  const fecha = minutosDoDia(unidade.fecha);
  const lista = [];
  let dia = 0;
  let minutos = Math.ceil((agora.getHours() * 60 + agora.getMinutes() + 30) / 15) * 15;
  let seguranca = 0;
  while (lista.length < quantidade && seguranca++ < 500) {
    if (minutos < abre + 15) minutos = abre + 15;
    if (minutos >= fecha) {
      dia += 1;
      minutos = abre + 15;
      continue;
    }
    const d = new Date(agora);
    d.setDate(d.getDate() + dia);
    d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
    lista.push(d.toISOString());
    minutos += 15;
  }
  return lista;
}

// ---------- Carrinho, promoções e totais ----------

export const subtotal = (itens) => arred(itens.reduce((s, i) => s + i.preco * i.qtd, 0));

export const nivelPorPontos = (acumulados = 0) =>
  [...NIVEIS].reverse().find((n) => acumulados >= n.minimo);

export const proximoNivel = (acumulados = 0) => NIVEIS.find((n) => n.minimo > acumulados) || null;

export const pontosPorValor = (valor) => Math.floor(valor);

export function validarCupom(codigo, { promocoes, canal, unidade, itens, usuario = null, pedidosAnteriores = 0, agora = new Date() }) {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) return { ok: false, erro: 'Informe o código do cupom.' };
  const p = promocoes.find((x) => x.cupom === c);
  if (!p) return { ok: false, erro: 'Cupom não encontrado. Confira o código digitado.' };
  if (!p.ativa) return { ok: false, erro: 'Esta campanha foi encerrada.' };
  if (p.validaAte && agora > new Date(`${p.validaAte}T23:59:59`)) return { ok: false, erro: 'Este cupom expirou.' };
  if (p.canais && !p.canais.includes(canal)) {
    return { ok: false, erro: `Cupom válido apenas em: ${p.canais.map(nomeCanal).join(', ')}.` };
  }
  if (p.regioes && !p.regioes.includes(unidade.regiao)) {
    return { ok: false, erro: 'Cupom não é válido na região desta unidade.' };
  }
  if (p.segmento === 'fidelidade' && !usuario?.consentimentos?.fidelidade) {
    return { ok: false, erro: 'Cupom exclusivo para participantes do programa de fidelidade.' };
  }
  if (p.regra === 'primeiro_pedido') {
    if (!usuario) return { ok: false, erro: 'Entre na sua conta para usar este cupom.' };
    if (pedidosAnteriores > 0) return { ok: false, erro: 'Cupom válido apenas no primeiro pedido.' };
  }
  if (p.categorias && subtotal(itens.filter((i) => p.categorias.includes(i.categoria))) === 0) {
    return { ok: false, erro: 'Adicione um item participante da promoção para usar este cupom.' };
  }
  if (p.minimo && subtotal(itens) < p.minimo) {
    return { ok: false, erro: `Pedido mínimo de ${moeda(p.minimo)} para este cupom.` };
  }
  return { ok: true, promocao: p };
}

// Regra: desconto do nível de fidelidade é automático; cupom e recompensa NÃO são cumulativos.
export function calcularTotais({ itens, promocao = null, voucher = null, nivel = null }) {
  const sub = subtotal(itens);
  const descontos = [];
  let restante = sub;

  if (nivel && nivel.desconto > 0 && sub > 0) {
    const v = arred(sub * nivel.desconto / 100);
    descontos.push({ tipo: 'fidelidade', descricao: `Nível ${nivel.nome} (−${nivel.desconto}%)`, valor: v });
    restante = arred(restante - v);
  }

  if (promocao) {
    const base = promocao.categorias
      ? subtotal(itens.filter((i) => promocao.categorias.includes(i.categoria)))
      : sub;
    let v = promocao.tipo === 'percentual' ? arred(base * promocao.valor / 100) : promocao.valor;
    v = arred(Math.min(v, restante));
    descontos.push({ tipo: 'cupom', codigo: promocao.cupom, descricao: `Cupom ${promocao.cupom}`, valor: v });
    restante = arred(restante - v);
  } else if (voucher) {
    const v = arred(Math.min(voucher.valor, restante));
    descontos.push({ tipo: 'recompensa', voucherId: voucher.id, descricao: voucher.nome, valor: v });
    restante = arred(restante - v);
  }

  const totalDescontos = arred(descontos.reduce((s, d) => s + d.valor, 0));
  return { subtotal: sub, descontos, totalDescontos, total: arred(Math.max(0, sub - totalDescontos)) };
}

// ---------- Validações de formulário ----------

export const validarEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

export function validarSenha(s = '') {
  const faltas = [];
  if (s.length < 8) faltas.push('mínimo de 8 caracteres');
  if (!/[A-Za-zÀ-ú]/.test(s)) faltas.push('ao menos uma letra');
  if (!/\d/.test(s)) faltas.push('ao menos um número');
  return faltas;
}

export function validarCPF(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export const validarTelefone = (t) => {
  const d = String(t || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
};

export function idade(nascimentoISO, agora = new Date()) {
  if (!nascimentoISO) return null;
  const n = new Date(`${nascimentoISO}T12:00:00`);
  let a = agora.getFullYear() - n.getFullYear();
  const m = agora.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && agora.getDate() < n.getDate())) a -= 1;
  return a;
}

export function faixaEtaria(anos) {
  if (anos == null) return 'Não informada';
  if (anos < 18) return 'Menor de 18';
  if (anos < 25) return '18–24';
  if (anos < 35) return '25–34';
  if (anos < 50) return '35–49';
  return '50+';
}

// ---------- Mascaramento (minimização de exposição de dados pessoais) ----------

export function mascararEmail(email = '') {
  const [u, dominio] = email.split('@');
  if (!dominio) return '***';
  return `${u.slice(0, 2)}***@${dominio}`;
}

export function mascararCPF(cpf = '') {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return '***';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function mascararNome(nome = '') {
  const partes = nome.trim().split(/\s+/);
  if (partes.length < 2) return partes[0] || 'Cliente';
  return `${partes[0]} ${partes[partes.length - 1][0]}.`;
}

export const formatarCPF = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatarTelefone = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};
