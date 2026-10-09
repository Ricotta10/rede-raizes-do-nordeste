// Canal Totem: tela de configuração do equipamento e tela de espera (atração).

import * as store from '../store.js';
import { html, icone } from '../ui.js';
import { UNIDADES, FORMATOS } from '../data.js';

export default {
  titulo: 'Totem de autoatendimento',
  layout: () => (store.modoTotem() ? 'totem' : 'cliente'),
  render() {
    if (!store.modoTotem()) {
      return html`<div class="pagina pagina--estreita">
        <header class="pagina__topo">
          <h1>${icone('totem', 26)} Configurar totem</h1>
          <p class="texto-suave">Esta tela simula a instalação de um totem de autoatendimento em uma loja. Em produção, o equipamento é vinculado à unidade pela equipe técnica.</p>
        </header>
        <form class="cartao" data-config-totem>
          <label class="campo">
            <span class="campo__rotulo">Unidade onde o totem está instalado</span>
            <select name="unidade" required>
              ${UNIDADES.map((u) => html`<option value="${u.id}">${u.nome} (${FORMATOS[u.formato]})</option>`)}
            </select>
          </label>
          <ul class="lista-simples texto-suave">
            <li>Interface com botões grandes, pensada para toque.</li>
            <li>Não exige cadastro; CPF opcional apenas para pontuar.</li>
            <li>Reinicia sozinho após 90 segundos sem uso.</li>
          </ul>
          <button class="btn btn--primario btn--grande">Iniciar modo totem</button>
        </form>
      </div>`;
    }
    const u = store.unidadeAtual('totem');
    const promo = store.promocoes().find((p) => p.ativa && p.canais?.includes('totem'));
    return html`<button class="totem-espera" data-comecar>
      <span class="totem-espera__arte" aria-hidden="true">🌵</span>
      <span class="totem-espera__titulo">Bem-vindo à Raízes do Nordeste</span>
      <span class="totem-espera__sub">${u.nome}</span>
      <span class="totem-espera__cta">Toque para fazer seu pedido</span>
      ${promo ? html`<span class="totem-espera__promo">${icone('tag', 22)} ${promo.titulo}: use o cupom <strong>${promo.cupom}</strong></span>` : ''}
    </button>`;
  },
  montar(raiz, ctx) {
    raiz.querySelector('[data-config-totem]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      store.iniciarTotem(e.target.unidade.value);
      ctx.navegar('/totem');
    });
    raiz.querySelector('[data-comecar]')?.addEventListener('click', () => {
      store.reiniciarTotem();
      ctx.navegar('/cardapio');
    });
    return null;
  },
};
