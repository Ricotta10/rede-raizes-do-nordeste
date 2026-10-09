import * as store from '../store.js';
import { html, icone, moeda, hora, dataHora, aviso, dialogo, padraoQR } from '../ui.js';
import { ESTADOS_PEDIDO, ETAPAS_ACOMPANHAMENTO, clientePodeCancelar, nomeCanal } from '../domain.js';
import { METODOS_PAGAMENTO } from '../data.js';
import { seloStatus, itensPedido, linhaTotais, horarioRetirada } from './comum.js';

const ROTULO_PAGAMENTO = {
  aprovado: 'Aprovado', processando: 'Processando', pendente: 'Aguardando Pix', recusado: 'Recusado',
  expirado: 'Expirado', sem_resposta: 'Sem resposta do provedor', erro: 'Falha de comunicação',
  nao_iniciado: 'Não iniciado', nao_recebido: 'Não processado',
  estorno_solicitado: 'Estorno solicitado', estornado: 'Estornado', estorno_falhou: 'Falha no estorno',
};

const MENSAGENS = {
  CONFIRMADO: 'Recebemos seu pedido e o pagamento foi aprovado. Ele já está na fila da cozinha.',
  EM_PREPARO: 'A cozinha está preparando seu pedido agora.',
  PRONTO: 'Seu pedido está pronto! Vá até o balcão de retirada e mostre o código.',
  ENTREGUE: 'Pedido entregue. Bom apetite! 🌵',
};

function linhaDoTempo(p) {
  const quando = (status) => p.historico.find((h) => h.status === status)?.em;
  const atual = ETAPAS_ACOMPANHAMENTO.indexOf(p.status);
  return html`<ol class="linha-tempo">
    ${ETAPAS_ACOMPANHAMENTO.map((s, i) => {
      const estado = i < atual ? 'feito' : i === atual ? 'atual' : 'futuro';
      const em = quando(s);
      return html`<li class="linha-tempo__item linha-tempo__item--${estado}" ${estado === 'atual' ? html`aria-current="step"` : ''}>
        <span class="linha-tempo__marca">${estado === 'feito' ? icone('check', 14) : ''}</span>
        <span class="linha-tempo__texto"><strong>${ESTADOS_PEDIDO[s].rotulo}</strong>${em ? html`<small>${hora(em)}</small>` : ''}</span>
      </li>`;
    })}
  </ol>`;
}

let prazoTotem = null;

function telaTotem(p) {
  return html`<div class="pagina pagina--totem pagina--estreita">
    <div class="cartao confirmacao-totem">
      <span class="resultado__icone resultado__icone--sucesso">${icone('check', 48)}</span>
      <h1>Pedido confirmado!</h1>
      <p>Acompanhe pelo painel da loja. Vamos chamar ${p.nomeChamada ? html`<strong>${p.nomeChamada}</strong>` : 'pelo número'}:</p>
      <p class="codigo-gigante">${p.codigo}</p>
      <p>${p.retirada.tipo === 'local' ? 'Para comer aqui' : 'Para levar'} · ${moeda(p.total)}</p>
      ${p.pontos ? html`<p class="selo selo--sucesso">${icone('estrela', 14)} +${p.pontos} pontos creditados</p>` : ''}
      <p class="texto-suave">Retire seu comprovante abaixo da tela. Esta tela volta ao início em <strong data-volta>20</strong> s.</p>
      <button class="btn btn--primario btn--grande" data-novo-totem>Novo pedido</button>
    </div>
  </div>`;
}

export default {
  titulo: (ctx) => `Pedido ${store.pedidoPorId(ctx.params.id)?.codigo || ''}`,
  aoVivo: true,
  layout: () => (store.modoTotem() ? 'totem' : 'cliente'),
  guarda: (ctx) => {
    const p = store.pedidoPorId(ctx.params.id);
    if (store.modoTotem()) return p?.canal === 'totem' ? null : '/totem';
    const c = store.clienteAtual();
    if (!c) return `/entrar?volta=/pedido/${ctx.params.id}`;
    if (!p || p.clienteId !== c.id) return '/pedidos';
    return null;
  },
  render(ctx) {
    const p = store.pedidoPorId(ctx.params.id);
    if (store.modoTotem()) return telaTotem(p);
    const u = store.unidadePorId(p.unidadeId);
    const aguardandoPg = ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_RECUSADO'].includes(p.status);

    return html`
      <div class="pagina pagina--estreita">
        <header class="pagina__topo">
          <a class="link-voltar" href="#/pedidos">${icone('voltar', 18)} Meus pedidos</a>
          <div class="pedido-cabecalho">
            <h1>Pedido ${p.codigo}</h1>
            ${seloStatus(p.status)}
          </div>
          <p class="texto-suave">${u.nome} · ${dataHora(p.criadoEm)} · via ${nomeCanal(p.canal)}</p>
        </header>

        <p class="sr-only" aria-live="polite">Status do pedido: ${ESTADOS_PEDIDO[p.status].rotulo}</p>

        ${aguardandoPg ? html`
          <div class="caixa-alerta">${icone('alerta', 18)}
            <span>O pagamento deste pedido ainda não foi concluído. <a href="#/pagamento/${p.id}">Ir para o pagamento</a></span>
          </div>` : ''}

        ${p.status === 'CANCELADO' ? html`
          <div class="caixa-erro">${icone('fechar', 18)}
            <span>Pedido cancelado${p.cancelamento ? ` por ${p.cancelamento.por}: ${p.cancelamento.motivo}` : ''}.
            ${p.pagamento.status.startsWith('estorn') ? `Pagamento: ${ROTULO_PAGAMENTO[p.pagamento.status].toLowerCase()}.` : ''}</span>
          </div>` : ''}

        ${ETAPAS_ACOMPANHAMENTO.includes(p.status) ? html`
          <section class="cartao">
            <p class="mensagem-status">${MENSAGENS[p.status]}</p>
            ${linhaDoTempo(p)}
          </section>` : ''}

        ${['CONFIRMADO', 'EM_PREPARO', 'PRONTO'].includes(p.status) ? html`
          <section class="cartao retirada ${p.status === 'PRONTO' ? 'retirada--pronta' : ''}">
            <div class="retirada__qr">${padraoQR(p.codigo)}</div>
            <div>
              <h2>Código de retirada</h2>
              <p class="codigo-grande">${p.codigo}</p>
              <p>${p.retirada.tipo === 'local' ? 'Comer na loja' : 'Para levar'} · ${horarioRetirada(p)}</p>
              <p class="texto-suave">${icone('pin', 14)} ${u.endereco}</p>
            </div>
          </section>` : ''}

        <section class="cartao">
          <h2>Itens</h2>
          ${itensPedido(p.itens)}
          ${linhaTotais({ subtotal: p.subtotal, descontos: p.descontos, total: p.total })}
          ${p.pontos ? html`<p class="selo selo--sucesso">${icone('estrela', 14)} +${p.pontos} pontos creditados</p>` : ''}
        </section>

        <section class="cartao">
          <h2>Pagamento</h2>
          <dl class="dados">
            <div><dt>Forma</dt><dd>${METODOS_PAGAMENTO[p.pagamento.metodo]}</dd></div>
            <div><dt>Situação</dt><dd>${ROTULO_PAGAMENTO[p.pagamento.status] || p.pagamento.status}</dd></div>
            ${p.pagamento.transacaoId ? html`<div><dt>Transação no provedor</dt><dd><code>${p.pagamento.transacaoId}</code></dd></div>` : ''}
            <div><dt>Tentativas</dt><dd>${p.pagamento.tentativas}</dd></div>
          </dl>
        </section>

        ${clientePodeCancelar(p) ? html`
          <button class="btn btn--perigo-suave btn--bloco" data-cancelar>Cancelar pedido</button>
          <p class="texto-suave texto-pequeno">Você pode cancelar até a cozinha começar o preparo. Pagamentos aprovados são estornados automaticamente.</p>` : ''}
      </div>`;
  },
  montar(raiz, ctx) {
    const id = ctx.params.id;
    const timers = [];
    if (store.modoTotem()) {
      // Prazo fixo por pedido: re-renderizações (mudança de status) não reiniciam a contagem.
      if (prazoTotem?.id !== id) prazoTotem = { id, ate: Date.now() + 20e3 };
      timers.push(setInterval(() => {
        const resta = Math.max(0, Math.ceil((prazoTotem.ate - Date.now()) / 1000));
        const el = raiz.querySelector('[data-volta]');
        if (el) el.textContent = resta;
        if (resta <= 0) {
          store.reiniciarTotem();
          ctx.navegar('/totem');
        }
      }, 1000));
    }
    const aoClicar = async (e) => {
      if (e.target.closest('[data-novo-totem]')) {
        store.reiniciarTotem();
        ctx.navegar('/totem');
        return;
      }
      if (e.target.closest('[data-cancelar]')) {
        const r = await dialogo({
          titulo: 'Cancelar este pedido?',
          corpo: html`<p>Se o pagamento já foi aprovado, solicitaremos o estorno ao provedor.</p>
            <label class="campo"><span class="campo__rotulo">Motivo</span>
              <select name="motivo">
                <option>Desisti do pedido</option>
                <option>Escolhi a unidade errada</option>
                <option>Vou demorar para retirar</option>
                <option>Outro motivo</option>
              </select></label>`,
          confirmar: 'Cancelar pedido', cancelar: 'Manter pedido', perigo: true,
        });
        if (!r) return;
        const res = await store.cancelarPedido(id, { motivo: `Cliente: ${r.motivo}` });
        aviso(res.ok ? 'Pedido cancelado.' : res.erro, res.ok ? 'info' : 'erro');
      }
    };
    raiz.addEventListener('click', aoClicar);
    return () => {
      timers.forEach(clearInterval);
      raiz.removeEventListener('click', aoClicar);
    };
  },
};
