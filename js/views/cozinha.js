// Painel da cozinha (KDS): fila de produção por status, com tempo de espera e observações.

import * as store from '../store.js';
import { html, icone, hora, aviso } from '../ui.js';
import { nomeCanal } from '../domain.js';
import { exigirPapel } from './equipe-entrar.js';

const minutos = (iso) => Math.floor((Date.now() - Date.parse(iso)) / 60000);

function tempoDesde(p, status) {
  const h = [...p.historico].reverse().find((x) => x.status === status);
  return h ? h.em : p.criadoEm;
}

function cartao(p, coluna) {
  const desde = tempoDesde(p, p.status);
  const espera = minutos(tempoDesde(p, 'CONFIRMADO'));
  const sla = espera >= 15 ? 'atrasado' : espera >= 10 ? 'atencao' : 'ok';
  return html`<li class="kds-cartao kds-cartao--${sla}">
    <header>
      <strong class="kds-cartao__codigo">${p.codigo}</strong>
      <span class="kds-cartao__tempo" title="Tempo desde a confirmação">${icone('relogio', 14)} ${espera} min</span>
    </header>
    <p class="kds-cartao__meta">${nomeCanal(p.canal)} · ${p.retirada.tipo === 'local' ? 'Comer aqui' : 'Para levar'}${p.nomeChamada ? ` · ${p.nomeChamada}` : ''}</p>
    ${p.retirada.horario ? html`<p class="selo selo--info">Agendado: ${hora(p.retirada.horario)}</p>` : ''}
    <ul class="kds-cartao__itens">
      ${p.itens.map((i) => html`<li><strong>${i.qtd}×</strong> ${i.nome}${i.obs ? html`<em class="kds-obs">⚠ ${i.obs}</em>` : ''}</li>`)}
    </ul>
    ${coluna === 'CONFIRMADO' ? html`<button class="btn btn--primario btn--bloco" data-mover="${p.id}" data-para="EM_PREPARO">${icone('fogo', 18)} Iniciar preparo</button>` : ''}
    ${coluna === 'EM_PREPARO' ? html`<button class="btn btn--sucesso btn--bloco" data-mover="${p.id}" data-para="PRONTO">${icone('check', 18)} Pronto</button>` : ''}
    ${coluna === 'PRONTO' ? html`<p class="texto-suave texto-pequeno">Pronto às ${hora(desde)} · aguardando retirada</p>` : ''}
  </li>`;
}

export default {
  titulo: 'Cozinha',
  layout: 'equipe',
  aoVivo: true,
  guarda: exigirPapel('cozinha', 'gerente'),
  render() {
    const u = store.unidadeAtual('balcao');
    const agora = Date.now();
    const todos = store.pedidosDaUnidade(u.id, ['CONFIRMADO', 'EM_PREPARO', 'PRONTO']);
    const futuro = (p) => p.status === 'CONFIRMADO' && p.retirada.horario && Date.parse(p.retirada.horario) - 15 * 60e3 > agora;
    const agendados = todos.filter(futuro);
    const ordem = (a, b) => Date.parse(tempoDesde(a, 'CONFIRMADO')) - Date.parse(tempoDesde(b, 'CONFIRMADO'));
    const colunas = [
      ['CONFIRMADO', 'Novos', todos.filter((p) => p.status === 'CONFIRMADO' && !futuro(p)).sort(ordem)],
      ['EM_PREPARO', 'Em preparo', todos.filter((p) => p.status === 'EM_PREPARO').sort(ordem)],
      ['PRONTO', 'Prontos', todos.filter((p) => p.status === 'PRONTO').sort(ordem)],
    ];
    const auto = store.demo().cozinhaAutomatica;
    return html`<div class="pagina pagina--larga">
      <header class="pagina__topo pagina__topo--linha">
        <h1>${icone('fogo', 24)} Cozinha · ${u.nome}</h1>
        <span class="legenda-sla"><span class="sla sla--ok"></span>até 10 min <span class="sla sla--atencao"></span>10–15 min <span class="sla sla--atrasado"></span>+15 min</span>
      </header>
      ${auto ? html`<p class="caixa-demo">${icone('info', 16)} A simulação automática da cozinha está ativa (Painel de demonstração, no rodapé do site). Os pedidos avançam sozinhos, mas você também pode movê-los.</p>` : ''}
      <div class="kds">
        ${colunas.map(([status, titulo, lista]) => html`<section class="kds__coluna" aria-label="${titulo}">
          <h2>${titulo} <span class="contador-coluna">${lista.length}</span></h2>
          <ul>${lista.length ? lista.map((p) => cartao(p, status)) : html`<li class="texto-suave kds-vazio">Nenhum pedido</li>`}</ul>
        </section>`)}
      </div>
      ${agendados.length ? html`<section class="secao">
        <h2>Agendados (o preparo começa 15 min antes)</h2>
        <ul class="lista-compacta">${agendados.map((p) => html`<li><strong>${p.codigo}</strong> · retirada ${hora(p.retirada.horario)} · ${p.itens.reduce((s, i) => s + i.qtd, 0)} itens</li>`)}</ul>
      </section>` : ''}
    </div>`;
  },
  montar(raiz, ctx) {
    const membro = store.membroEquipe();
    const aoClicar = (e) => {
      const b = e.target.closest('[data-mover]');
      if (!b) return;
      const r = store.avancarPedido(b.dataset.mover, b.dataset.para, membro);
      if (!r.ok) aviso(r.erro, 'erro');
    };
    raiz.addEventListener('click', aoClicar);
    const relogio = setInterval(() => ctx.rerender(), 30e3);
    return () => {
      clearInterval(relogio);
      raiz.removeEventListener('click', aoClicar);
    };
  },
};
