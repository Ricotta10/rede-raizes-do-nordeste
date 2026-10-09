// Ponto de entrada: roteamento por hash (compatível com GitHub Pages),
// layouts por canal (cliente, totem e equipe) e componentes globais.

import * as store from './store.js';
import { html, icone, aviso, dialogo } from './ui.js';
import { nomeCanal } from './domain.js';
import { PAPEIS } from './data.js';

import inicio from './views/inicio.js';
import unidades from './views/unidades.js';
import cardapio from './views/cardapio.js';
import sacola from './views/sacola.js';
import checkout from './views/checkout.js';
import pagamento from './views/pagamento.js';
import pedido from './views/pedido.js';
import pedidos from './views/pedidos.js';
import entrar from './views/entrar.js';
import cadastro from './views/cadastro.js';
import fidelidade from './views/fidelidade.js';
import promocoes from './views/promocoes.js';
import conta from './views/conta.js';
import privacidade from './views/privacidade.js';
import politica from './views/politica.js';
import totem from './views/totem.js';
import equipeEntrar from './views/equipe-entrar.js';
import balcao from './views/balcao.js';
import cozinha from './views/cozinha.js';
import gerencia from './views/gerencia.js';
import naoEncontrado from './views/nao-encontrado.js';

const ROTAS = [
  ['/', inicio],
  ['/unidades', unidades],
  ['/cardapio', cardapio],
  ['/sacola', sacola],
  ['/checkout', checkout],
  ['/pagamento/:id', pagamento],
  ['/pedido/:id', pedido],
  ['/pedidos', pedidos],
  ['/entrar', entrar],
  ['/cadastro', cadastro],
  ['/fidelidade', fidelidade],
  ['/promocoes', promocoes],
  ['/conta', conta],
  ['/privacidade', privacidade],
  ['/politica-de-privacidade', politica],
  ['/totem', totem],
  ['/equipe', equipeEntrar],
  ['/equipe/balcao', balcao],
  ['/equipe/cozinha', cozinha],
  ['/equipe/gerencia', gerencia],
].map(([padrao, view]) => {
  const nomes = [];
  const re = new RegExp(`^${padrao.replace(/:(\w+)/g, (_, n) => { nomes.push(n); return '([^/]+)'; })}/?$`);
  return { re, nomes, view };
});

const $ = (s) => document.querySelector(s);
let limpezaAtual = null;
let viewAtual = null;
let hashAnterior = null;

function lerHash() {
  const h = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
  const [caminho, qs = ''] = h.split('?');
  return { caminho, query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function navegar(destino, { substituir = false } = {}) {
  const alvo = `#${destino}`;
  if (location.hash === alvo) {
    renderizar();
    return;
  }
  if (substituir) location.replace(alvo);
  else location.hash = destino;
}

function casar(caminho) {
  for (const r of ROTAS) {
    const m = caminho.match(r.re);
    if (m) return { view: r.view, params: Object.fromEntries(r.nomes.map((n, i) => [n, decodeURIComponent(m[i + 1])])) };
  }
  return { view: naoEncontrado, params: {} };
}

function contexto() {
  const { caminho, query } = lerHash();
  const { view, params } = casar(caminho);
  return { view, caminho, params, query, navegar, rerender: () => renderizar({ manter: true }) };
}

function renderizar({ manter = false } = {}) {
  const ctx = contexto();
  const { view } = ctx;

  // No modo totem, apenas as telas do fluxo de autoatendimento ficam acessíveis.
  if (store.modoTotem() && !['/totem', '/cardapio', '/sacola', '/checkout', '/politica-de-privacidade'].includes(ctx.caminho)
    && !/^\/(pagamento|pedido)\//.test(ctx.caminho)) {
    navegar('/totem', { substituir: true });
    return;
  }

  const destino = view.guarda?.(ctx);
  if (destino) {
    navegar(destino, { substituir: true });
    return;
  }

  if (limpezaAtual) {
    try { limpezaAtual(); } catch (e) { console.error(e); }
    limpezaAtual = null;
  }

  const layout = typeof view.layout === 'function' ? view.layout(ctx) : view.layout || (store.modoTotem() ? 'totem' : 'cliente');
  document.body.dataset.layout = layout;
  renderizarMoldura(layout, ctx);

  const main = $('#conteudo');
  const mudouRota = hashAnterior !== location.hash;
  // Diálogos abertos pertencem à tela anterior: fecha-os ao trocar de rota.
  if (mudouRota) document.querySelectorAll('dialog.dialogo').forEach((d) => d.dispatchEvent(new Event('cancel')));
  hashAnterior = location.hash;
  const rolagem = window.scrollY;
  main.innerHTML = String(view.render(ctx));
  limpezaAtual = view.montar?.(main, ctx) || null;
  viewAtual = view;

  const titulo = typeof view.titulo === 'function' ? view.titulo(ctx) : view.titulo;
  document.title = `${titulo} · Raízes do Nordeste`;

  if (mudouRota && !manter) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, rolagem);
  }
}

// ---------------------------------------------------------------------------
// Moldura (cabeçalho, rodapé e navegação inferior) por canal
// ---------------------------------------------------------------------------

const MARCA = html`<svg class="marca__simbolo" viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="19" fill="#F2A516"/>
  <path d="M18 34V14a2 2 0 0 1 4 0v20zM18 24h-4a2 2 0 0 1-2-2v-5a2 2 0 0 1 4 0v3h2zM22 21h4v-4a2 2 0 0 1 4 0v5a2 2 0 0 1-2 2h-6z" fill="#2F6B4F"/>
  <path d="M8 34h24" stroke="#B5462B" stroke-width="3" stroke-linecap="round"/>
</svg>`;

function linkAtivo(caminho, alvo) {
  if (alvo === '/') return caminho === '/';
  return caminho === alvo || caminho.startsWith(`${alvo}/`);
}

function renderizarMoldura(layout, ctx) {
  const topo = $('#topo');
  const rodape = $('#rodape');
  const inferior = $('#nav-inferior');

  if (layout === 'totem') {
    const u = store.unidadeAtual('totem');
    topo.innerHTML = String(html`
      <div class="topo topo--totem">
        <span class="marca">${MARCA}<span class="marca__nome">Raízes <small>do Nordeste</small></span></span>
        ${u ? html`<span class="topo__unidade">${icone('pin', 18)} ${u.nome}</span>` : ''}
        ${ctx.caminho !== '/totem' ? html`<button class="btn btn--secundario" data-acao="totem-recomecar">${icone('fechar', 18)} Recomeçar</button>` : ''}
      </div>`);
    rodape.innerHTML = String(html`<div class="rodape rodape--totem">
      <span>${icone('escudo', 16)} Este totem não guarda seus dados pessoais após o pedido.</span>
      <button class="link-discreto" data-acao="totem-sair">Sair do modo totem (equipe)</button>
    </div>`);
    inferior.innerHTML = '';
    return;
  }

  if (layout === 'equipe') {
    const m = store.membroEquipe();
    const u = m?.unidadeId ? store.unidadePorId(m.unidadeId) : null;
    const itens = [];
    if (m) {
      if (['atendente', 'gerente'].includes(m.papel)) itens.push(['/equipe/balcao', 'caixa', 'Balcão']);
      if (['cozinha', 'gerente'].includes(m.papel)) itens.push(['/equipe/cozinha', 'fogo', 'Cozinha']);
      if (['gerente', 'admin'].includes(m.papel)) itens.push(['/equipe/gerencia', 'grafico', m.papel === 'admin' ? 'Matriz' : 'Gerência']);
    }
    topo.innerHTML = String(html`
      <div class="topo topo--equipe">
        <a class="marca" href="#/equipe">${MARCA}<span class="marca__nome">Raízes <small>Equipe</small></span></a>
        ${m ? html`
          <nav class="nav-topo nav-topo--equipe" aria-label="Sistema interno">
            ${itens.map(([href, ic, rot]) => html`<a href="#${href}" ${linkAtivo(ctx.caminho, href) ? html`aria-current="page"` : ''}>${icone(ic, 18)}<span>${rot}</span></a>`)}
          </nav>
          <div class="topo__acoes">
            <span class="topo__pessoa"><strong>${m.nome}</strong><small>${PAPEIS[m.papel]}${u ? ` · ${u.nome}` : ''}</small></span>
            <button class="btn-icone" data-acao="equipe-sair" aria-label="Sair do sistema interno">${icone('sair')}</button>
          </div>` : html`<a class="btn btn--secundario btn--pequeno" href="#/">Voltar ao site</a>`}
      </div>`);
    rodape.innerHTML = String(html`<div class="rodape rodape--equipe"><span>Sistema interno · acessos e operações sensíveis são registrados em auditoria.</span></div>`);
    inferior.innerHTML = '';
    return;
  }

  const u = store.unidadeAtual('cliente');
  const cliente = store.clienteAtual();
  const qtd = store.resumoCarrinho('cliente').quantidade;
  const navs = [
    ['/', 'casa', 'Início'],
    ['/cardapio', 'cardapio', 'Cardápio'],
    ['/promocoes', 'tag', 'Promoções'],
    ['/fidelidade', 'estrela', 'Fidelidade'],
    ['/pedidos', 'recibo', 'Pedidos'],
  ];
  topo.innerHTML = String(html`
    <div class="topo">
      <a class="marca" href="#/" aria-label="Raízes do Nordeste – início">${MARCA}<span class="marca__nome">Raízes <small>do Nordeste</small></span></a>
      <a class="unidade-chip" href="#/unidades?volta=${encodeURIComponent(ctx.caminho)}">
        ${icone('pin', 16)}<span>${u ? u.nome : 'Escolha a unidade'}</span>
      </a>
      <nav class="nav-topo" aria-label="Principal">
        ${navs.slice(1).map(([href, , rot]) => html`<a href="#${href}" ${linkAtivo(ctx.caminho, href) ? html`aria-current="page"` : ''}>${rot}</a>`)}
      </nav>
      <div class="topo__acoes">
        <a class="topo__conta" href="${cliente ? '#/conta' : '#/entrar'}">${icone('usuario', 20)}<span>${cliente ? cliente.nome.split(' ')[0] : 'Entrar'}</span></a>
        <a class="btn-sacola" href="#/sacola" aria-label="Sacola com ${qtd} ${qtd === 1 ? 'item' : 'itens'}">
          ${icone('sacola', 22)}${qtd ? html`<span class="contador">${qtd}</span>` : ''}
        </a>
      </div>
    </div>`);

  const navsCelular = [navs[0], navs[1], navs[4], navs[3], [cliente ? '/conta' : '/entrar', 'usuario', cliente ? 'Conta' : 'Entrar']];
  inferior.innerHTML = String(html`
    ${navsCelular.map(([href, ic, rot]) => html`
      <a href="#${href}" ${linkAtivo(ctx.caminho, href) ? html`aria-current="page"` : ''}>${icone(ic, 22)}<span>${rot}</span></a>`)}`);

  rodape.innerHTML = String(html`
    <div class="rodape">
      <div class="rodape__marca">
        <strong>Raízes do Nordeste</strong>
        <p>Tapioca, cuscuz e café passado na hora, do jeito de casa. Projeto acadêmico com dados fictícios.</p>
      </div>
      <nav class="rodape__links" aria-label="Links institucionais">
        <a href="#/unidades">Nossas unidades</a>
        <a href="#/privacidade">Central de privacidade</a>
        <a href="#/politica-de-privacidade">Política de privacidade</a>
        <button class="link-discreto" data-acao="cookies-preferencias">Preferências de cookies</button>
      </nav>
      <nav class="rodape__links" aria-label="Outros canais">
        <a href="#/totem">${icone('totem', 16)} Modo totem</a>
        <a href="#/equipe">${icone('caixa', 16)} Área da equipe</a>
        <button class="link-discreto" data-acao="demo">${icone('config', 16)} Painel de demonstração</button>
      </nav>
      <p class="rodape__canal">Você está usando o canal <strong>${nomeCanal(store.canalAtual())}</strong>.</p>
    </div>`);
  renderizarCookies();
}

// ---------------------------------------------------------------------------
// Banner de cookies (LGPD) – recusar é tão fácil quanto aceitar
// ---------------------------------------------------------------------------

function renderizarCookies() {
  const area = $('#cookies');
  if (store.consentimentoCookies() || document.body.dataset.layout !== 'cliente') {
    area.innerHTML = '';
    return;
  }
  area.innerHTML = String(html`
    <section class="cookies" role="region" aria-label="Aviso de cookies">
      <div class="cookies__texto">
        <strong>${icone('escudo', 18)} Sua privacidade importa</strong>
        <p>Usamos cookies necessários para a sacola e o login funcionarem. Com sua permissão, também usamos cookies de
        desempenho (para melhorar o app) e de personalização (para sugerir itens). Você pode mudar isso a qualquer momento.
        <a href="#/politica-de-privacidade">Saiba mais</a>.</p>
      </div>
      <div class="cookies__acoes">
        <button class="btn btn--secundario" data-acao="cookies-necessarios">Somente necessários</button>
        <button class="btn btn--secundario" data-acao="cookies-preferencias">Personalizar</button>
        <button class="btn btn--primario" data-acao="cookies-todos">Aceitar todos</button>
      </div>
    </section>`);
}

async function preferenciasCookies() {
  const atual = store.consentimentoCookies() || {};
  const r = await dialogo({
    titulo: 'Preferências de cookies',
    confirmar: 'Salvar preferências',
    corpo: html`
      <p class="texto-suave">Escolha quais categorias você permite. Os necessários não podem ser desativados porque sem eles o site não funciona.</p>
      <label class="opcao-consentimento">
        <input type="checkbox" checked disabled>
        <span><strong>Necessários</strong><small>Sacola, sessão de login, segurança e suas escolhas de privacidade.</small></span>
      </label>
      <label class="opcao-consentimento">
        <input type="checkbox" name="desempenho" ${atual.desempenho ? 'checked' : ''}>
        <span><strong>Desempenho</strong><small>Medição anônima de tempo de carregamento e erros, para melhorar o app.</small></span>
      </label>
      <label class="opcao-consentimento">
        <input type="checkbox" name="personalizacao" ${atual.personalizacao ? 'checked' : ''}>
        <span><strong>Personalização</strong><small>Lembrar preferências de navegação e sugerir itens do cardápio.</small></span>
      </label>`,
  });
  if (r) {
    store.salvarCookies(r);
    aviso('Preferências de cookies salvas.', 'sucesso');
  }
}

// ---------------------------------------------------------------------------
// Painel de demonstração (para o avaliador testar todos os cenários)
// ---------------------------------------------------------------------------

async function painelDemo() {
  const d = store.demo();
  const r = await dialogo({
    titulo: 'Painel de demonstração',
    confirmar: 'Aplicar',
    classe: 'dialogo--largo',
    corpo: html`
      <p class="texto-suave">Este projeto usa dados simulados (mock). Use as opções abaixo para reproduzir os cenários do plano de testes.</p>
      <label class="campo">
        <span class="campo__rotulo">Resposta do provedor de pagamento</span>
        <select name="gateway">
          ${[['auto', 'Automática (85% aprova, 10% recusa, 5% sem resposta)'], ['aprovar', 'Sempre aprovar'], ['recusar', 'Sempre recusar'], ['sem_resposta', 'Simular falha de comunicação (timeout)']]
            .map(([v, t]) => html`<option value="${v}" ${d.gateway === v ? 'selected' : ''}>${t}</option>`)}
        </select>
      </label>
      <label class="opcao-consentimento">
        <input type="checkbox" name="cozinhaAutomatica" ${d.cozinhaAutomatica ? 'checked' : ''}>
        <span><strong>Simular a cozinha automaticamente</strong><small>Pedidos confirmados passam para "Em preparo" (10 s) e "Pronto" (20 s) sem ação da equipe.</small></span>
      </label>
      <div class="caixa-info">
        <strong>Contas de teste</strong>
        <ul class="lista-simples">
          <li>Cliente: <code>cliente@raizes.demo</code> / <code>cliente123</code> (CPF 529.982.247-25)</li>
          <li>Atendente: <code>atendente@raizes.demo</code> / <code>equipe123</code></li>
          <li>Cozinha: <code>cozinha@raizes.demo</code> / <code>equipe123</code></li>
          <li>Gerente: <code>gerente@raizes.demo</code> / <code>equipe123</code></li>
          <li>Matriz: <code>matriz@raizes.demo</code> / <code>equipe123</code></li>
        </ul>
      </div>
      <label class="opcao-consentimento opcao-consentimento--perigo">
        <input type="checkbox" name="restaurar">
        <span><strong>Restaurar dados iniciais</strong><small>Apaga pedidos, contas criadas e preferências deste navegador.</small></span>
      </label>`,
  });
  if (!r) return;
  if (r.restaurar) {
    await store.restaurarDemonstracao();
    aviso('Dados de demonstração restaurados.', 'sucesso');
    navegar('/');
    return;
  }
  store.configurarDemo({ gateway: r.gateway, cozinhaAutomatica: !!r.cozinhaAutomatica });
  aviso('Configurações de demonstração aplicadas.', 'sucesso');
}

// ---------------------------------------------------------------------------
// Totem: inatividade
// ---------------------------------------------------------------------------

let ultimoToque = Date.now();
function verificarInatividadeTotem() {
  if (!store.modoTotem()) return;
  const { caminho } = lerHash();
  if (caminho === '/totem' || /^\/pedido\//.test(caminho)) return;
  if (store.pagamentoEmAndamento && /^\/pagamento\//.test(caminho)) return;
  const ocioso = Date.now() - ultimoToque;
  const aviso2 = $('#inatividade');
  if (ocioso > 90e3 && !aviso2) {
    const el = document.createElement('div');
    el.id = 'inatividade';
    el.className = 'inatividade';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', 'Você ainda está aí?');
    el.innerHTML = String(html`<div class="inatividade__caixa"><h2>Você ainda está aí?</h2>
      <p>Por segurança, o pedido será reiniciado em <strong data-contagem>15</strong> segundos.</p>
      <button class="btn btn--primario btn--grande">Continuar meu pedido</button></div>`);
    el.querySelector('button').addEventListener('click', () => { ultimoToque = Date.now(); el.remove(); });
    document.body.append(el);
  } else if (aviso2) {
    const resta = Math.max(0, 15 - Math.floor((ocioso - 90e3) / 1000));
    aviso2.querySelector('[data-contagem]').textContent = resta;
    if (resta === 0) {
      aviso2.remove();
      store.reiniciarTotem();
      navegar('/totem');
    }
  }
}

// ---------------------------------------------------------------------------
// Ações globais (delegação de eventos)
// ---------------------------------------------------------------------------

document.addEventListener('click', async (e) => {
  const alvo = e.target.closest('[data-acao]');
  if (!alvo) return;
  const acao = alvo.dataset.acao;
  if (acao === 'cookies-todos') {
    store.salvarCookies({ desempenho: true, personalizacao: true });
    aviso('Obrigado! Preferências salvas.', 'sucesso');
  } else if (acao === 'cookies-necessarios') {
    store.salvarCookies({ desempenho: false, personalizacao: false });
    aviso('Usaremos apenas cookies necessários.', 'sucesso');
  } else if (acao === 'cookies-preferencias') {
    preferenciasCookies();
  } else if (acao === 'demo') {
    painelDemo();
  } else if (acao === 'equipe-sair') {
    store.sairEquipe();
    navegar('/equipe');
  } else if (acao === 'totem-recomecar') {
    const ok = store.resumoCarrinho('totem').quantidade === 0 || await dialogo({
      titulo: 'Recomeçar o pedido?', corpo: 'Os itens da sacola serão removidos.', confirmar: 'Recomeçar', perigo: true,
    });
    if (ok) {
      store.reiniciarTotem();
      navegar('/totem');
    }
  } else if (acao === 'totem-sair') {
    const ok = await dialogo({
      titulo: 'Sair do modo totem',
      corpo: 'Em uma loja real esta opção exige o PIN da gerência. Na demonstração, basta confirmar.',
      confirmar: 'Sair do modo totem',
    });
    if (ok) {
      store.sairTotem();
      navegar('/');
    }
  }
});

document.querySelector('.skip-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  $('#conteudo').focus();
});

['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
  document.addEventListener(ev, () => { ultimoToque = Date.now(); }, { passive: true }));

function editando() {
  const a = document.activeElement;
  return a && $('#conteudo').contains(a) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName);
}

async function iniciarApp() {
  await store.iniciar();
  window.addEventListener('hashchange', () => renderizar());
  store.assinar(() => {
    const vivo = typeof viewAtual?.aoVivo === 'function' ? viewAtual.aoVivo() : viewAtual?.aoVivo;
    if (vivo && !editando()) renderizar({ manter: true });
    else renderizarMoldura(document.body.dataset.layout, contexto());
  });
  let largura = window.innerWidth;
  window.addEventListener('resize', () => {
    const cruzou = (largura < 768) !== (window.innerWidth < 768);
    largura = window.innerWidth;
    if (cruzou) renderizarMoldura(document.body.dataset.layout, contexto());
  });
  renderizar();
  setInterval(() => {
    store.processarRelogio();
    verificarInatividadeTotem();
  }, 1000);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* PWA opcional */ });
  }
}

iniciarApp().catch((e) => {
  console.error(e);
  $('#conteudo').innerHTML = '<div class="pagina"><h1>Não foi possível carregar o app</h1><p>Recarregue a página. Se o problema continuar, limpe os dados do site.</p></div>';
});
