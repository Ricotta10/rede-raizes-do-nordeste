// Testes de ponta a ponta (E2E) dos cenários do plano de testes, executados
// em um navegador real contra o site publicado. Gera o registro de execução e
// as capturas de tela usadas como evidência no documento de entrega.
//
// Uso:  node tests/e2e/executar-cenarios.mjs
// Variáveis opcionais: URL_BASE (padrão: GitHub Pages) e NAVEGADOR (caminho do Edge/Chrome).

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const URL_BASE = process.env.URL_BASE || 'https://ricotta10.github.io/rede-raizes-do-nordeste/';
const NAVEGADOR = process.env.NAVEGADOR || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SAIDA = path.resolve('docs/evidencias');
const TELAS = path.join(SAIDA, 'telas');
fs.mkdirSync(TELAS, { recursive: true });

const CELULAR = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1366, height: 820, deviceScaleFactor: 1 };
const TOTEM = { width: 810, height: 1440, deviceScaleFactor: 1, hasTouch: true };

const resultados = [];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = await puppeteer.launch({
  executablePath: NAVEGADOR,
  headless: true,
  args: ['--no-first-run', '--lang=pt-BR'],
});

async function novaPagina(viewport, { aceitarCookies = true } = {}) {
  const contexto = await navegador.createBrowserContext();
  const page = await contexto.newPage();
  await page.setViewport(viewport);
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(URL_BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#conteudo .pagina, #conteudo .totem-espera');
  if (aceitarCookies) await store(page, 'store.salvarCookies({ desempenho: false, personalizacao: false });');
  page.erros = erros;
  page.contexto = contexto;
  return page;
}

// Executa código com acesso ao módulo de estado da aplicação (preparação de cenário).
function store(page, corpo, ...args) {
  return page.evaluate(async (base, codigo, argumentos) => {
    const s = await import(`${base}js/store.js`);
    const fn = new Function('store', 'args', `return (async () => { ${codigo} })();`);
    return fn(s, argumentos);
  }, URL_BASE, corpo, args);
}

async function ir(page, hash, seletor = '#conteudo > *') {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await espera(350);
  await page.waitForSelector(seletor, { timeout: 10000 });
}

const texto = (page, seletor = 'main') => page.$eval(seletor, (e) => e.innerText).catch(() => '');
const avisos = (page) => page.$$eval('.toast', (ts) => ts.map((t) => t.innerText).join(' | '));

async function foto(page, nome, opcoes = {}) {
  await espera(250);
  await page.screenshot({ path: path.join(TELAS, `${nome}.jpg`), type: 'jpeg', quality: 82, ...opcoes });
}

async function cenario(id, titulo, esperado, fn) {
  const inicio = Date.now();
  let obtido = '';
  let ok = false;
  try {
    const r = await fn();
    ok = r.ok;
    obtido = r.obtido;
  } catch (e) {
    obtido = `Erro na execução: ${e.message.split('\n')[0]}`;
  }
  resultados.push({ id, titulo, esperado, obtido, resultado: ok ? 'Aprovado' : 'Reprovado', duracaoMs: Date.now() - inicio, em: new Date().toISOString() });
  console.log(`${ok ? '✔' : '✘'} ${id} ${titulo} — ${obtido}`);
}

async function abrirProdutoEAdicionar(page, id, qtd = 1) {
  await page.click(`[data-produto="${id}"]`);
  await page.waitForSelector('dialog.dialogo[open]');
  await page.$eval('dialog [name=qtd]', (e, q) => { e.value = q; }, String(qtd));
  await page.click('dialog button[value=ok]');
  await espera(300);
}

async function aplicarCupom(page, codigo) {
  await page.$eval('[data-form-cupom] [name=cupom]', (e, c) => { e.value = c; }, codigo);
  await page.click('[data-form-cupom] button');
  await espera(350);
  return page.evaluate(() => document.querySelector('[data-erro-cupom]')?.textContent
    || document.querySelector('.cupom-aplicado')?.innerText || '');
}

async function pagarComo(page, modo, metodo) {
  await store(page, `store.configurarDemo({ gateway: '${modo}' });`);
  await ir(page, '/checkout', '[data-checkout]');
  await page.$eval(`input[name=metodo][value=${metodo}]`, (e) => { e.checked = true; });
  await page.click('[data-enviar]');
  await page.waitForSelector('.pagamento');
}

async function clienteComItem(viewport, produto = 'tap-carne-sol') {
  const page = await novaPagina(viewport);
  await store(page, `store.selecionarUnidade('recife-boa-viagem'); await store.entrar('cliente@raizes.demo', 'cliente123'); store.adicionarAoCarrinho('${produto}', 1, '', 'cliente');`);
  return page;
}

// ===========================================================================
// Telas principais (evidências visuais)
// ===========================================================================
{
  const page = await novaPagina(CELULAR, { aceitarCookies: false });
  await foto(page, 'm-01-inicio-cookies');
  await store(page, 'store.salvarCookies({ desempenho: false, personalizacao: false });');
  await ir(page, '/unidades', '.lista-unidades');
  await foto(page, 'm-02-unidades');
  await store(page, "store.selecionarUnidade('recife-boa-viagem');");
  await ir(page, '/cardapio', '.categoria');
  await foto(page, 'm-03-cardapio');
  await page.click('[data-produto="tap-carne-sol"]');
  await page.waitForSelector('dialog.dialogo[open]');
  await foto(page, 'm-04-produto');
  await page.click('dialog button[value=ok]');
  await espera(300);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#cat-juninos').offsetTop - 120));
  await foto(page, 'm-05-cardapio-sazonal');
  await ir(page, '/cadastro', '[data-cadastro]');
  await page.evaluate(() => document.querySelector('.consentimentos').scrollIntoView());
  await foto(page, 'm-06-cadastro-consentimentos');
  await store(page, "await store.entrar('cliente@raizes.demo', 'cliente123');");
  await store(page, "store.adicionarAoCarrinho('cafe-rapido', 1, '', 'cliente');");
  await ir(page, '/sacola', '.linhas-sacola');
  await aplicarCupom(page, 'CAFE10');
  await foto(page, 'm-07-sacola-cupom');
  await store(page, "store.removerCupom('cliente'); store.adicionarAoCarrinho('suco-caja', 1, '', 'cliente');");
  await ir(page, '/checkout', '[data-checkout]');
  await foto(page, 'm-08-checkout');
  await ir(page, '/fidelidade', '.cartao-pontos');
  await foto(page, 'm-09-fidelidade');
  await ir(page, '/promocoes', '.grade-promos');
  await foto(page, 'm-10-promocoes');
  await ir(page, '/privacidade', '[data-consentimentos]');
  await foto(page, 'm-11-privacidade');
  await page.contexto.close();
}
{
  const page = await novaPagina(DESKTOP);
  await foto(page, 'd-01-inicio');
  await store(page, "store.selecionarUnidade('fortaleza-aldeota');");
  await ir(page, '/cardapio', '.categoria');
  await foto(page, 'd-02-cardapio');
  await page.contexto.close();
}

// ===========================================================================
// Cenários do plano de testes
// ===========================================================================

await cenario('CT01', 'Cardápio por unidade (formato e variação regional)',
  'Unidade compacta não exibe itens de cozinha completa; receita regional aplicada', async () => {
    const page = await novaPagina(CELULAR);
    await store(page, "store.selecionarUnidade('salvador-barra');");
    await ir(page, '/cardapio', '.categoria');
    const charque = await page.$('[data-produto="cus-charque"]');
    const nome = await page.$eval('[data-produto="cus-ovo"] .produto__nome', (e) => e.textContent);
    await page.contexto.close();
    return { ok: !charque && /de milho/.test(nome), obtido: `Cuscuz com charque ${charque ? 'exibido' : 'não exibido'}; item regional: "${nome}"` };
  });

await cenario('CT02', 'Item sazonal fora de época', 'Itens juninos desabilitados com o selo "Volta no São João"', async () => {
  const page = await novaPagina(CELULAR);
  await store(page, "store.selecionarUnidade('recife-boa-viagem');");
  await ir(page, '/cardapio', '.categoria');
  const r = await page.$eval('[data-produto="canjica"]', (e) => ({ d: e.getAttribute('aria-disabled'), t: e.innerText }));
  await page.contexto.close();
  const mes = new Date().getMonth() + 1;
  if (mes === 6 || mes === 7) return { ok: r.d !== 'true', obtido: 'Período junino: item disponível' };
  return { ok: r.d === 'true' && r.t.includes('Volta no São João'), obtido: `aria-disabled=${r.d}; selo: ${r.t.includes('Volta no São João') ? '"Volta no São João"' : 'ausente'}` };
});

await cenario('CT03', 'Item esgotado na unidade', 'Selo "Esgotado nesta unidade" e item não adicionável', async () => {
  const page = await novaPagina(CELULAR);
  await store(page, "store.selecionarUnidade('recife-boa-viagem');");
  await ir(page, '/cardapio', '.categoria');
  const t = await page.$eval('[data-produto="suco-graviola"]', (e) => e.innerText);
  await page.click('[data-produto="suco-graviola"]');
  await espera(300);
  const abriu = !!(await page.$('dialog.dialogo[open]'));
  await page.contexto.close();
  return { ok: t.includes('Esgotado nesta unidade') && !abriu, obtido: `Selo ${t.includes('Esgotado') ? 'exibido' : 'ausente'}; diálogo ${abriu ? 'abriu' : 'não abriu'}` };
});

await cenario('CT04', 'Limite de estoque', 'Campo limitado a 4 un.; ao somar além do estoque: "Só temos 4 unidade(s)..."', async () => {
  const page = await novaPagina(CELULAR);
  await store(page, "store.selecionarUnidade('recife-boa-viagem');");
  await ir(page, '/cardapio', '.categoria');
  await abrirProdutoEAdicionar(page, 'bolo-rolo', 6);
  const bloqueado = await page.$eval('dialog [name=qtd]', (e) => e.validity.rangeOverflow).catch(() => false);
  await page.click('dialog button[value=cancelar]');
  await espera(200);
  await abrirProdutoEAdicionar(page, 'bolo-rolo', 3);
  await abrirProdutoEAdicionar(page, 'bolo-rolo', 2);
  const a = await avisos(page);
  await page.contexto.close();
  return { ok: bloqueado && a.includes('Só temos 4'), obtido: `6 un.: envio bloqueado pelo limite do campo (${bloqueado}); 3 + 2 un.: "${a.split(' | ').pop()}"` };
});

await cenario('CT05', 'Cupom inexistente', '"Cupom não encontrado. Confira o código digitado."', async () => {
  const page = await clienteComItem(CELULAR);
  await ir(page, '/sacola', '[data-form-cupom]');
  const r = await aplicarCupom(page, 'XYZ');
  await foto(page, 'm-12-cupom-invalido');
  await page.contexto.close();
  return { ok: r.includes('não encontrado'), obtido: r };
});

await cenario('CT06', 'Cupom fora do canal', '"Cupom válido apenas em: Totem." no site', async () => {
  const page = await clienteComItem(DESKTOP);
  await ir(page, '/sacola', '[data-form-cupom]');
  const r = await aplicarCupom(page, 'TOTEM5');
  await page.contexto.close();
  return { ok: r.includes('Totem'), obtido: r };
});

await cenario('CT07', 'Cupom de categoria', '10% somente sobre o café da manhã (R$ 3,49 em R$ 34,90)', async () => {
  const page = await clienteComItem(CELULAR, 'cafe-sertanejo');
  await store(page, "store.adicionarAoCarrinho('suco-caja', 1, '', 'cliente');");
  await ir(page, '/sacola', '[data-form-cupom]');
  await aplicarCupom(page, 'CAFE10');
  const t = await texto(page, '.totais');
  await page.contexto.close();
  return { ok: /Cupom CAFE10\s*− R\$\s*3,49/.test(t), obtido: t.replace(/\s+/g, ' ') };
});

await cenario('CT08', 'Checkout exige login no app/site', 'Redireciona para Entrar com aviso e volta ao checkout após login', async () => {
  const page = await novaPagina(CELULAR);
  await store(page, "store.selecionarUnidade('recife-boa-viagem'); store.adicionarAoCarrinho('tap-coalho', 1, '', 'cliente');");
  await ir(page, '/sacola', '.linhas-sacola');
  await page.click('a[href="#/checkout"]');
  await page.waitForSelector('[data-entrar]');
  const rota1 = await page.evaluate(() => location.hash);
  await foto(page, 'm-13-login-checkout');
  await page.type('[name=email]', 'cliente@raizes.demo');
  await page.type('[name=senha]', 'cliente123');
  await page.click('[data-enviar]');
  await page.waitForSelector('[data-checkout]', { timeout: 8000 });
  const rota2 = await page.evaluate(() => location.hash);
  await page.contexto.close();
  return { ok: rota1.includes('/entrar') && rota2 === '#/checkout', obtido: `${rota1} → ${rota2}` };
});

await cenario('CT09', 'Login inválido e bloqueio', 'Mensagem genérica e bloqueio de 30 s após 5 erros', async () => {
  const page = await novaPagina(CELULAR);
  const msgs = await store(page, `const m = []; for (let i = 0; i < 6; i++) m.push((await store.entrar('cliente@raizes.demo', 'errada' + i)).erro); return m;`);
  await page.contexto.close();
  return { ok: msgs[0] === 'E-mail ou senha incorretos.' && msgs[5].includes('Muitas tentativas'), obtido: `1ª: "${msgs[0]}" · 6ª: "${msgs[5]}"` };
});

await cenario('CT10', 'Pagamento aprovado (cartão)', 'Etapas concluídas, pontos creditados e redirecionamento ao acompanhamento', async () => {
  const page = await clienteComItem(CELULAR);
  await pagarComo(page, 'aprovar', 'credito');
  await foto(page, 'm-14-pagamento-processando');
  await page.waitForSelector('.resultado--sucesso', { timeout: 10000 });
  await foto(page, 'm-15-pagamento-aprovado');
  await page.waitForFunction(() => location.hash.startsWith('#/pedido/'), { timeout: 8000 });
  await page.waitForSelector('.linha-tempo');
  await foto(page, 'm-16-acompanhamento');
  const t = await texto(page);
  await page.contexto.close();
  return { ok: t.includes('Pedido confirmado') && /pontos creditados/.test(t), obtido: 'Pagamento aprovado → tela de acompanhamento com pontos creditados' };
});

await cenario('CT11', 'Pagamento recusado', 'Motivo da recusa, "Nenhum valor foi cobrado" e opções de nova tentativa', async () => {
  const page = await clienteComItem(CELULAR);
  await pagarComo(page, 'recusar', 'credito');
  await page.waitForSelector('.resultado--erro', { timeout: 10000 });
  await foto(page, 'm-17-pagamento-recusado');
  const t = await texto(page, '.resultado');
  await page.contexto.close();
  return { ok: t.includes('Pagamento não aprovado') && t.includes('Nenhum valor foi cobrado') && t.includes('Tentar novamente'), obtido: t.split('\n').filter(Boolean).slice(0, 2).join(' · ') };
});

await cenario('CT12', 'Falha de comunicação com o provedor (timeout)', 'Aviso após 7 s e confirmação via consulta, sem nova cobrança', async () => {
  const page = await clienteComItem(CELULAR);
  await pagarComo(page, 'sem_resposta', 'credito');
  await page.waitForSelector('.resultado--alerta', { timeout: 15000 });
  await foto(page, 'm-18-pagamento-timeout');
  await page.click('[data-acao-pg=verificar]');
  await page.waitForSelector('.resultado--sucesso', { timeout: 10000 });
  const tentativas = await store(page, 'return store.todosPedidos()[0].pagamento.tentativas;');
  await page.contexto.close();
  return { ok: tentativas === 1, obtido: `Sem resposta → "Verificar status" → aprovado com ${tentativas} tentativa (sem cobrança duplicada)` };
});

await cenario('CT13', 'Pagamento via Pix', 'QR Code, copia e cola e aprovação por consulta automática', async () => {
  const page = await clienteComItem(CELULAR);
  await pagarComo(page, 'auto', 'pix');
  await page.waitForSelector('.pix', { timeout: 10000 });
  await foto(page, 'm-19-pix');
  await page.click('[data-acao-pg=simular-pix]');
  await page.waitForFunction(() => location.hash.startsWith('#/pedido/'), { timeout: 20000 });
  await page.contexto.close();
  return { ok: true, obtido: 'QR exibido → pagamento simulado → pedido confirmado' };
});

await cenario('CT14', 'Banner de cookies', 'Três opções com mesmo destaque; escolha registrada com data', async () => {
  const page = await novaPagina(CELULAR, { aceitarCookies: false });
  const botoes = await page.$$eval('.cookies button', (bs) => bs.map((b) => b.innerText));
  await page.click('[data-acao="cookies-necessarios"]');
  const salvo = await store(page, 'return store.consentimentoCookies();');
  await page.contexto.close();
  return { ok: botoes.length === 3 && salvo && !salvo.desempenho && !!salvo.em, obtido: `Botões: ${botoes.join(', ')}; desempenho=${salvo?.desempenho}; registrado em ${salvo?.em}` };
});

await cenario('CT15', 'Consentimentos no cadastro', 'Termos obrigatórios; finalidades opcionais desmarcadas; nascimento só com personalização', async () => {
  const page = await novaPagina(CELULAR);
  await ir(page, '/cadastro', '[data-cadastro]');
  const marcados = await page.$$eval('[data-cadastro] input[type=checkbox]', (cs) => cs.filter((c) => c.checked).length);
  const nascOculto = await page.$eval('[data-campo-nascimento]', (e) => e.hidden);
  await page.type('[name=nome]', 'Teste Silva');
  await page.type('[name=email]', 'teste.e2e@exemplo.com');
  await page.type('[name=senha]', 'senhaForte1');
  await page.type('[name=confirmacao]', 'senhaForte1');
  await page.click('[data-cadastro] [data-enviar]');
  await espera(300);
  const erro = await page.$eval('[data-erro-de="termos"]', (e) => e.textContent);
  await page.click('[name=personalizacao]');
  const nascVisivel = await page.$eval('[data-campo-nascimento]', (e) => !e.hidden);
  await page.contexto.close();
  return { ok: marcados === 0 && nascOculto && nascVisivel && erro.includes('aceitar'), obtido: `Pré-marcados: ${marcados}; erro: "${erro}"; nascimento aparece só após consentir: ${nascOculto && nascVisivel}` };
});

await cenario('CT16', 'Revogação de consentimento', 'Confirmação das consequências e histórico com "Revogado"', async () => {
  const page = await novaPagina(CELULAR);
  await store(page, "await store.entrar('cliente@raizes.demo', 'cliente123');");
  await ir(page, '/privacidade', '[data-consentimentos]');
  await page.click('[data-consentimentos] [name=fidelidade]');
  await page.click('[data-consentimentos] button.btn--primario');
  await page.waitForSelector('dialog.dialogo[open]');
  await foto(page, 'm-20-revogar-consentimento');
  await page.click('dialog button[value=ok]');
  await espera(400);
  const h = await store(page, 'return store.clienteAtual().historicoConsentimentos[0];');
  await page.contexto.close();
  return { ok: h.finalidade === 'fidelidade' && h.valor === false, obtido: `Histórico: ${h.finalidade} = ${h.valor ? 'Concedido' : 'Revogado'} em ${h.em} (${h.canal})` };
});

await cenario('CT17', 'Exclusão de conta (direito do titular)', 'Conta removida, sessão encerrada e registro na auditoria', async () => {
  const page = await novaPagina(CELULAR);
  await store(page, "await store.cadastrar({ nome: 'Titular Teste', email: 'titular@exemplo.com', senha: 'senhaForte1', confirmacao: 'senhaForte1', termos: true });");
  await ir(page, '/privacidade', '[data-excluir]');
  await page.click('[data-excluir]');
  await page.waitForSelector('dialog.dialogo[open]');
  await page.type('dialog [name=confirmacao]', 'EXCLUIR');
  await page.click('dialog button[value=ok]');
  await espera(400);
  const r = await store(page, "return { logado: !!store.clienteAtual(), existe: store.usuarios().some(u => u.email === 'titular@exemplo.com'), acao: store.auditoria()[0].acao };");
  await page.contexto.close();
  return { ok: !r.logado && !r.existe && r.acao === 'CONTA_EXCLUIDA', obtido: `Sessão ativa: ${r.logado}; conta existe: ${r.existe}; auditoria: ${r.acao}` };
});

await cenario('CT18', 'Acesso a dados pessoais pela gerência', 'Aviso prévio, dados mascarados e registro na auditoria', async () => {
  const page = await novaPagina(DESKTOP);
  await store(page, `store.selecionarUnidade('recife-boa-viagem');
    await store.entrar('cliente@raizes.demo', 'cliente123');
    store.configurarDemo({ gateway: 'aprovar' });
    store.adicionarAoCarrinho('tap-coalho', 1, '', 'cliente');
    const r = store.criarPedido('cliente', { retirada: { tipo: 'retirada' }, metodo: 'pix' });
    await store.pagarPedido(r.pedido.id);
    store.simularPixPago(r.pedido.id);
    await store.verificarPagamento(r.pedido.id);
    await store.entrarEquipe('gerente@raizes.demo', 'equipe123');`);
  await ir(page, '/equipe/gerencia', '.kpis');
  await foto(page, 'd-03-gerencia', { fullPage: true });
  await page.click('[data-ver-cliente]');
  await espera(300);
  let mascarado = '';
  if (await page.$('dialog.dialogo[open]')) {
    await page.click('dialog button[value=ok]');
    await page.waitForSelector('dialog.dialogo[open]');
    mascarado = await page.$eval('dialog .dados', (e) => e.innerText);
    await espera(250);
    await (await page.$('dialog.dialogo[open]')).screenshot({ path: path.join(TELAS, 'd-04-dados-mascarados.jpg'), type: 'jpeg', quality: 85 });
    await page.click('dialog button[value=ok]');
  }
  await page.click('[data-aba=auditoria]');
  await espera(300);
  await foto(page, 'd-05-auditoria');
  const acao = await store(page, 'return store.auditoria()[0].acao;');
  await page.contexto.close();
  return { ok: acao === 'DADOS_PESSOAIS_ACESSADOS' && /\*\*\*/.test(mascarado), obtido: `Dados exibidos: ${mascarado.replace(/\s+/g, ' ').slice(0, 80)}…; auditoria: ${acao}` };
});

await cenario('CT19', 'Totem: identificação por CPF', 'CPF inválido rejeitado; CPF cadastrado identifica e informa os pontos', async () => {
  const page = await novaPagina(TOTEM);
  await ir(page, '/totem', '[data-config-totem]');
  await page.select('[data-config-totem] select', 'recife-boa-viagem');
  await page.click('[data-config-totem] button');
  await page.waitForSelector('[data-comecar]');
  await foto(page, 't-01-espera');
  await page.click('[data-comecar]');
  await page.waitForSelector('.categoria');
  await foto(page, 't-02-cardapio');
  await abrirProdutoEAdicionar(page, 'cafe-sertanejo');
  await ir(page, '/checkout', '[data-checkout]');
  await page.type('[data-cpf]', '11111111111');
  await page.click('[data-identificar]');
  const erro = await page.$eval('[data-erro-cpf]', (e) => e.textContent);
  await page.$eval('[data-cpf]', (e) => { e.value = ''; });
  await page.type('[data-cpf]', '52998224725');
  await page.click('[data-identificar]');
  await page.waitForSelector('.caixa-sucesso');
  const ok = await texto(page, '.caixa-sucesso');
  await foto(page, 't-03-checkout');
  await store(page, "store.configurarDemo({ gateway: 'aprovar' });");
  await page.click('[data-enviar]');
  await page.waitForSelector('.maquininha');
  await foto(page, 't-04-maquininha');
  await page.waitForSelector('.confirmacao-totem', { timeout: 10000 });
  await foto(page, 't-05-confirmacao');
  await page.contexto.close();
  return { ok: erro.includes('inválido') && ok.includes('Olá, Ana'), obtido: `Inválido: "${erro}" · Válido: "${ok.split('\n')[0]}"` };
});

await cenario('CT20', 'Totem: reinício por inatividade', 'Aviso após 90 s sem toque e reinício após mais 15 s', async () => {
  const page = await novaPagina(TOTEM);
  await store(page, "store.iniciarTotem('recife-boa-viagem'); store.adicionarAoCarrinho('cafe-coado', 1, '', 'totem');");
  await ir(page, '/cardapio', '.categoria');
  // Avança o relógio da página (simulação de tempo) para não esperar 105 s reais.
  await page.evaluate(() => { const real = Date.now.bind(Date); const ini = real(); Date.now = () => ini + (real() - ini) + 95000; });
  await page.waitForSelector('#inatividade', { timeout: 5000 });
  await foto(page, 't-06-inatividade');
  await page.evaluate(() => { const atual = Date.now; Date.now = () => atual() + 20000; });
  await page.waitForFunction(() => location.hash === '#/totem', { timeout: 5000 });
  const qtd = await store(page, "return store.resumoCarrinho('totem').quantidade;");
  await page.contexto.close();
  return { ok: qtd === 0, obtido: `Aviso exibido; voltou à tela inicial com sacola de ${qtd} itens` };
});

await cenario('CT21', 'Balcão: pagamento em dinheiro', 'Bloqueia valor recebido menor que o total e calcula o troco', async () => {
  const page = await novaPagina(DESKTOP);
  await store(page, "await store.entrarEquipe('atendente@raizes.demo', 'equipe123');");
  await ir(page, '/equipe/balcao', '.pdv');
  await page.click('[data-add="cus-ovo"]');
  await espera(200);
  await page.click('[data-add="cafe-coado"]');
  await espera(200);
  await page.click('input[name=metodo][value=dinheiro]');
  await page.waitForSelector('[name=recebido]');
  await page.type('[name=recebido]', '10');
  await page.click('[data-finalizar]');
  await espera(300);
  const erro = await avisos(page);
  await page.$eval('[name=recebido]', (e) => { e.value = ''; });
  await page.type('[name=recebido]', '50');
  const troco = await page.$eval('[data-troco]', (e) => e.textContent);
  await foto(page, 'd-06-balcao');
  await page.contexto.close();
  return { ok: erro.includes('igual ou maior') && troco.includes('27,60'), obtido: `${erro.split(' | ').pop()} · ${troco}` };
});

await cenario('CT22', 'Cancelamento auditado de pedido pago', 'Motivo obrigatório, estorno, pontos devolvidos e registro na auditoria', async () => {
  const page = await clienteComItem(DESKTOP, 'tap-coalho');
  await store(page, `store.configurarDemo({ gateway: 'aprovar', cozinhaAutomatica: false });
    const r = store.criarPedido('cliente', { retirada: { tipo: 'retirada' }, metodo: 'credito' });
    await store.pagarPedido(r.pedido.id);
    await store.entrarEquipe('gerente@raizes.demo', 'equipe123');`);
  await ir(page, '/equipe/cozinha', '.kds');
  await foto(page, 'd-07-cozinha');
  await ir(page, '/equipe/balcao', '.pdv');
  await page.click('[data-aba=pedidos]');
  await page.waitForSelector('[data-cancelar]');
  await page.click('[data-cancelar]');
  await page.waitForSelector('dialog.dialogo[open]');
  await page.type('dialog [name=motivo]', 'Cliente desistiu no balcão');
  await page.click('dialog button[value=ok]');
  await espera(1500);
  const r = await store(page, 'const p = store.todosPedidos()[0]; return { s: p.status, pg: p.pagamento.status, a: store.auditoria()[0].acao, d: store.auditoria()[0].detalhes };');
  await page.contexto.close();
  return { ok: r.s === 'CANCELADO' && r.pg === 'estornado' && r.a === 'PEDIDO_CANCELADO', obtido: `${r.s}; pagamento ${r.pg}; auditoria: ${r.d}` };
});

await cenario('CT24', 'Controle de acesso por perfil', 'Atendente não acessa Cozinha nem Gerência; visitante não acessa o sistema interno', async () => {
  const page = await novaPagina(DESKTOP);
  await ir(page, '/equipe/gerencia');
  const visitante = await page.evaluate(() => location.hash);
  await store(page, "await store.entrarEquipe('atendente@raizes.demo', 'equipe123');");
  await ir(page, '/equipe/cozinha');
  const cozinha = await page.evaluate(() => location.hash);
  await ir(page, '/equipe/gerencia');
  const gerencia = await page.evaluate(() => location.hash);
  await page.contexto.close();
  return { ok: visitante === '#/equipe' && cozinha === '#/equipe/balcao' && gerencia === '#/equipe/balcao', obtido: `Visitante → ${visitante}; atendente em /cozinha → ${cozinha}; em /gerencia → ${gerencia}` };
});

await cenario('CT23', 'Responsividade sem rolagem horizontal', 'Nenhuma tela ultrapassa a largura em 360, 768 e 1280 px', async () => {
  const falhas = [];
  for (const largura of [360, 768, 1280]) {
    const page = await novaPagina({ width: largura, height: 800, deviceScaleFactor: 1 });
    await store(page, "store.selecionarUnidade('recife-boa-viagem'); await store.entrar('cliente@raizes.demo', 'cliente123'); store.adicionarAoCarrinho('tap-coalho', 1, '', 'cliente');");
    for (const rota of ['/', '/unidades', '/cardapio', '/sacola', '/checkout', '/fidelidade', '/promocoes', '/privacidade', '/pedidos']) {
      await ir(page, rota);
      const excesso = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (excesso > 1) falhas.push(`${rota}@${largura}px (+${excesso}px)`);
    }
    if (page.erros.length) falhas.push(...page.erros);
    await page.contexto.close();
  }
  return { ok: falhas.length === 0, obtido: falhas.length ? falhas.join('; ') : '27 combinações de tela × largura sem rolagem horizontal nem erros de script' };
});

await navegador.close();

// ===========================================================================
// Registro de execução
// ===========================================================================
resultados.sort((a, b) => a.id.localeCompare(b.id));
const aprovados = resultados.filter((r) => r.resultado === 'Aprovado').length;
const registro = { executadoEm: new Date().toISOString(), urlBase: URL_BASE, navegador: path.basename(NAVEGADOR), total: resultados.length, aprovados, resultados };
fs.writeFileSync(path.join(SAIDA, 'resultado-e2e.json'), JSON.stringify(registro, null, 2));
const md = [
  '# Registro de execução – testes E2E',
  '',
  `- Executado em: ${new Date().toLocaleString('pt-BR')}`,
  `- Ambiente: ${URL_BASE} (${path.basename(NAVEGADOR)}, modo headless)`,
  `- Resultado: **${aprovados}/${resultados.length} aprovados**`,
  '',
  '| ID | Cenário | Resultado | Obtido |',
  '|---|---|---|---|',
  ...resultados.map((r) => `| ${r.id} | ${r.titulo} | ${r.resultado} | ${r.obtido.replace(/\|/g, '/')} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(SAIDA, 'resultado-e2e.md'), md);
console.log(`\n${aprovados}/${resultados.length} cenários aprovados.`);
process.exit(aprovados === resultados.length ? 0 : 1);
