// Simulação do PROVEDOR EXTERNO de pagamentos.
// O sistema da Raízes do Nordeste não processa pagamentos: apenas solicita,
// recebe a confirmação/negativa, registra o resultado e atualiza o pedido.
// Este módulo representa o serviço externo e guarda suas transações em um
// armazenamento próprio, separado dos dados do sistema principal.

const CHAVE = 'gateway-simulado:transacoes:v1';
export const TEMPO_LIMITE_MS = 7000;

const MOTIVOS_RECUSA = [
  'Saldo ou limite insuficiente.',
  'Transação não autorizada pelo banco emissor.',
  'Cartão bloqueado para compras on-line.',
];

export class GatewaySemResposta extends Error {
  constructor() {
    super('O provedor de pagamento não respondeu dentro do tempo limite.');
    this.name = 'GatewaySemResposta';
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const aleatorio = (n = 8) => Math.random().toString(36).slice(2, 2 + n).toUpperCase();

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; }
}
function gravar(t) {
  try { localStorage.setItem(CHAVE, JSON.stringify(t)); } catch { /* armazenamento indisponível */ }
}

// Apenas os campos que um provedor real devolveria ao lojista.
function resposta(t) {
  return {
    transacaoId: t.id,
    status: t.status,
    metodo: t.metodo,
    valor: t.valor,
    autorizacao: t.autorizacao || null,
    motivo: t.motivo || null,
    pix: t.metodo === 'pix' ? { copiaECola: t.copiaECola, expiraEm: t.expiraEm } : null,
  };
}

function decidir(modo) {
  if (modo === 'aprovar') return 'aprovado';
  if (modo === 'recusar') return 'recusado';
  if (modo === 'sem_resposta') return 'sem_resposta';
  const r = Math.random();
  if (r < 0.85) return 'aprovado';
  if (r < 0.95) return 'recusado';
  return 'sem_resposta';
}

/**
 * Solicita um pagamento ao provedor.
 * A `chaveIdempotencia` garante que reenvios da mesma tentativa não gerem cobrança duplicada.
 */
export async function solicitarPagamento({ chaveIdempotencia, valor, metodo, modo = 'auto' }) {
  const transacoes = ler();
  const existente = transacoes[chaveIdempotencia];
  if (existente) {
    await esperar(500);
    return resposta(existente);
  }

  const resultado = decidir(modo);
  const t = {
    id: `txn_${aleatorio(10)}`,
    chave: chaveIdempotencia,
    valor,
    metodo,
    criadoEm: new Date().toISOString(),
    status: 'processando',
  };

  if (metodo === 'pix') {
    Object.assign(t, {
      status: 'pendente',
      copiaECola: `00020126580014BR.GOV.BCB.PIX0136raizes-${aleatorio(6)}5204000053039865406${valor.toFixed(2)}5802BR6304${aleatorio(4)}`,
      expiraEm: Date.now() + (resultado === 'recusado' ? 15000 : 10 * 60 * 1000),
      pagarEm: resultado === 'recusado' ? null : Date.now() + 9000,
    });
    transacoes[chaveIdempotencia] = t;
    gravar(transacoes);
    await esperar(900);
    return resposta(t);
  }

  transacoes[chaveIdempotencia] = t;
  gravar(transacoes);

  if (resultado === 'sem_resposta') {
    // O provedor processa e aprova, mas a resposta se perde na rede.
    // O sistema deve consultar o status antes de permitir uma nova cobrança.
    t.status = 'aprovado';
    t.autorizacao = aleatorio(6);
    transacoes[chaveIdempotencia] = t;
    gravar(transacoes);
    await esperar(TEMPO_LIMITE_MS);
    throw new GatewaySemResposta();
  }

  await esperar(1400 + Math.random() * 1200);
  if (resultado === 'aprovado') {
    t.status = 'aprovado';
    t.autorizacao = aleatorio(6);
  } else {
    t.status = 'recusado';
    t.motivo = MOTIVOS_RECUSA[Math.floor(Math.random() * MOTIVOS_RECUSA.length)];
  }
  transacoes[chaveIdempotencia] = t;
  gravar(transacoes);
  return resposta(t);
}

/** Consulta o status de uma transação (reconciliação após falha ou polling do Pix). */
export async function consultarPagamento(chaveIdempotencia) {
  await esperar(600);
  const transacoes = ler();
  const t = transacoes[chaveIdempotencia];
  if (!t) return null;
  if (t.status === 'processando' && Date.now() - Date.parse(t.criadoEm) > TEMPO_LIMITE_MS + 3000) {
    // A solicitação foi interrompida antes de concluir: o provedor a descarta sem cobrar.
    t.status = 'recusado';
    t.motivo = 'A transação não foi concluída pelo provedor. Nenhum valor foi cobrado.';
    gravar(transacoes);
  }
  if (t.status === 'pendente') {
    if (t.pagarEm && Date.now() >= t.pagarEm) {
      t.status = 'aprovado';
      t.autorizacao = aleatorio(6);
    } else if (Date.now() >= t.expiraEm) {
      t.status = 'expirado';
      t.motivo = 'O QR Code Pix expirou sem pagamento.';
    }
    gravar(transacoes);
  }
  return resposta(t);
}

/** Atalho de demonstração: simula o cliente pagando o Pix no app do banco. */
export function simularPixPago(chaveIdempotencia) {
  const transacoes = ler();
  const t = transacoes[chaveIdempotencia];
  if (t && t.status === 'pendente') {
    t.pagarEm = Date.now();
    gravar(transacoes);
  }
}

/** Cancela uma cobrança Pix ainda não paga (ex.: cliente trocou a forma de pagamento). */
export function cancelarCobranca(chaveIdempotencia) {
  const transacoes = ler();
  const t = transacoes[chaveIdempotencia];
  if (t && t.status === 'pendente') {
    t.status = 'cancelado';
    gravar(transacoes);
  }
}

/** Solicita estorno de uma transação aprovada (cancelamento de pedido pago). */
export async function solicitarEstorno(chaveIdempotencia) {
  await esperar(800);
  const transacoes = ler();
  const t = transacoes[chaveIdempotencia];
  if (!t || t.status !== 'aprovado') return { ok: false };
  t.status = 'estornado';
  gravar(transacoes);
  return { ok: true, transacaoId: t.id };
}

export function limparTransacoes() {
  try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ }
}
