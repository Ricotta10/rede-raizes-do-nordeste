import * as store from '../store.js';
import { html, icone, moeda, data, aviso } from '../ui.js';
import { CATEGORIAS } from '../data.js';
import { nomeCanal } from '../domain.js';

function regras(p) {
  const r = [];
  if (p.canais) r.push(`Válido em: ${p.canais.map(nomeCanal).join(', ')}`);
  if (p.minimo) r.push(`Pedido mínimo de ${moeda(p.minimo)}`);
  if (p.categorias) r.push(`Somente ${p.categorias.map((c) => CATEGORIAS.find((x) => x.id === c)?.nome.toLowerCase()).join(', ')}`);
  if (p.regioes) r.push(`Unidades da região ${p.regioes.join(', ')}`);
  if (p.segmento === 'fidelidade') r.push('Exclusivo para participantes do Programa Raízes');
  if (p.regra === 'primeiro_pedido') r.push('Apenas no primeiro pedido da conta');
  if (p.validaAte) r.push(`Até ${data(`${p.validaAte}T12:00:00`)}`);
  r.push('Não cumulativo com outros cupons ou recompensas');
  return r;
}

export default {
  titulo: 'Promoções',
  aoVivo: true,
  render() {
    const c = store.clienteAtual();
    const todas = store.promocoes();
    const ativas = todas.filter((p) => p.ativa);
    const encerradas = todas.filter((p) => !p.ativa);
    const aniversario = c?.consentimentos?.personalizacao && c.nascimento
      && new Date(`${c.nascimento}T12:00:00`).getMonth() === new Date().getMonth();

    return html`<div class="pagina">
      <header class="pagina__topo">
        <h1>Promoções e campanhas</h1>
        <p class="texto-suave">Aplique o cupom na sacola. Cada campanha tem regras de canal, unidade e público.</p>
      </header>

      ${aniversario ? html`<section class="cartao destaque-aniversario">
        <span aria-hidden="true">🎂</span>
        <div><h2>Feliz aniversário, ${c.nome.split(' ')[0]}!</h2>
        <p>Este mês, mostre o app no balcão e ganhe uma fatia de bolo de macaxeira. Você está vendo esta oferta porque autorizou ofertas personalizadas.</p></div>
      </section>` : ''}
      ${c && !c.consentimentos.personalizacao ? html`<p class="caixa-info">${icone('info', 18)} <span>Você não recebe ofertas personalizadas. Se quiser campanhas pensadas para você, ative em <a href="#/privacidade">Privacidade</a>.</span></p>` : ''}

      <ul class="grade-promos">
        ${ativas.map((p) => html`<li class="cartao promo-cartao">
          <div class="promo-cartao__topo">
            <span class="promo-cartao__valor">${p.tipo === 'percentual' ? `${p.valor}%` : moeda(p.valor)}<small>off</small></span>
            ${p.segmento === 'fidelidade' ? html`<span class="selo selo--info">${icone('estrela', 12)} Fidelidade</span>` : ''}
          </div>
          <h2>${p.titulo}</h2>
          <p>${p.descricao}</p>
          <ul class="regras">${regras(p).map((r) => html`<li>${r}</li>`)}</ul>
          <div class="promo-cartao__acoes">
            <code class="cupom">${p.cupom}</code>
            <button class="btn btn--primario btn--pequeno" data-aplicar="${p.cupom}">Aplicar na sacola</button>
          </div>
        </li>`)}
      </ul>

      ${encerradas.length ? html`<section class="secao">
        <h2>Encerradas</h2>
        <ul class="grade-promos">
          ${encerradas.map((p) => html`<li class="cartao promo-cartao promo-cartao--encerrada">
            <h3>${p.titulo}</h3><p>${p.descricao}</p><code class="cupom">${p.cupom}</code>
          </li>`)}
        </ul>
      </section>` : ''}
    </div>`;
  },
  montar(raiz, ctx) {
    const aoClicar = (e) => {
      const b = e.target.closest('[data-aplicar]');
      if (!b) return;
      if (!store.unidadeAtual('cliente') || !store.carrinho('cliente').itens.length) {
        aviso('Adicione itens à sacola antes de aplicar o cupom.', 'info');
        ctx.navegar('/cardapio');
        return;
      }
      const r = store.aplicarCupom(b.dataset.aplicar, 'cliente');
      if (r.ok) {
        aviso(`Cupom ${r.promocao.cupom} aplicado!`, 'sucesso');
        ctx.navegar('/sacola');
      } else aviso(r.erro, 'erro');
    };
    raiz.addEventListener('click', aoClicar);
    return () => raiz.removeEventListener('click', aoClicar);
  },
};
