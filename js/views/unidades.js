import * as store from '../store.js';
import { html, icone } from '../ui.js';
import { UNIDADES, FORMATOS } from '../data.js';
import { statusUnidade, confirmarTrocaUnidade } from './comum.js';

let filtroUF = '';

export default {
  titulo: 'Unidades',
  render() {
    const atual = store.unidadeAtual('cliente');
    const ufs = [...new Set(UNIDADES.map((u) => u.uf))].sort();
    const lista = UNIDADES.filter((u) => !filtroUF || u.uf === filtroUF);
    return html`
      <div class="pagina">
        <header class="pagina__topo">
          <h1>Escolha a unidade</h1>
          <p class="texto-suave">O cardápio, os preços e o estoque são de cada loja. Algumas unidades têm cozinha completa; outras operam em formato compacto, com cardápio reduzido.</p>
        </header>
        <label class="campo campo--inline">
          <span class="campo__rotulo">Estado</span>
          <select data-filtro-uf>
            <option value="">Todos</option>
            ${ufs.map((uf) => html`<option value="${uf}" ${filtroUF === uf ? 'selected' : ''}>${uf}</option>`)}
          </select>
        </label>
        <ul class="lista-unidades">
          ${lista.map((u) => html`
            <li class="cartao unidade ${atual?.id === u.id ? 'unidade--atual' : ''}">
              <div class="unidade__info">
                <h2>${u.nome}</h2>
                <p>${icone('pin', 16)} ${u.endereco} – ${u.cidade}/${u.uf}</p>
                <p>${icone('relogio', 16)} Todos os dias, das ${u.abre} às ${u.fecha}</p>
                <div class="unidade__selos">
                  ${statusUnidade(u)}
                  <span class="selo selo--neutro">${FORMATOS[u.formato]}</span>
                  <span class="selo selo--neutro">Região ${u.regiao}</span>
                </div>
              </div>
              ${atual?.id === u.id
                ? html`<span class="selo selo--sucesso">${icone('check', 14)} Selecionada</span>`
                : html`<button class="btn btn--primario" data-unidade="${u.id}">Pedir aqui</button>`}
            </li>`)}
        </ul>
      </div>`;
  },
  montar(raiz, ctx) {
    const aoClicar = async (e) => {
      const b = e.target.closest('[data-unidade]');
      if (!b) return;
      if (await confirmarTrocaUnidade(b.dataset.unidade)) {
        const volta = ctx.query.volta && ctx.query.volta.startsWith('/') && ctx.query.volta !== '/unidades' ? ctx.query.volta : '/cardapio';
        ctx.navegar(volta);
      }
    };
    const aoMudar = (e) => {
      if (e.target.matches('[data-filtro-uf]')) {
        filtroUF = e.target.value;
        ctx.rerender();
      }
    };
    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('change', aoMudar);
    return () => {
      raiz.removeEventListener('click', aoClicar);
      raiz.removeEventListener('change', aoMudar);
    };
  },
};
