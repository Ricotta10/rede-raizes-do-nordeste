import * as store from '../store.js';
import { html, icone, moeda, dataHora, aviso } from '../ui.js';
import { ESTADOS_ATIVOS, nomeCanal } from '../domain.js';
import { seloStatus, vazio, confirmarTrocaUnidade } from './comum.js';

function cartaoPedido(p) {
  const u = store.unidadePorId(p.unidadeId);
  return html`<li class="cartao pedido-item">
    <a class="pedido-item__link" href="#/pedido/${p.id}">
      <div class="pedido-item__topo"><strong>${p.codigo}</strong>${seloStatus(p.status)}</div>
      <p class="texto-suave">${u?.nome} · ${dataHora(p.criadoEm)} · ${nomeCanal(p.canal)}</p>
      <p>${p.itens.map((i) => `${i.qtd}× ${i.nome}`).join(', ')}</p>
      <p class="pedido-item__total">${moeda(p.total)}</p>
    </a>
    ${!ESTADOS_ATIVOS.includes(p.status) ? html`<button class="btn btn--secundario btn--pequeno" data-repetir="${p.id}">${icone('mais', 16)} Pedir de novo</button>` : ''}
  </li>`;
}

export default {
  titulo: 'Meus pedidos',
  aoVivo: true,
  guarda: () => (!store.clienteAtual() ? '/entrar?volta=/pedidos' : null),
  render() {
    const c = store.clienteAtual();
    const lista = store.pedidosDoCliente(c.id);
    if (!lista.length) {
      return html`<div class="pagina">${vazio({
        icone: 'recibo', titulo: 'Você ainda não fez pedidos', texto: 'Seus pedidos pelo app, site, totem (com CPF) e balcão aparecem aqui.',
        acao: { href: '#/cardapio', rotulo: 'Fazer meu primeiro pedido' },
      })}</div>`;
    }
    const ativos = lista.filter((p) => ESTADOS_ATIVOS.includes(p.status));
    const anteriores = lista.filter((p) => !ESTADOS_ATIVOS.includes(p.status));
    return html`
      <div class="pagina pagina--estreita">
        <header class="pagina__topo"><h1>Meus pedidos</h1></header>
        ${ativos.length ? html`<section class="secao"><h2>Em andamento</h2><ul class="lista-pedidos">${ativos.map(cartaoPedido)}</ul></section>` : ''}
        ${anteriores.length ? html`<section class="secao"><h2>Anteriores</h2><ul class="lista-pedidos">${anteriores.map(cartaoPedido)}</ul></section>` : ''}
      </div>`;
  },
  montar(raiz, ctx) {
    const aoClicar = async (e) => {
      const b = e.target.closest('[data-repetir]');
      if (!b) return;
      const p = store.pedidoPorId(b.dataset.repetir);
      if (!(await confirmarTrocaUnidade(p.unidadeId))) return;
      const falhas = [];
      p.itens.forEach((i) => {
        const r = store.adicionarAoCarrinho(i.produtoId, i.qtd, i.obs, 'cliente');
        if (!r.ok) falhas.push(i.nome);
      });
      if (falhas.length) aviso(`Indisponíveis agora: ${falhas.join(', ')}.`, 'erro');
      else aviso('Itens adicionados à sacola.', 'sucesso');
      ctx.navegar('/sacola');
    };
    raiz.addEventListener('click', aoClicar);
    return () => raiz.removeEventListener('click', aoClicar);
  },
};
