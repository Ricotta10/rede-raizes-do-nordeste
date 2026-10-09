// Componentes de interface compartilhados entre as telas.

import * as store from '../store.js';
import { html, icone, moeda, hora, aviso, dialogo } from '../ui.js';
import { ESTADOS_PEDIDO, unidadeAberta } from '../domain.js';
import { FORMATOS } from '../data.js';

export function seloStatus(status) {
  const e = ESTADOS_PEDIDO[status];
  return html`<span class="selo selo--${e.tom}">${e.rotulo}</span>`;
}

export function statusUnidade(u) {
  const aberta = unidadeAberta(u);
  return html`<span class="status-unidade ${aberta ? 'status-unidade--aberta' : 'status-unidade--fechada'}">
    <span class="ponto" aria-hidden="true"></span>${aberta ? `Aberta · fecha às ${u.fecha}` : `Fechada · abre às ${u.abre}`}
  </span>`;
}

export function resumoUnidade(u) {
  return html`<div class="resumo-unidade">
    <div>
      <strong>${u.nome}</strong>
      <small>${u.endereco}</small>
    </div>
    <div class="resumo-unidade__selos">
      ${statusUnidade(u)}
      <span class="selo selo--neutro">${FORMATOS[u.formato]}</span>
    </div>
  </div>`;
}

export function linhaTotais(totais, { pontos = null } = {}) {
  return html`<dl class="totais">
    <div><dt>Subtotal</dt><dd>${moeda(totais.subtotal)}</dd></div>
    ${totais.descontos.map((d) => html`<div class="totais__desconto"><dt>${d.descricao}</dt><dd>− ${moeda(d.valor)}</dd></div>`)}
    <div class="totais__total"><dt>Total</dt><dd>${moeda(totais.total)}</dd></div>
    ${pontos != null ? html`<div class="totais__pontos"><dt>${icone('estrela', 14)} Pontos de fidelidade</dt><dd>+${pontos}</dd></div>` : ''}
  </dl>`;
}

export function itensPedido(itens) {
  return html`<ul class="lista-itens">
    ${itens.map((i) => html`<li>
      <span class="lista-itens__qtd">${i.qtd}×</span>
      <span class="lista-itens__nome">${i.nome}${i.obs ? html`<small>Obs.: ${i.obs}</small>` : ''}</span>
      <span class="lista-itens__preco">${moeda(i.preco * i.qtd)}</span>
    </li>`)}
  </ul>`;
}

export function vazio({ icone: ic = 'info', titulo, texto = '', acao = null }) {
  return html`<div class="vazio">
    <span class="vazio__icone">${icone(ic, 36)}</span>
    <h2>${titulo}</h2>
    ${texto ? html`<p>${texto}</p>` : ''}
    ${acao ? html`<a class="btn btn--primario" href="${acao.href}">${acao.rotulo}</a>` : ''}
  </div>`;
}

export function horarioRetirada(pedido) {
  if (!pedido.retirada?.horario) return 'O quanto antes';
  const d = new Date(pedido.retirada.horario);
  const hoje = new Date().toDateString() === d.toDateString();
  return `${hoje ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${hora(pedido.retirada.horario)}`;
}

// Diálogo de detalhes do produto (quantidade + observação) usado no cardápio e no totem.
export async function abrirProduto(produto, ctx) {
  const r = await dialogo({
    titulo: produto.nome,
    confirmar: 'Adicionar à sacola',
    classe: 'dialogo--produto',
    corpo: html`
      <div class="produto-detalhe">
        <span class="produto-detalhe__emoji" aria-hidden="true">${produto.emoji}</span>
        <p>${produto.descricao}</p>
        ${produto.variacaoRegional ? html`<p class="selo selo--info">Receita regional (${produto.variacaoRegional})</p>` : ''}
        <p class="produto-detalhe__preco">${moeda(produto.preco)}</p>
        ${produto.disp.ultimas ? html`<p class="texto-alerta">${icone('alerta', 16)} Últimas ${produto.disp.quantidade} unidades nesta loja.</p>` : ''}
      </div>
      <label class="campo">
        <span class="campo__rotulo">Quantidade</span>
        <input type="number" name="qtd" min="1" max="${Math.min(20, produto.disp.quantidade)}" value="1" required inputmode="numeric">
      </label>
      <label class="campo">
        <span class="campo__rotulo">Observação para a cozinha <small>(opcional)</small></span>
        <textarea name="obs" maxlength="140" rows="2" placeholder="Ex.: sem cebola, bem passado"></textarea>
        <small class="campo__ajuda">Não escreva dados pessoais aqui.</small>
      </label>`,
  });
  if (!r) return false;
  const qtd = Math.max(1, Math.min(20, parseInt(r.qtd, 10) || 1));
  const res = store.adicionarAoCarrinho(produto.id, qtd, r.obs, ctx);
  if (res.ok) aviso(`${qtd}× ${produto.nome} na sacola.`, 'sucesso');
  else aviso(res.erro, 'erro');
  return res.ok;
}

// Confirmação ao trocar de unidade com itens na sacola (cardápio e estoque são por unidade).
export async function confirmarTrocaUnidade(novaId) {
  const c = store.carrinho('cliente');
  if (c.itens.length && c.unidadeId && c.unidadeId !== novaId) {
    const ok = await dialogo({
      titulo: 'Trocar de unidade?',
      corpo: 'O cardápio, os preços e o estoque são de cada unidade. Ao trocar, sua sacola atual será esvaziada.',
      confirmar: 'Trocar e esvaziar sacola',
      perigo: true,
    });
    if (!ok) return false;
  }
  store.selecionarUnidade(novaId);
  return true;
}
