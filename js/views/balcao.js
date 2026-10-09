// Canal Balcão (atendente): registro de pedidos no caixa, fila de retirada e cancelamentos auditados.

import * as store from '../store.js';
import { html, icone, moeda, hora, aviso, dialogo, tempoDecorrido } from '../ui.js';
import { CATEGORIAS, METODOS_PAGAMENTO } from '../data.js';
import { ESTADOS_ATIVOS, mascararNome, nomeCanal, formatarCPF, podeTransitar } from '../domain.js';
import { seloStatus, linhaTotais } from './comum.js';
import { exigirPapel } from './equipe-entrar.js';

let abaAtual = 'novo';
const pos = { categoria: 'todas', tipo: 'local', nome: '', metodo: 'cartao_balcao', recebido: '' };

function abas() {
  const fila = store.pedidosDaUnidade(store.membroEquipe().unidadeId, ['PRONTO']).length;
  const itens = [['novo', 'Novo pedido'], ['fila', `Retirada${fila ? ` (${fila})` : ''}`], ['pedidos', 'Pedidos do dia']];
  return html`<div class="abas" role="tablist">
    ${itens.map(([id, rot]) => html`<button role="tab" class="aba ${abaAtual === id ? 'aba--ativa' : ''}" aria-selected="${abaAtual === id}" data-aba="${id}">${rot}</button>`)}
  </div>`;
}

function telaNovo(u) {
  const menu = store.cardapio(u).filter((p) => pos.categoria === 'todas' || p.categoria === pos.categoria);
  const r = store.resumoCarrinho('balcao');
  const troco = pos.metodo === 'dinheiro' && Number(pos.recebido) >= r.totais.total ? Number(pos.recebido) - r.totais.total : null;
  return html`<div class="pdv">
    <section class="pdv__produtos">
      <div class="chips">
        <button class="chip ${pos.categoria === 'todas' ? 'chip--ativo' : ''}" data-cat="todas">Todos</button>
        ${CATEGORIAS.map((c) => html`<button class="chip ${pos.categoria === c.id ? 'chip--ativo' : ''}" data-cat="${c.id}">${c.nome}</button>`)}
      </div>
      <ul class="pdv__grade">
        ${menu.map((p) => html`<li><button class="pdv__item" data-add="${p.id}" ${p.disp.disponivel ? '' : 'disabled'}>
          <span aria-hidden="true">${p.emoji}</span>
          <strong>${p.nome}</strong>
          <span>${moeda(p.preco)}</span>
          <small>${p.disp.disponivel ? `Estoque: ${p.disp.quantidade}` : p.disp.rotulo}</small>
        </button></li>`)}
      </ul>
    </section>

    <section class="pdv__ticket cartao" aria-label="Pedido em registro">
      <h2>Pedido no balcão</h2>
      ${r.itens.length ? html`<ul class="linhas-sacola linhas-sacola--compacta">
        ${r.itens.map((i) => html`<li class="linha-sacola">
          <div class="linha-sacola__info"><strong>${i.nome}</strong><span class="linha-sacola__preco">${moeda(i.preco * i.qtd)}</span></div>
          <div class="contador-qtd">
            <button class="btn-icone" data-qtd="${i.linhaId}" data-delta="-1" aria-label="Diminuir ${i.nome}">${icone('menos', 16)}</button>
            <span>${i.qtd}</span>
            <button class="btn-icone" data-qtd="${i.linhaId}" data-delta="1" aria-label="Aumentar ${i.nome}">${icone('mais', 16)}</button>
          </div>
        </li>`)}
      </ul>` : html`<p class="texto-suave">Toque nos produtos para adicionar.</p>`}

      <fieldset class="opcoes-linha">
        <legend class="campo__rotulo">Consumo</legend>
        <label><input type="radio" name="tipo" value="local" ${pos.tipo === 'local' ? 'checked' : ''}> Comer aqui</label>
        <label><input type="radio" name="tipo" value="retirada" ${pos.tipo === 'retirada' ? 'checked' : ''}> Para levar</label>
      </fieldset>
      <label class="campo"><span class="campo__rotulo">Nome para chamada</span><input name="nome" value="${pos.nome}" maxlength="20" autocomplete="off"></label>

      <div class="campo">
        <span class="campo__rotulo">Programa Raízes (opcional)</span>
        ${r.cliente ? html`<p class="caixa-sucesso">${icone('estrela', 16)} ${mascararNome(r.cliente.nome)} vai pontuar. <button class="link" data-remover-id>Remover</button></p>`
          : html`<div class="campo__linha"><input name="cpf" inputmode="numeric" placeholder="CPF do cliente" autocomplete="off" aria-label="CPF do cliente"><button class="btn btn--secundario btn--pequeno" data-identificar>Identificar</button></div>
            <small class="campo__ajuda">Peça o CPF apenas se o cliente quiser pontuar. Não anote em papel.</small>`}
      </div>

      <fieldset class="opcoes-linha">
        <legend class="campo__rotulo">Pagamento no caixa</legend>
        ${['cartao_balcao', 'pix_balcao', 'dinheiro'].map((m) => html`<label><input type="radio" name="metodo" value="${m}" ${pos.metodo === m ? 'checked' : ''}> ${METODOS_PAGAMENTO[m]}</label>`)}
      </fieldset>
      ${pos.metodo === 'dinheiro' ? html`<label class="campo"><span class="campo__rotulo">Valor recebido</span>
        <input name="recebido" type="number" min="0" step="0.01" inputmode="decimal" value="${pos.recebido}">
        <small class="texto-sucesso" data-troco aria-live="polite">${troco != null ? `Troco: ${moeda(troco)}` : ''}</small></label>` : ''}

      ${linhaTotais(r.totais)}
      <button class="btn btn--primario btn--bloco btn--grande" data-finalizar ${r.itens.length ? '' : 'disabled'}>Registrar e receber ${moeda(r.totais.total)}</button>
      ${r.itens.length ? html`<button class="link" data-limpar>Limpar pedido</button>` : ''}
    </section>
  </div>`;
}

function telaFila(u) {
  const prontos = store.pedidosDaUnidade(u.id, ['PRONTO']);
  const preparo = store.pedidosDaUnidade(u.id, ['CONFIRMADO', 'EM_PREPARO']);
  return html`
    <section class="secao">
      <h2>Prontos para entregar</h2>
      ${prontos.length ? html`<ul class="grade-fila">
        ${prontos.map((p) => html`<li class="cartao fila-cartao fila-cartao--pronto">
          <strong class="codigo-grande">${p.codigo}</strong>
          <span>${p.nomeChamada || 'Sem nome'} · ${p.retirada.tipo === 'local' ? 'Comer aqui' : 'Para levar'}</span>
          <small>${p.itens.map((i) => `${i.qtd}× ${i.nome}`).join(', ')}</small>
          <button class="btn btn--primario" data-entregar="${p.id}">${icone('check', 18)} Entregue</button>
        </li>`)}
      </ul>` : html`<p class="texto-suave">Nenhum pedido aguardando retirada.</p>`}
    </section>
    <section class="secao">
      <h2>Na cozinha</h2>
      <ul class="lista-compacta">
        ${preparo.map((p) => html`<li><strong>${p.codigo}</strong> ${seloStatus(p.status)} <span class="texto-suave">${nomeCanal(p.canal)} · ${tempoDecorrido(p.criadoEm)}</span></li>`)}
        ${!preparo.length ? html`<li class="texto-suave">Nada em preparo agora.</li>` : ''}
      </ul>
    </section>`;
}

function telaPedidos(u) {
  const hoje = new Date().toDateString();
  const lista = store.pedidosDaUnidade(u.id).filter((p) => new Date(p.criadoEm).toDateString() === hoje);
  return html`<div class="tabela-rolagem"><table class="tabela">
    <thead><tr><th>Código</th><th>Hora</th><th>Canal</th><th>Cliente</th><th>Total</th><th>Status</th><th><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>
      ${lista.map((p) => html`<tr>
        <td><strong>${p.codigo}</strong></td>
        <td>${hora(p.criadoEm)}</td>
        <td>${nomeCanal(p.canal)}</td>
        <td>${p.nomeChamada ? mascararNome(p.nomeChamada) : '—'}</td>
        <td>${moeda(p.total)}</td>
        <td>${seloStatus(p.status)}</td>
        <td>${podeTransitar(p.status, 'CANCELADO') ? html`<button class="btn btn--perigo-suave btn--pequeno" data-cancelar="${p.id}">Cancelar</button>` : ''}</td>
      </tr>`)}
      ${!lista.length ? html`<tr><td colspan="7" class="texto-suave">Nenhum pedido hoje.</td></tr>` : ''}
    </tbody>
  </table></div>`;
}

export default {
  titulo: 'Balcão',
  layout: 'equipe',
  aoVivo: true,
  guarda: exigirPapel('atendente', 'gerente'),
  render() {
    const u = store.unidadeAtual('balcao');
    return html`<div class="pagina pagina--larga">
      <header class="pagina__topo pagina__topo--linha">
        <h1>${icone('caixa', 24)} Balcão · ${u.nome}</h1>
        <span class="texto-suave">${store.pedidosDaUnidade(u.id, ESTADOS_ATIVOS).length} pedidos ativos</span>
      </header>
      ${abas()}
      ${abaAtual === 'novo' ? telaNovo(u) : abaAtual === 'fila' ? telaFila(u) : telaPedidos(u)}
    </div>`;
  },
  montar(raiz, ctx) {
    const membro = store.membroEquipe();
    const aoClicar = async (e) => {
      const t = e.target;
      const aba = t.closest('[data-aba]');
      if (aba) { abaAtual = aba.dataset.aba; ctx.rerender(); return; }
      const cat = t.closest('[data-cat]');
      if (cat) { pos.categoria = cat.dataset.cat; ctx.rerender(); return; }
      const add = t.closest('[data-add]');
      if (add) {
        const r = store.adicionarAoCarrinho(add.dataset.add, 1, '', 'balcao');
        if (!r.ok) aviso(r.erro, 'erro');
        return;
      }
      const q = t.closest('[data-qtd]');
      if (q) {
        const linha = store.carrinho('balcao').itens.find((i) => i.id === q.dataset.qtd);
        const r = store.alterarQuantidade(linha.id, linha.qtd + Number(q.dataset.delta), 'balcao');
        if (!r.ok && r.erro) aviso(r.erro, 'erro');
        return;
      }
      if (t.closest('[data-limpar]')) { store.limparCarrinho('balcao'); return; }
      if (t.closest('[data-identificar]')) {
        const cpf = raiz.querySelector('[name="cpf"]').value;
        const r = store.identificarCliente(cpf, 'balcao');
        aviso(r.ok ? `Cliente identificado: ${r.primeiroNome}.` : r.erro, r.ok ? 'sucesso' : 'erro');
        return;
      }
      if (t.closest('[data-remover-id]')) { store.removerIdentificacao('balcao'); return; }
      if (t.closest('[data-finalizar]')) {
        const total = store.resumoCarrinho('balcao').totais.total;
        if (pos.metodo === 'dinheiro' && !(Number(pos.recebido) >= total)) {
          aviso(`Informe um valor recebido igual ou maior que ${moeda(total)}.`, 'erro');
          raiz.querySelector('[name="recebido"]')?.focus();
          return;
        }
        const r = store.criarPedido('balcao', { retirada: { tipo: pos.tipo }, metodo: pos.metodo, nomeChamada: pos.nome });
        if (!r.ok) { aviso(r.erro, 'erro'); return; }
        store.confirmarPagamentoCaixa(r.pedido.id);
        aviso(`Pedido ${r.pedido.codigo} registrado e enviado à cozinha.`, 'sucesso');
        Object.assign(pos, { nome: '', recebido: '', tipo: 'local' });
        ctx.rerender();
        return;
      }
      const ent = t.closest('[data-entregar]');
      if (ent) {
        const r = store.avancarPedido(ent.dataset.entregar, 'ENTREGUE', membro);
        if (r.ok) aviso(`${r.pedido.codigo} entregue.`, 'sucesso');
        return;
      }
      const canc = t.closest('[data-cancelar]');
      if (canc) {
        const p = store.pedidoPorId(canc.dataset.cancelar);
        const r = await dialogo({
          titulo: `Cancelar ${p.codigo}?`,
          corpo: html`<p>O cancelamento fica registrado na auditoria com seu nome. ${p.pagamento.status === 'aprovado' ? 'O pagamento será estornado.' : ''}</p>
            <label class="campo"><span class="campo__rotulo">Motivo (obrigatório)</span>
              <textarea name="motivo" required minlength="5" maxlength="140" rows="2"></textarea></label>`,
          confirmar: 'Cancelar pedido', cancelar: 'Voltar', perigo: true,
        });
        if (!r) return;
        const res = await store.cancelarPedido(p.id, { motivo: r.motivo.trim(), ator: membro });
        aviso(res.ok ? `${p.codigo} cancelado.` : res.erro, res.ok ? 'info' : 'erro');
      }
    };
    const aoMudar = (e) => {
      const { name, value } = e.target;
      if (['tipo', 'metodo'].includes(name)) {
        pos[name] = value;
        if (name === 'metodo') ctx.rerender();
      }
    };
    const aoDigitar = (e) => {
      const { name } = e.target;
      if (name === 'nome') pos.nome = e.target.value;
      if (name === 'recebido') {
        pos.recebido = e.target.value;
        const total = store.resumoCarrinho('balcao').totais.total;
        const recebido = Number(pos.recebido);
        const el = raiz.querySelector('[data-troco]');
        if (el) el.textContent = recebido >= total && total > 0 ? `Troco: ${moeda(recebido - total)}` : '';
      }
      if (name === 'cpf') e.target.value = formatarCPF(e.target.value);
    };
    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('change', aoMudar);
    raiz.addEventListener('input', aoDigitar);
    return () => {
      raiz.removeEventListener('click', aoClicar);
      raiz.removeEventListener('change', aoMudar);
      raiz.removeEventListener('input', aoDigitar);
    };
  },
};
