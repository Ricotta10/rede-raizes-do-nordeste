// Fluxo de pagamento com serviço externo: envio da solicitação, espera da resposta,
// retorno visual (aprovado, recusado, sem resposta, Pix pendente/expirado) e recuperação.

import * as store from '../store.js';
import { html, icone, moeda, aviso, dialogo, copiarTexto, padraoQR } from '../ui.js';
import { METODOS_PAGAMENTO } from '../data.js';
import { TEMPO_LIMITE_MS } from '../services/gateway.js';

const ERROS = ['recusado', 'expirado', 'erro', 'nao_recebido'];

function podeVer(p) {
  if (!p) return false;
  if (store.modoTotem()) return p.canal === 'totem';
  const c = store.clienteAtual();
  return !!c && p.clienteId === c.id;
}

function etapas(p) {
  const s = p.pagamento.status;
  const etapa = (rotulo, estado, detalhe = '') => html`
    <li class="etapa etapa--${estado}">
      <span class="etapa__marca" aria-hidden="true">${estado === 'ok' ? icone('check', 16) : estado === 'erro' ? icone('fechar', 16) : estado === 'ativo' ? html`<span class="girando"></span>` : ''}</span>
      <span><strong>${rotulo}</strong>${detalhe ? html`<small>${detalhe}</small>` : ''}</span>
    </li>`;
  const enviado = s !== 'nao_iniciado';
  const respondeu = ['aprovado', ...ERROS].includes(s);
  return html`<ol class="etapas" aria-label="Etapas do pagamento">
    ${etapa('Pedido registrado', 'ok', p.codigo)}
    ${etapa('Solicitação enviada ao provedor de pagamento', enviado ? 'ok' : 'ativo', METODOS_PAGAMENTO[p.pagamento.metodo])}
    ${etapa('Resposta do provedor', s === 'aprovado' ? 'ok' : ERROS.includes(s) ? 'erro' : ['sem_resposta'].includes(s) ? 'erro' : enviado ? 'ativo' : 'pendente',
      s === 'aprovado' ? `Aprovado · autorização ${p.pagamento.autorizacao || '—'}` : ERROS.includes(s) ? 'Não aprovado' : s === 'sem_resposta' ? 'Sem resposta no tempo limite' : s === 'pendente' ? 'Aguardando o Pix' : '')}
    ${etapa('Pedido enviado para a cozinha', s === 'aprovado' ? 'ok' : 'pendente')}
  </ol>`;
}

function metodosDisponiveis(p) {
  return p.canal === 'totem' ? ['cartao_totem', 'pix'] : ['pix', 'credito', 'debito'];
}

function painel(p) {
  const s = p.pagamento.status;
  const totem = p.canal === 'totem';

  if (p.status === 'CANCELADO') {
    return html`<div class="resultado resultado--erro">
      <span class="resultado__icone">${icone('fechar', 40)}</span>
      <h2>Pedido cancelado</h2>
      <p>${p.cancelamento?.motivo || 'Este pedido foi cancelado.'}</p>
      ${['estornado', 'estorno_solicitado'].includes(p.pagamento.status) ? html`<p class="texto-suave">O valor pago foi estornado pelo provedor.</p>` : ''}
      <a class="btn btn--primario" href="#/cardapio">Fazer novo pedido</a>
    </div>`;
  }

  if (s === 'aprovado') {
    return html`<div class="resultado resultado--sucesso" role="status">
      <span class="resultado__icone">${icone('check', 40)}</span>
      <h2>Pagamento aprovado!</h2>
      <p>Seu pedido <strong>${p.codigo}</strong> já foi para a cozinha.</p>
      ${p.pontos ? html`<p class="selo selo--sucesso">${icone('estrela', 14)} +${p.pontos} pontos no Programa Raízes</p>` : ''}
      <a class="btn btn--primario btn--grande" href="#/pedido/${p.id}">Acompanhar pedido</a>
      <p class="texto-suave texto-pequeno">Você será direcionado automaticamente…</p>
    </div>`;
  }

  if (s === 'pendente' && p.pagamento.pix) {
    return html`<div class="pix">
      <h2>Pague com Pix</h2>
      <p>Abra o app do seu banco e leia o QR Code ou use o código copia e cola.</p>
      <div class="pix__qr">${padraoQR(p.pagamento.pix.copiaECola)}</div>
      <p class="pix__valor">${moeda(p.total)}</p>
      <p class="texto-suave">Expira em <strong data-expira="${p.pagamento.pix.expiraEm}">--:--</strong></p>
      ${!totem ? html`<div class="campo__linha">
        <input readonly value="${p.pagamento.pix.copiaECola}" aria-label="Código Pix copia e cola" class="pix__codigo">
        <button class="btn btn--secundario" data-acao-pg="copiar">${icone('copiar', 18)} Copiar</button>
      </div>` : ''}
      <p class="aguardando"><span class="girando"></span> Aguardando a confirmação do banco…</p>
      <div class="caixa-demo">
        <strong>Demonstração</strong>
        <p>Em produção, o provedor avisa o pagamento por webhook. Aqui ele é aprovado em alguns segundos ou pelo botão abaixo.</p>
        <button class="btn btn--secundario btn--pequeno" data-acao-pg="simular-pix">Simular pagamento no app do banco</button>
      </div>
      <button class="link" data-acao-pg="trocar">Usar outra forma de pagamento</button>
    </div>`;
  }

  if (s === 'sem_resposta') {
    return html`<div class="resultado resultado--alerta" role="alert">
      <span class="resultado__icone">${icone('alerta', 40)}</span>
      <h2>Não recebemos a resposta do provedor</h2>
      <p>A comunicação com o serviço de pagamento demorou mais que o esperado. <strong>Não tente pagar de novo ainda</strong>: o pagamento pode ter sido aprovado. Vamos consultar o provedor para evitar cobrança em duplicidade.</p>
      <button class="btn btn--primario btn--grande" data-acao-pg="verificar">Verificar status do pagamento</button>
    </div>`;
  }

  if (ERROS.includes(s)) {
    const titulos = {
      recusado: 'Pagamento não aprovado',
      expirado: 'O Pix expirou',
      erro: 'Falha de comunicação',
      nao_recebido: 'Pagamento não processado',
    };
    return html`<div class="resultado resultado--erro" role="alert">
      <span class="resultado__icone">${icone('fechar', 40)}</span>
      <h2>${titulos[s]}</h2>
      <p>${p.pagamento.mensagem || 'Não foi possível concluir o pagamento.'}</p>
      <p class="texto-suave">Nenhum valor foi cobrado. Seu pedido fica reservado por 15 minutos.</p>
      <fieldset class="opcoes-grade ${totem ? '' : 'opcoes-grade--3'}">
        <legend class="campo__rotulo">Tentar com</legend>
        ${metodosDisponiveis(p).map((m) => html`
          <label class="opcao-cartao"><input type="radio" name="novo-metodo" value="${m}" ${m === p.pagamento.metodo ? 'checked' : ''}><span><strong>${METODOS_PAGAMENTO[m]}</strong></span></label>`)}
      </fieldset>
      <div class="resultado__acoes">
        <button class="btn btn--primario btn--grande" data-acao-pg="tentar">Tentar novamente</button>
        <button class="btn btn--secundario" data-acao-pg="cancelar">Cancelar pedido</button>
      </div>
    </div>`;
  }

  // nao_iniciado | processando
  const maquininha = p.pagamento.metodo === 'cartao_totem';
  return html`<div class="resultado resultado--processando" role="status" aria-live="polite">
    ${maquininha ? html`<span class="maquininha" aria-hidden="true">💳</span>
      <h2>Aproxime, insira ou passe o cartão na maquininha</h2>`
      : html`<span class="girando girando--grande" aria-hidden="true"></span>
      <h2>${p.pagamento.metodo === 'pix' ? 'Gerando o QR Code Pix…' : 'Autorizando no ambiente seguro do provedor…'}</h2>`}
    <p class="texto-suave">Aguardando resposta do provedor de pagamento <span data-decorrido>0</span>s (limite de ${TEMPO_LIMITE_MS / 1000}s).</p>
    <p class="texto-suave texto-pequeno">Não feche esta tela.</p>
  </div>`;
}

export default {
  titulo: 'Pagamento',
  aoVivo: true,
  layout: () => (store.modoTotem() ? 'totem' : 'cliente'),
  guarda: (ctx) => {
    const p = store.pedidoPorId(ctx.params.id);
    if (!podeVer(p)) return store.modoTotem() ? '/totem' : store.clienteAtual() ? '/pedidos' : '/entrar';
    return null;
  },
  render(ctx) {
    const p = store.pedidoPorId(ctx.params.id);
    return html`
      <div class="pagina pagina--estreita ${p.canal === 'totem' ? 'pagina--totem' : ''}">
        <header class="pagina__topo">
          <h1>Pagamento · ${moeda(p.total)}</h1>
          <p class="texto-suave">Pedido ${p.codigo} · ${METODOS_PAGAMENTO[p.pagamento.metodo]}</p>
        </header>
        <div class="pagamento">
          ${etapas(p)}
          <div class="cartao">${painel(p)}</div>
        </div>
      </div>`;
  },
  montar(raiz, ctx) {
    const id = ctx.params.id;
    const p = store.pedidoPorId(id);
    const timers = [];

    if (p.pagamento.status === 'nao_iniciado') store.pagarPedido(id);
    else if (p.pagamento.status === 'processando' && !store.pagamentoEmAndamento(id)) store.verificarPagamento(id);

    // Redireciona para o acompanhamento depois da aprovação.
    if (p.pagamento.status === 'aprovado' && p.status !== 'CANCELADO') {
      timers.push(setTimeout(() => {
        if (location.hash === `#/pagamento/${id}`) ctx.navegar(`/pedido/${id}`, { substituir: true });
      }, 2500));
    }

    // Contadores visuais (sem renderizar a tela inteira).
    const inicio = Date.parse(p.pagamento.atualizadoEm || p.criadoEm);
    timers.push(setInterval(() => {
      const dec = raiz.querySelector('[data-decorrido]');
      if (dec) dec.textContent = Math.max(0, Math.floor((Date.now() - inicio) / 1000));
      const exp = raiz.querySelector('[data-expira]');
      if (exp) {
        const resta = Math.max(0, Number(exp.dataset.expira) - Date.now());
        exp.textContent = `${String(Math.floor(resta / 60000)).padStart(2, '0')}:${String(Math.floor((resta % 60000) / 1000)).padStart(2, '0')}`;
      }
    }, 500));

    // Consulta periódica do Pix (polling) enquanto estiver pendente.
    let consultando = false;
    timers.push(setInterval(async () => {
      const atual = store.pedidoPorId(id);
      if (atual?.pagamento.status !== 'pendente' || consultando) return;
      consultando = true;
      try { await store.verificarPagamento(id); } finally { consultando = false; }
    }, 2500));

    const aoClicar = async (e) => {
      const b = e.target.closest('[data-acao-pg]');
      if (!b) return;
      const acao = b.dataset.acaoPg;
      const atual = store.pedidoPorId(id);
      if (acao === 'copiar') copiarTexto(atual.pagamento.pix.copiaECola);
      if (acao === 'simular-pix') {
        store.simularPixPago(id);
        b.disabled = true;
        b.textContent = 'Pagamento enviado pelo banco…';
      }
      if (acao === 'verificar') {
        b.disabled = true;
        b.textContent = 'Consultando o provedor…';
        const r = await store.verificarPagamento(id);
        if (r?.status === 'aprovado') aviso('Boa notícia: o pagamento havia sido aprovado.', 'sucesso');
      }
      if (acao === 'tentar') {
        const escolhido = raiz.querySelector('input[name="novo-metodo"]:checked')?.value;
        store.pagarPedido(id, escolhido);
      }
      if (acao === 'trocar') {
        const ok = await dialogo({
          titulo: 'Trocar forma de pagamento?',
          corpo: 'O QR Code atual será descartado. Se você já pagou, aguarde a confirmação em vez de trocar.',
          confirmar: 'Trocar',
        });
        if (ok) {
          const r = await store.verificarPagamento(id);
          if (r?.status === 'aprovado') return;
          const escolha = await dialogo({
            titulo: 'Escolha a nova forma',
            corpo: html`<fieldset class="opcoes-grade">${metodosDisponiveis(atual).filter((m) => m !== 'pix').map((m, i) => html`
              <label class="opcao-cartao"><input type="radio" name="metodo" value="${m}" ${i === 0 ? 'checked' : ''}><span><strong>${METODOS_PAGAMENTO[m]}</strong></span></label>`)}</fieldset>`,
            confirmar: 'Pagar',
          });
          if (escolha?.metodo) {
            // Encerra a tentativa Pix e inicia uma nova tentativa com outra chave de idempotência.
            store.pagarPedidoTrocandoMetodo(id, escolha.metodo);
          }
        }
      }
      if (acao === 'cancelar') {
        const ok = await dialogo({
          titulo: 'Cancelar o pedido?',
          corpo: 'Os itens voltam para o estoque da loja e nenhum valor será cobrado.',
          confirmar: 'Cancelar pedido', cancelar: 'Voltar', perigo: true,
        });
        if (ok) {
          await store.cancelarPedido(id, { motivo: 'Cancelado pelo cliente após pagamento não aprovado' });
          aviso('Pedido cancelado.', 'info');
        }
      }
    };
    raiz.addEventListener('click', aoClicar);
    return () => {
      timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
      raiz.removeEventListener('click', aoClicar);
    };
  },
};
