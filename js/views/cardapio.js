import * as store from '../store.js';
import { html, icone, moeda } from '../ui.js';
import { CATEGORIAS } from '../data.js';
import { unidadeAberta } from '../domain.js';
import { resumoUnidade, abrirProduto } from './comum.js';

const contexto = () => store.contextoAtual();

function cartaoProduto(p, totem) {
  const d = p.disp;
  return html`<li>
    <button class="produto ${d.disponivel ? '' : 'produto--indisponivel'} ${totem ? 'produto--totem' : ''}"
      data-produto="${p.id}" ${d.disponivel ? '' : html`aria-disabled="true"`}
      data-busca="${`${p.nome} ${p.descricao}`.toLowerCase()}">
      <span class="produto__emoji" aria-hidden="true">${p.emoji}</span>
      <span class="produto__corpo">
        <span class="produto__nome">${p.nome}</span>
        <span class="produto__descricao">${p.descricao}</span>
        <span class="produto__selos">
          ${(p.tags || []).map((t) => html`<span class="selo selo--suave">${t}</span>`)}
          ${p.variacaoRegional ? html`<span class="selo selo--info">Receita regional</span>` : ''}
          ${d.disponivel && d.ultimas ? html`<span class="selo selo--alerta">Últimas ${d.quantidade}</span>` : ''}
          ${!d.disponivel ? html`<span class="selo selo--erro">${d.rotulo}</span>` : ''}
        </span>
      </span>
      <span class="produto__lado">
        <span class="produto__preco">${moeda(p.preco)}</span>
        ${d.disponivel ? html`<span class="produto__add" aria-hidden="true">${icone('mais', 18)}</span>` : ''}
      </span>
      <span class="sr-only">${d.disponivel ? 'Toque para adicionar' : `Indisponível: ${d.rotulo}`}</span>
    </button></li>`;
}

export default {
  titulo: 'Cardápio',
  layout: () => (store.modoTotem() ? 'totem' : 'cliente'),
  guarda: () => (!store.unidadeAtual(contexto()) ? (store.modoTotem() ? '/totem' : '/unidades?volta=/cardapio') : null),
  render() {
    const ctx = contexto();
    const totem = ctx === 'totem';
    const u = store.unidadeAtual(ctx);
    const menu = store.cardapio(u);
    const resumo = store.resumoCarrinho(ctx);
    const categorias = CATEGORIAS.map((c) => ({ ...c, itens: menu.filter((p) => p.categoria === c.id) })).filter((c) => c.itens.length);
    // Itens sazonais fora de época ficam no fim, sinalizados (não somem do cardápio).
    const ordenar = (itens) => [...itens].sort((a, b) => Number(b.disp.disponivel) - Number(a.disp.disponivel));

    return html`
      <div class="pagina pagina--cardapio ${totem ? 'pagina--totem' : ''}">
        ${totem ? html`<h1 class="titulo-totem">O que vai ser hoje?</h1>` : html`
          <header class="pagina__topo">
            <h1>Cardápio</h1>
            <div class="cartao cartao--fino">${resumoUnidade(u)}</div>
            ${!unidadeAberta(u) ? html`<p class="caixa-alerta">${icone('relogio', 18)} A unidade está fechada agora, mas você pode fazer um pedido antecipado e agendar a retirada a partir das ${u.abre}.</p>` : ''}
          </header>`}

        <div class="cardapio-filtros">
          ${!totem ? html`
            <label class="busca">
              ${icone('busca', 18)}
              <span class="sr-only">Buscar no cardápio</span>
              <input type="search" placeholder="Buscar tapioca, cuscuz, suco…" data-busca-input autocomplete="off">
            </label>` : ''}
          <nav class="chips" aria-label="Categorias">
            ${categorias.map((c) => html`<a class="chip" href="#/cardapio" data-ancora="cat-${c.id}">${c.nome}</a>`)}
          </nav>
        </div>

        ${categorias.map((c) => html`
          <section class="categoria" id="cat-${c.id}" aria-labelledby="titulo-${c.id}">
            <h2 id="titulo-${c.id}">${c.nome}</h2>
            ${c.id === 'juninos' && !c.itens.some((p) => p.disp.disponivel) ? html`<p class="texto-suave">Especiais de São João: voltam em junho e julho.</p>` : ''}
            <ul class="grade-produtos">${ordenar(c.itens).map((p) => cartaoProduto(p, totem))}</ul>
          </section>`)}
        <p class="vazio-busca" data-sem-resultado hidden>Nenhum item encontrado nesta unidade.</p>
      </div>

      ${resumo.quantidade ? html`
        <a class="barra-sacola ${totem ? 'barra-sacola--totem' : ''}" href="#/sacola">
          <span class="barra-sacola__qtd">${resumo.quantidade}</span>
          <span>Ver sacola</span>
          <strong>${moeda(resumo.totais.total)}</strong>
        </a>` : ''}`;
  },
  montar(raiz, ctx) {
    const c = contexto();
    const u = store.unidadeAtual(c);
    const aoClicar = async (e) => {
      const ancora = e.target.closest('[data-ancora]');
      if (ancora) {
        e.preventDefault();
        document.getElementById(ancora.dataset.ancora)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const b = e.target.closest('[data-produto]');
      if (!b) return;
      const p = store.cardapio(u).find((x) => x.id === b.dataset.produto);
      if (!p?.disp.disponivel) return;
      if (await abrirProduto(p, c)) ctx.rerender();
    };
    const aoBuscar = (e) => {
      if (!e.target.matches('[data-busca-input]')) return;
      const termo = e.target.value.trim().toLowerCase();
      let visiveis = 0;
      raiz.querySelectorAll('.categoria').forEach((sec) => {
        let n = 0;
        sec.querySelectorAll('[data-produto]').forEach((b) => {
          const mostra = !termo || b.dataset.busca.includes(termo);
          b.parentElement.hidden = !mostra;
          if (mostra) n += 1;
        });
        sec.hidden = n === 0;
        visiveis += n;
      });
      raiz.querySelector('[data-sem-resultado]').hidden = visiveis > 0;
    };
    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('input', aoBuscar);
    return () => {
      raiz.removeEventListener('click', aoClicar);
      raiz.removeEventListener('input', aoBuscar);
    };
  },
};
