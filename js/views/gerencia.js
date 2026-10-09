// Gerência da unidade e Matriz: indicadores, relatórios financeiros, estoque,
// campanhas (com público agregado/anonimizado) e trilha de auditoria.

import * as store from '../store.js';
import { html, icone, moeda, dataHora, aviso, dialogo, baixarArquivo } from '../ui.js';
import { UNIDADES, CATEGORIAS, METODOS_PAGAMENTO, PRODUTOS, PAPEIS } from '../data.js';
import { ESTADOS_VENDA, nomeCanal, mascararNome, mascararEmail, idade, faixaEtaria } from '../domain.js';
import { seloStatus } from './comum.js';
import { exigirPapel } from './equipe-entrar.js';

const filtros = { dias: 7, unidade: 'todas', regiao: 'todas' };
let abaAtual = 'visao';
let filtroAcao = 'todas';
let unidadeEstoque = null;

const ACOES = {
  PEDIDO_CANCELADO: 'Cancelamento de pedido',
  ESTOQUE_AJUSTADO: 'Ajuste de estoque',
  PRODUTO_PAUSADO: 'Produto pausado',
  PRODUTO_REATIVADO: 'Produto reativado',
  PROMOCAO_ALTERADA: 'Campanha alterada',
  DADOS_PESSOAIS_ACESSADOS: 'Acesso a dados pessoais',
  CONTA_EXCLUIDA: 'Exclusão de conta (LGPD)',
  LOGIN_EQUIPE: 'Login da equipe',
};

const ehAdmin = () => store.membroEquipe()?.papel === 'admin';

function inicioDoPeriodo() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (filtros.dias - 1));
  return d.getTime();
}

function unidadesNoEscopo() {
  const m = store.membroEquipe();
  if (!ehAdmin()) return UNIDADES.filter((u) => u.id === m.unidadeId);
  return UNIDADES.filter((u) => (filtros.regiao === 'todas' || u.regiao === filtros.regiao)
    && (filtros.unidade === 'todas' || u.id === filtros.unidade));
}

function pedidosNoEscopo() {
  const ids = new Set(unidadesNoEscopo().map((u) => u.id));
  const desde = inicioDoPeriodo();
  return store.todosPedidos().filter((p) => ids.has(p.unidadeId) && Date.parse(p.criadoEm) >= desde);
}

function agrupar(lista, chave, valor) {
  const m = new Map();
  lista.forEach((x) => {
    const k = chave(x);
    m.set(k, (m.get(k) || 0) + valor(x));
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// Barras horizontais com rótulo e valor em texto (legíveis por leitor de tela).
function barras(pares, formatar = (v) => v, rotulo = (k) => k) {
  const max = Math.max(1, ...pares.map(([, v]) => v));
  return html`<ul class="barras">
    ${pares.map(([k, v]) => html`<li>
      <span class="barras__rotulo">${rotulo(k)}</span>
      <span class="barras__trilho" aria-hidden="true"><span style="width:${Math.max(2, (v / max) * 100)}%"></span></span>
      <span class="barras__valor">${formatar(v)}</span>
    </li>`)}
  </ul>`;
}

function filtrosHtml() {
  const regioes = [...new Set(UNIDADES.map((u) => u.regiao))];
  return html`<form class="filtros" data-filtros>
    <label class="campo campo--inline"><span class="campo__rotulo">Período</span>
      <select name="dias">${[[1, 'Hoje'], [7, 'Últimos 7 dias'], [14, 'Últimos 14 dias']].map(([v, t]) => html`<option value="${v}" ${filtros.dias === v ? 'selected' : ''}>${t}</option>`)}</select>
    </label>
    ${ehAdmin() ? html`
      <label class="campo campo--inline"><span class="campo__rotulo">Região</span>
        <select name="regiao"><option value="todas">Todas</option>${regioes.map((r) => html`<option ${filtros.regiao === r ? 'selected' : ''}>${r}</option>`)}</select>
      </label>
      <label class="campo campo--inline"><span class="campo__rotulo">Unidade</span>
        <select name="unidade"><option value="todas">Todas</option>${UNIDADES.filter((u) => filtros.regiao === 'todas' || u.regiao === filtros.regiao).map((u) => html`<option value="${u.id}" ${filtros.unidade === u.id ? 'selected' : ''}>${u.nome}</option>`)}</select>
      </label>` : ''}
  </form>`;
}

function telaVisao() {
  const pedidos = pedidosNoEscopo();
  const vendas = pedidos.filter((p) => ESTADOS_VENDA.includes(p.status));
  const cancelados = pedidos.filter((p) => p.status === 'CANCELADO');
  const faturamento = vendas.reduce((s, p) => s + p.total, 0);
  const descontos = vendas.reduce((s, p) => s + (p.subtotal - p.total), 0);
  const ticket = vendas.length ? faturamento / vendas.length : 0;
  const taxaCanc = pedidos.length ? (cancelados.length / pedidos.length) * 100 : 0;

  const porUnidade = agrupar(vendas, (p) => p.unidadeId, (p) => p.total);
  const porRegiao = agrupar(vendas, (p) => store.unidadePorId(p.unidadeId).regiao, (p) => p.total);
  const porCanal = agrupar(vendas, (p) => p.canal, () => 1);
  const porMetodo = agrupar(vendas, (p) => p.pagamento.metodo, (p) => p.total);
  const itens = vendas.flatMap((p) => p.itens);
  const topProdutos = agrupar(itens, (i) => i.produtoId, (i) => i.qtd).slice(0, 6);
  const porDia = [];
  for (let d = filtros.dias - 1; d >= 0; d--) {
    const dia = new Date();
    dia.setDate(dia.getDate() - d);
    const chave = dia.toDateString();
    porDia.push([dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }), vendas.filter((p) => new Date(p.criadoEm).toDateString() === chave).reduce((s, p) => s + p.total, 0)]);
  }
  const recentes = pedidos.slice(0, 8);

  return html`
    <ul class="kpis">
      <li class="kpi"><span>Faturamento líquido</span><strong>${moeda(faturamento)}</strong></li>
      <li class="kpi"><span>Pedidos pagos</span><strong>${vendas.length}</strong></li>
      <li class="kpi"><span>Ticket médio</span><strong>${moeda(ticket)}</strong></li>
      <li class="kpi"><span>Descontos concedidos</span><strong>${moeda(descontos)}</strong></li>
      <li class="kpi ${taxaCanc > 5 ? 'kpi--alerta' : ''}"><span>Cancelamentos</span><strong>${cancelados.length} <small>(${taxaCanc.toFixed(1)}%)</small></strong></li>
    </ul>

    <div class="grade-paineis">
      ${filtros.dias > 1 ? html`<section class="cartao"><h2>Vendas por dia</h2>${barras(porDia, moeda)}</section>` : ''}
      ${ehAdmin() ? html`<section class="cartao"><h2>Vendas por unidade</h2>${barras(porUnidade, moeda, (id) => store.unidadePorId(id).nome)}</section>
        <section class="cartao"><h2>Vendas por região</h2>${barras(porRegiao, moeda)}</section>` : ''}
      <section class="cartao"><h2>Produtos mais vendidos</h2>${barras(topProdutos, (v) => `${v} un.`, (id) => PRODUTOS.find((p) => p.id === id)?.nome)}</section>
      <section class="cartao"><h2>Pedidos por canal</h2>${barras(porCanal, (v) => `${v} (${Math.round((v / Math.max(1, vendas.length)) * 100)}%)`, nomeCanal)}</section>
      <section class="cartao"><h2>Relatório financeiro por forma de pagamento</h2>${barras(porMetodo, moeda, (m) => METODOS_PAGAMENTO[m])}</section>
    </div>

    <section class="cartao">
      <div class="secao__topo">
        <h2>Últimos pedidos</h2>
        <button class="btn btn--secundario btn--pequeno" data-exportar>${icone('baixar', 16)} Exportar CSV (sem dados pessoais)</button>
      </div>
      <div class="tabela-rolagem"><table class="tabela">
        <thead><tr><th>Código</th><th>Data</th><th>Unidade</th><th>Canal</th><th>Total</th><th>Status</th><th>Cliente</th></tr></thead>
        <tbody>${recentes.map((p) => html`<tr>
          <td>${p.codigo}</td><td>${dataHora(p.criadoEm)}</td><td>${store.unidadePorId(p.unidadeId).nome}</td>
          <td>${nomeCanal(p.canal)}</td><td>${moeda(p.total)}</td><td>${seloStatus(p.status)}</td>
          <td>${p.clienteId ? html`<button class="link" data-ver-cliente="${p.id}">Ver dados</button>` : html`<span class="texto-suave">Não identificado</span>`}</td>
        </tr>`)}</tbody>
      </table></div>
      <p class="texto-suave texto-pequeno">${icone('escudo', 14)} Visualizar dados de um cliente gera registro na auditoria (LGPD: necessidade e rastreabilidade).</p>
    </section>`;
}

function telaEstoque() {
  const m = store.membroEquipe();
  const opcoes = ehAdmin() ? UNIDADES : UNIDADES.filter((u) => u.id === m.unidadeId);
  if (!unidadeEstoque || !opcoes.some((u) => u.id === unidadeEstoque)) unidadeEstoque = opcoes[0].id;
  const u = store.unidadePorId(unidadeEstoque);
  const menu = store.cardapio(u);
  return html`
    ${ehAdmin() ? html`<label class="campo campo--inline"><span class="campo__rotulo">Unidade</span>
      <select data-unidade-estoque>${opcoes.map((x) => html`<option value="${x.id}" ${x.id === unidadeEstoque ? 'selected' : ''}>${x.nome}</option>`)}</select></label>` : ''}
    <form class="cartao" data-estoque>
      <div class="secao__topo"><h2>Estoque · ${u.nome}</h2><button class="btn btn--primario btn--pequeno">Salvar ajustes</button></div>
      <p class="texto-suave">Itens que exigem cozinha completa não aparecem em unidades de formato compacto. Ajustes e pausas ficam registrados na auditoria.</p>
      <div class="tabela-rolagem"><table class="tabela">
        <thead><tr><th>Produto</th><th>Categoria</th><th>Situação</th><th>Quantidade</th><th>Venda</th></tr></thead>
        <tbody>${menu.map((p) => {
          const pausado = store.pausadosDaUnidade(u.id).includes(p.id);
          return html`<tr>
            <th scope="row">${p.emoji} ${p.nome}</th>
            <td>${CATEGORIAS.find((c) => c.id === p.categoria).nome}</td>
            <td>${p.disp.disponivel ? html`<span class="selo ${p.disp.ultimas ? 'selo--alerta' : 'selo--sucesso'}">${p.disp.ultimas ? 'Baixo' : 'Disponível'}</span>` : html`<span class="selo selo--erro">${p.disp.rotulo}</span>`}</td>
            <td><input class="input-qtd" type="number" min="0" max="999" name="${p.id}" value="${store.estoqueDaUnidade(u.id)[p.id] ?? 0}" aria-label="Quantidade de ${p.nome}"></td>
            <td><button type="button" class="btn btn--pequeno ${pausado ? 'btn--secundario' : 'btn--perigo-suave'}" data-pausa="${p.id}">${pausado ? 'Reativar' : 'Pausar'}</button></td>
          </tr>`;
        })}</tbody>
      </table></div>
    </form>`;
}

function telaCampanhas() {
  const usos = {};
  store.todosPedidos().forEach((p) => p.descontos?.forEach((d) => { if (d.codigo) usos[d.codigo] = (usos[d.codigo] || 0) + 1; }));
  const clientes = store.usuarios();
  const personalizacao = clientes.filter((c) => c.consentimentos?.personalizacao);
  const faixas = agrupar(personalizacao, (c) => faixaEtaria(idade(c.nascimento)), () => 1);
  const k = (n) => (n < 5 ? '< 5' : String(n)); // agregação mínima para evitar reidentificação
  return html`
    <section class="cartao">
      <h2>Campanhas</h2>
      ${!ehAdmin() ? html`<p class="texto-suave">Campanhas são definidas pela matriz. A unidade apenas acompanha os resultados.</p>` : ''}
      <div class="tabela-rolagem"><table class="tabela">
        <thead><tr><th>Cupom</th><th>Campanha</th><th>Público</th><th>Usos</th><th>Situação</th></tr></thead>
        <tbody>${store.promocoes().map((p) => html`<tr>
          <th scope="row"><code>${p.cupom}</code></th>
          <td>${p.titulo}</td>
          <td>${p.segmento === 'fidelidade' ? 'Fidelidade' : p.canais ? p.canais.map(nomeCanal).join(', ') : 'Todos'}${p.regioes ? ` · ${p.regioes.join(', ')}` : ''}</td>
          <td>${usos[p.cupom] || 0}</td>
          <td>${ehAdmin() ? html`<button class="btn btn--pequeno ${p.ativa ? 'btn--sucesso' : 'btn--secundario'}" data-promo="${p.id}" aria-pressed="${p.ativa}">${p.ativa ? 'Ativa' : 'Inativa'}</button>`
            : html`<span class="selo ${p.ativa ? 'selo--sucesso' : 'selo--neutro'}">${p.ativa ? 'Ativa' : 'Inativa'}</span>`}</td>
        </tr>`)}</tbody>
      </table></div>
    </section>
    <div class="grade-paineis">
      <section class="cartao">
        <h2>Público para campanhas segmentadas</h2>
        <p class="texto-suave">Somente clientes que consentiram com ofertas personalizadas. Dados agregados e anonimizados; grupos com menos de 5 pessoas não são exibidos.</p>
        <dl class="dados">
          <div><dt>Clientes com consentimento de personalização</dt><dd>${k(personalizacao.length)}</dd></div>
          <div><dt>Aceitam comunicações de marketing</dt><dd>${k(clientes.filter((c) => c.consentimentos?.comunicacoes).length)}</dd></div>
          <div><dt>Participam do programa de fidelidade</dt><dd>${k(clientes.filter((c) => c.consentimentos?.fidelidade).length)}</dd></div>
        </dl>
      </section>
      <section class="cartao">
        <h2>Faixa etária (com consentimento)</h2>
        ${barras(faixas.map(([f, n]) => [f, n]), k)}
      </section>
    </div>`;
}

function telaAuditoria() {
  const m = store.membroEquipe();
  const lista = store.auditoria()
    .filter((a) => ehAdmin() || a.unidadeId === m.unidadeId)
    .filter((a) => filtroAcao === 'todas' || a.acao === filtroAcao)
    .slice(0, 60);
  return html`<section class="cartao">
    <div class="secao__topo">
      <h2>Trilha de auditoria</h2>
      <label class="campo campo--inline"><span class="campo__rotulo">Ação</span>
        <select data-filtro-acao><option value="todas">Todas</option>${Object.entries(ACOES).map(([k, v]) => html`<option value="${k}" ${filtroAcao === k ? 'selected' : ''}>${v}</option>`)}</select>
      </label>
    </div>
    <p class="texto-suave">Registro imutável de operações sensíveis: cancelamentos, descontos, ajustes, alterações de campanha e acessos a dados pessoais.</p>
    <div class="tabela-rolagem"><table class="tabela">
      <thead><tr><th>Data/hora</th><th>Ação</th><th>Responsável</th><th>Unidade</th><th>Alvo</th><th>Detalhes</th></tr></thead>
      <tbody>${lista.map((a) => html`<tr>
        <td>${dataHora(a.em)}</td>
        <td><span class="selo ${a.acao === 'PEDIDO_CANCELADO' ? 'selo--erro' : a.acao === 'DADOS_PESSOAIS_ACESSADOS' ? 'selo--alerta' : 'selo--neutro'}">${ACOES[a.acao] || a.acao}</span></td>
        <td>${a.ator.nome}<br><small class="texto-suave">${PAPEIS[a.ator.papel] || a.ator.papel}</small></td>
        <td>${a.unidadeId ? store.unidadePorId(a.unidadeId)?.nome : 'Rede'}</td>
        <td>${a.alvo}</td>
        <td>${a.detalhes}</td>
      </tr>`)}
      ${!lista.length ? html`<tr><td colspan="6" class="texto-suave">Nenhum registro.</td></tr>` : ''}</tbody>
    </table></div>
  </section>`;
}

export default {
  titulo: () => (ehAdmin() ? 'Matriz' : 'Gerência'),
  layout: 'equipe',
  // Na aba de estoque não re-renderizamos sozinhos para não perder quantidades digitadas.
  aoVivo: () => abaAtual !== 'estoque',
  guarda: exigirPapel('gerente', 'admin'),
  render() {
    const m = store.membroEquipe();
    const abas = [['visao', 'Visão geral'], ['estoque', 'Estoque'], ['campanhas', 'Campanhas'], ['auditoria', 'Auditoria']];
    return html`<div class="pagina pagina--larga">
      <header class="pagina__topo pagina__topo--linha">
        <h1>${icone('grafico', 24)} ${ehAdmin() ? 'Matriz · visão da rede' : `Gerência · ${store.unidadePorId(m.unidadeId).nome}`}</h1>
      </header>
      <div class="abas" role="tablist">
        ${abas.map(([id, rot]) => html`<button role="tab" class="aba ${abaAtual === id ? 'aba--ativa' : ''}" aria-selected="${abaAtual === id}" data-aba="${id}">${rot}</button>`)}
      </div>
      ${abaAtual === 'visao' ? html`${filtrosHtml()}${telaVisao()}` : ''}
      ${abaAtual === 'estoque' ? telaEstoque() : ''}
      ${abaAtual === 'campanhas' ? telaCampanhas() : ''}
      ${abaAtual === 'auditoria' ? telaAuditoria() : ''}
    </div>`;
  },
  montar(raiz, ctx) {
    const m = store.membroEquipe();
    const aoClicar = async (e) => {
      const t = e.target;
      const aba = t.closest('[data-aba]');
      if (aba) { abaAtual = aba.dataset.aba; ctx.rerender(); return; }
      const promo = t.closest('[data-promo]');
      if (promo) { store.alternarPromocao(promo.dataset.promo, m); return; }
      const pausa = t.closest('[data-pausa]');
      if (pausa) { store.alternarPausa(unidadeEstoque, pausa.dataset.pausa, m); ctx.rerender(); return; }
      if (t.closest('[data-exportar]')) {
        const linhas = [['codigo', 'data', 'unidade', 'regiao', 'canal', 'status', 'pagamento', 'subtotal', 'descontos', 'total']];
        pedidosNoEscopo().forEach((p) => {
          const u = store.unidadePorId(p.unidadeId);
          linhas.push([p.codigo, p.criadoEm, u.nome, u.regiao, nomeCanal(p.canal), p.status, METODOS_PAGAMENTO[p.pagamento.metodo],
            p.subtotal.toFixed(2), (p.subtotal - p.total).toFixed(2), p.total.toFixed(2)]);
        });
        const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
        baixarArquivo(`relatorio-vendas-${new Date().toISOString().slice(0, 10)}.csv`, `﻿${csv}`, 'text/csv');
        return;
      }
      const ver = t.closest('[data-ver-cliente]');
      if (ver) {
        const p = store.pedidoPorId(ver.dataset.verCliente);
        const c = store.usuarios().find((u) => u.id === p.clienteId);
        if (!c) { aviso('Cliente não encontrado (conta excluída).', 'info'); return; }
        const ok = await dialogo({
          titulo: 'Acessar dados pessoais?',
          corpo: 'Este acesso será registrado na auditoria com seu nome, data e hora. Prossiga apenas se for necessário para atender o cliente.',
          confirmar: 'Acessar e registrar',
        });
        if (!ok) return;
        store.registrarAcessoDados(m, p.codigo, `Visualizou dados do cliente do pedido ${p.codigo}`);
        await dialogo({
          titulo: `Cliente do pedido ${p.codigo}`,
          corpo: html`<dl class="dados">
            <div><dt>Nome</dt><dd>${mascararNome(c.nome)}</dd></div>
            <div><dt>E-mail</dt><dd>${mascararEmail(c.email)}</dd></div>
            <div><dt>Telefone</dt><dd>${c.telefone ? `${c.telefone.slice(0, 5)}****-${c.telefone.slice(-2)}` : '—'}</dd></div>
            <div><dt>Programa de fidelidade</dt><dd>${c.consentimentos.fidelidade ? 'Participa' : 'Não participa'}</dd></div>
          </dl><p class="texto-suave texto-pequeno">Dados exibidos parcialmente (minimização).</p>`,
          confirmar: 'Fechar', cancelar: null,
        });
      }
    };
    const aoMudar = (e) => {
      const t = e.target;
      if (t.closest('[data-filtros]')) {
        if (t.name === 'dias') filtros.dias = Number(t.value);
        if (t.name === 'regiao') { filtros.regiao = t.value; filtros.unidade = 'todas'; }
        if (t.name === 'unidade') filtros.unidade = t.value;
        ctx.rerender();
      }
      if (t.matches('[data-unidade-estoque]')) { unidadeEstoque = t.value; ctx.rerender(); }
      if (t.matches('[data-filtro-acao]')) { filtroAcao = t.value; ctx.rerender(); }
    };
    const aoEnviar = async (e) => {
      if (!e.target.matches('[data-estoque]')) return;
      e.preventDefault();
      const est = store.estoqueDaUnidade(unidadeEstoque);
      const mudancas = [...e.target.querySelectorAll('.input-qtd')].filter((i) => Number(i.value) !== (est[i.name] ?? 0));
      if (!mudancas.length) { aviso('Nenhuma quantidade foi alterada.', 'info'); return; }
      if (mudancas.some((i) => i.value === '' || Number(i.value) < 0)) { aviso('Quantidades devem ser números maiores ou iguais a zero.', 'erro'); return; }
      const r = await dialogo({
        titulo: `Confirmar ${mudancas.length} ajuste(s) de estoque`,
        corpo: html`<label class="campo"><span class="campo__rotulo">Motivo (fica na auditoria)</span>
          <select name="motivo"><option>Recebimento de mercadoria</option><option>Contagem/inventário</option><option>Perda ou descarte</option><option>Correção de lançamento</option></select></label>`,
        confirmar: 'Salvar ajustes',
      });
      if (!r) return;
      mudancas.forEach((i) => store.ajustarEstoque(unidadeEstoque, i.name, i.value, m, r.motivo));
      aviso('Estoque atualizado.', 'sucesso');
      ctx.rerender();
    };
    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('change', aoMudar);
    raiz.addEventListener('submit', aoEnviar);
    return () => {
      raiz.removeEventListener('click', aoClicar);
      raiz.removeEventListener('change', aoMudar);
      raiz.removeEventListener('submit', aoEnviar);
    };
  },
};
