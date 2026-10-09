import * as store from '../store.js';
import { html, icone, moeda } from '../ui.js';
import { ESTADOS_ATIVOS } from '../domain.js';
import { resumoUnidade, seloStatus, abrirProduto } from './comum.js';

export default {
  titulo: 'Início',
  aoVivo: true,
  render() {
    const u = store.unidadeAtual('cliente');
    const cliente = store.clienteAtual();
    const ativo = cliente && store.pedidosDoCliente(cliente.id).find((p) => ESTADOS_ATIVOS.includes(p.status));
    const promos = store.promocoes().filter((p) => p.ativa).slice(0, 3);

    // Sugestões: com consentimento de personalização usamos o histórico do cliente;
    // sem consentimento mostramos apenas os mais pedidos da rede (dado agregado).
    let sugestoes = [];
    let tituloSugestoes = 'Os mais pedidos da rede';
    if (u) {
      const menu = store.cardapio(u).filter((p) => p.disp.disponivel);
      if (cliente?.consentimentos?.personalizacao) {
        const contagem = {};
        store.pedidosDoCliente(cliente.id).forEach((p) => p.itens.forEach((i) => { contagem[i.produtoId] = (contagem[i.produtoId] || 0) + i.qtd; }));
        sugestoes = menu.filter((p) => contagem[p.id]).sort((a, b) => contagem[b.id] - contagem[a.id]).slice(0, 4);
        if (sugestoes.length) tituloSugestoes = `Seus favoritos, ${cliente.nome.split(' ')[0]}`;
      }
      if (!sugestoes.length) sugestoes = menu.filter((p) => p.tags?.includes('Mais pedido')).concat(menu).filter((p, i, a) => a.indexOf(p) === i).slice(0, 4);
    }

    return html`<div class="pagina">
      <section class="hero">
        <div class="hero__texto">
          <p class="sobretitulo">Rede Raízes do Nordeste</p>
          <h1>Cuscuz quentinho e café passado na hora, sem fila.</h1>
          <p>Escolha a unidade, peça pelo app ou pelo site e retire no balcão. Também estamos nos totens e no atendimento das lojas.</p>
          <div class="hero__acoes">
            ${u
              ? html`<a class="btn btn--primario btn--grande" href="#/cardapio">${icone('cardapio')} Ver cardápio</a>`
              : html`<a class="btn btn--primario btn--grande" href="#/unidades?volta=/cardapio">${icone('pin')} Escolher unidade</a>`}
            <a class="btn btn--secundario btn--grande" href="#/promocoes">${icone('tag')} Promoções</a>
          </div>
        </div>
        <div class="hero__arte" aria-hidden="true"><span>🌽</span><span>☕</span><span>🫓</span></div>
      </section>

      ${ativo ? html`
        <a class="pedido-ativo" href="#/pedido/${ativo.id}">
          <span class="pedido-ativo__icone">${icone('fogo', 22)}</span>
          <span><strong>Pedido ${ativo.codigo}</strong>${seloStatus(ativo.status)}</span>
          <span class="pedido-ativo__acao">Acompanhar ${icone('seta', 18)}</span>
        </a>` : ''}

      ${u ? html`
        <section class="secao">
          <div class="secao__topo"><h2>Sua unidade</h2><a href="#/unidades?volta=/">Trocar</a></div>
          <div class="cartao">${resumoUnidade(u)}</div>
        </section>` : ''}

      <section class="secao">
        <h2>Peça do seu jeito</h2>
        <ul class="canais">
          <li><span>${icone('telefone', 24)}</span><strong>App e site</strong><p>Peça antes de chegar, pague on-line e acompanhe o preparo.</p></li>
          <li><span>${icone('totem', 24)}</span><strong>Totem na loja</strong><p>Autoatendimento rápido, sem precisar de cadastro.</p></li>
          <li><span>${icone('caixa', 24)}</span><strong>Balcão</strong><p>Atendimento humano, como sempre foi desde Recife.</p></li>
          <li><span>${icone('sacola', 24)}</span><strong>Retirada rápida</strong><p>Agende o horário e retire com o código do pedido.</p></li>
        </ul>
      </section>

      ${sugestoes.length ? html`
        <section class="secao">
          <div class="secao__topo"><h2>${tituloSugestoes}</h2><a href="#/cardapio">Ver tudo</a></div>
          <ul class="grade-produtos grade-produtos--compacta">
            ${sugestoes.map((p) => html`<li>
              <button class="produto produto--compacto" data-produto="${p.id}">
                <span class="produto__emoji" aria-hidden="true">${p.emoji}</span>
                <span class="produto__nome">${p.nome}</span>
                <span class="produto__preco">${moeda(p.preco)}</span>
              </button></li>`)}
          </ul>
        </section>` : ''}

      ${promos.length ? html`
        <section class="secao">
          <div class="secao__topo"><h2>Promoções da semana</h2><a href="#/promocoes">Ver todas</a></div>
          <ul class="faixa-promos">
            ${promos.map((p) => html`<li class="promo">
              <strong>${p.titulo}</strong><p>${p.descricao}</p><code class="cupom">${p.cupom}</code></li>`)}
          </ul>
        </section>` : ''}

      <section class="secao chamada-fidelidade">
        <div>
          <h2>${icone('estrela', 22)} Programa Raízes</h2>
          <p>Ganhe 1 ponto a cada R$ 1, suba de nível e troque por tapioca, café e descontos. Participar é opcional e você decide como seus dados são usados.</p>
        </div>
        <a class="btn btn--primario" href="#/fidelidade">${cliente?.consentimentos?.fidelidade ? `Você tem ${cliente.pontos} pontos` : 'Conhecer o programa'}</a>
      </section>
    </div>`;
  },
  montar(raiz) {
    const u = store.unidadeAtual('cliente');
    const clique = (e) => {
      const b = e.target.closest('[data-produto]');
      if (!b || !u) return;
      const p = store.cardapio(u).find((x) => x.id === b.dataset.produto);
      if (p) abrirProduto(p, 'cliente');
    };
    raiz.addEventListener('click', clique);
    return () => raiz.removeEventListener('click', clique);
  },
};
