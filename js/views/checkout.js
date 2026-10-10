import * as store from '../store.js';
import { html, icone, moeda, hora, aviso } from '../ui.js';
import { unidadeAberta, horariosRetirada, pontosPorValor, formatarCPF } from '../domain.js';
import { linhaTotais, itensPedido } from './comum.js';

function rotuloHorario(iso) {
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  return `${hoje ? 'Hoje' : 'Amanhã'}, ${hora(iso)}`;
}

function formCliente(r) {
  const aberta = unidadeAberta(r.unidade);
  const horarios = horariosRetirada(r.unidade);
  const pontos = r.cliente.consentimentos.fidelidade ? pontosPorValor(r.totais.total) : null;
  return html`
    <form class="checkout" data-checkout novalidate>
      <section class="cartao">
        <h2><span class="passo">1</span> Retirada na unidade</h2>
        <p class="texto-suave">${icone('pin', 16)} ${r.unidade.nome} – ${r.unidade.endereco}</p>
        <fieldset class="opcoes-grade">
          <legend class="sr-only">Como você vai consumir</legend>
          <label class="opcao-cartao"><input type="radio" name="tipo" value="retirada" checked><span>${icone('sacola')} <strong>Para levar</strong><small>Retire no balcão de retirada rápida</small></span></label>
          <label class="opcao-cartao"><input type="radio" name="tipo" value="local"><span>${icone('casa')} <strong>Comer na loja</strong><small>Chamamos você pelo nome</small></span></label>
        </fieldset>
        <fieldset class="opcoes-grade">
          <legend class="campo__rotulo">Quando?</legend>
          <label class="opcao-cartao ${aberta ? '' : 'opcao-cartao--desabilitada'}">
            <input type="radio" name="quando" value="agora" ${aberta ? 'checked' : 'disabled'}>
            <span>${icone('relogio')} <strong>O quanto antes</strong><small>${aberta ? 'Pronto em cerca de 15 min' : 'Unidade fechada agora'}</small></span>
          </label>
          <label class="opcao-cartao">
            <input type="radio" name="quando" value="agendar" ${aberta ? '' : 'checked'}>
            <span>${icone('relogio')} <strong>Agendar horário</strong><small>Pedido antecipado</small></span>
          </label>
        </fieldset>
        <label class="campo" data-campo-horario ${aberta ? 'hidden' : ''}>
          <span class="campo__rotulo">Horário de retirada</span>
          <select name="horario">${horarios.map((h) => html`<option value="${h}">${rotuloHorario(h)}</option>`)}</select>
        </label>
        <label class="campo">
          <span class="campo__rotulo">Nome para chamada no balcão</span>
          <input name="nomeChamada" maxlength="30" value="${r.cliente.nome.split(' ')[0]}" autocomplete="given-name">
          <small class="campo__ajuda">Aparece no painel da loja. Usamos só o primeiro nome.</small>
        </label>
      </section>

      <section class="cartao">
        <h2><span class="passo">2</span> Pagamento</h2>
        <fieldset class="opcoes-grade opcoes-grade--3">
          <legend class="sr-only">Forma de pagamento</legend>
          <label class="opcao-cartao"><input type="radio" name="metodo" value="pix" checked><span><strong>Pix</strong><small>Aprovação na hora</small></span></label>
          <label class="opcao-cartao"><input type="radio" name="metodo" value="credito"><span><strong>Crédito</strong><small>Ambiente do provedor</small></span></label>
          <label class="opcao-cartao"><input type="radio" name="metodo" value="debito"><span><strong>Débito</strong><small>Ambiente do provedor</small></span></label>
        </fieldset>
        <p class="caixa-info">${icone('escudo', 18)} <span>O pagamento é processado por um <strong>provedor externo</strong>. A Raízes do Nordeste não recebe nem guarda os dados do seu cartão: enviamos apenas o valor do pedido e recebemos a confirmação ou a recusa.</span></p>
      </section>

      <section class="cartao">
        <h2><span class="passo">3</span> Resumo</h2>
        ${itensPedido(r.itens)}
        ${linhaTotais(r.totais, { pontos })}
        ${pontos == null ? html`<p class="texto-suave">${icone('estrela', 16)} Você não participa do programa de fidelidade, então este pedido não gera pontos. <a href="#/fidelidade">Saiba mais</a>.</p>` : ''}
        <p class="texto-suave texto-pequeno">Ao confirmar, usamos seu nome, e-mail e o conteúdo do pedido para preparar, cobrar e entregar o pedido (execução de contrato – LGPD, art. 7º, V). <a href="#/politica-de-privacidade">Política de privacidade</a>.</p>
      </section>

      <p class="caixa-erro" data-erro-checkout role="alert" hidden></p>
      <div class="acoes-fixas">
        <button class="btn btn--primario btn--grande btn--bloco" data-enviar>Confirmar e pagar ${moeda(r.totais.total)}</button>
      </div>
    </form>`;
}

function formTotem(r) {
  const identificado = r.cliente;
  return html`
    <form class="checkout checkout--totem" data-checkout novalidate>
      <section class="cartao">
        <h2>Vai comer aqui ou levar?</h2>
        <fieldset class="opcoes-grade">
          <legend class="sr-only">Consumo</legend>
          <label class="opcao-cartao opcao-cartao--grande"><input type="radio" name="tipo" value="local" checked><span><span class="emoji-grande" aria-hidden="true">🍽️</span><strong>Comer aqui</strong></span></label>
          <label class="opcao-cartao opcao-cartao--grande"><input type="radio" name="tipo" value="retirada"><span><span class="emoji-grande" aria-hidden="true">🛍️</span><strong>Para levar</strong></span></label>
        </fieldset>
        <label class="campo">
          <span class="campo__rotulo">Como podemos te chamar? <small>(opcional)</small></span>
          <input name="nomeChamada" maxlength="20" autocomplete="off" placeholder="Seu primeiro nome">
          <small class="campo__ajuda">Aparece no painel de chamada e é apagado após a retirada.</small>
        </label>
      </section>

      <section class="cartao">
        <h2>${icone('estrela')} Quer pontuar no Programa Raízes?</h2>
        ${identificado ? html`
          <p class="caixa-sucesso">${icone('check', 18)} <span>Olá, ${identificado.nome.split(' ')[0]}! Este pedido vai render <strong>${pontosPorValor(r.totais.total)} pontos</strong>.</span>
            <button type="button" class="link" data-remover-id>Não sou eu</button></p>` : html`
          <p class="texto-suave">Opcional. Digite seu CPF cadastrado no app. Ele é usado <strong>apenas</strong> para encontrar sua conta e não fica salvo neste totem.</p>
          <div class="campo__linha">
            <input name="cpf" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00" aria-label="CPF para pontuar" data-cpf>
            <button type="button" class="btn btn--secundario" data-identificar>Pontuar</button>
          </div>
          <p class="texto-erro" data-erro-cpf role="alert"></p>`}
      </section>

      <section class="cartao">
        <h2>Como prefere pagar?</h2>
        <fieldset class="opcoes-grade">
          <legend class="sr-only">Forma de pagamento</legend>
          <label class="opcao-cartao opcao-cartao--grande"><input type="radio" name="metodo" value="cartao_totem" checked><span><span class="emoji-grande" aria-hidden="true">💳</span><strong>Cartão</strong><small>Na maquininha ao lado</small></span></label>
          <label class="opcao-cartao opcao-cartao--grande"><input type="radio" name="metodo" value="pix"><span><span class="emoji-grande" aria-hidden="true">📱</span><strong>Pix</strong><small>QR Code na tela</small></span></label>
        </fieldset>
      </section>

      <section class="cartao">${linhaTotais(r.totais)}</section>
      <p class="caixa-erro" data-erro-checkout role="alert" hidden></p>
      <div class="acoes-fixas">
        <button class="btn btn--primario btn--grande btn--bloco" data-enviar>Pagar ${moeda(r.totais.total)}</button>
      </div>
    </form>`;
}

export default {
  titulo: 'Finalizar pedido',
  layout: () => (store.modoTotem() ? 'totem' : 'cliente'),
  guarda: () => {
    const ctx = store.contextoAtual();
    if (!store.resumoCarrinho(ctx).quantidade) return '/sacola';
    if (ctx === 'cliente' && !store.clienteAtual()) return '/entrar?volta=/checkout&motivo=checkout';
    return null;
  },
  render() {
    const ctx = store.contextoAtual();
    const r = store.resumoCarrinho(ctx);
    return html`
      <div class="pagina pagina--estreita ${ctx === 'totem' ? 'pagina--totem' : ''}">
        <header class="pagina__topo">
          ${ctx !== 'totem' ? html`<a class="link-voltar" href="#/sacola">${icone('voltar', 18)} Sacola</a>` : ''}
          <h1>Finalizar pedido</h1>
        </header>
        ${ctx === 'totem' ? formTotem(r) : formCliente(r)}
      </div>`;
  },
  montar(raiz, ctx) {
    const c = store.contextoAtual();
    const form = raiz.querySelector('[data-checkout]');
    let enviando = false;

    const aoMudar = (e) => {
      if (e.target.name === 'quando') {
        raiz.querySelector('[data-campo-horario]').hidden = e.target.value !== 'agendar';
      }
    };
    const aoDigitar = (e) => {
      if (e.target.matches('[data-cpf]')) e.target.value = formatarCPF(e.target.value);
    };
    const aoClicar = (e) => {
      if (e.target.closest('[data-identificar]')) {
        const campo = raiz.querySelector('[data-cpf]');
        const res = store.identificarCliente(campo.value, c);
        if (res.ok) {
          aviso(`Olá, ${res.primeiroNome}! Seus pontos serão creditados.`, 'sucesso');
          ctx.rerender();
        } else {
          raiz.querySelector('[data-erro-cpf]').textContent = res.erro;
          campo.setAttribute('aria-invalid', 'true');
        }
      }
      if (e.target.closest('[data-remover-id]')) {
        store.removerIdentificacao(c);
        ctx.rerender();
      }
    };
    const aoEnviar = (e) => {
      e.preventDefault();
      if (enviando) return;
      const dados = new FormData(form);
      const agendar = dados.get('quando') === 'agendar';
      const erro = raiz.querySelector('[data-erro-checkout]');
      enviando = true;
      const botao = raiz.querySelector('[data-enviar]');
      botao.disabled = true;
      const res = store.criarPedido(c, {
        retirada: { tipo: dados.get('tipo'), horario: agendar ? dados.get('horario') : null },
        metodo: dados.get('metodo'),
        nomeChamada: dados.get('nomeChamada'),
      });
      if (!res.ok) {
        enviando = false;
        botao.disabled = false;
        erro.textContent = res.erro;
        erro.hidden = false;
        erro.focus?.();
        return;
      }
      ctx.navegar(`/pagamento/${res.pedido.id}`, { substituir: true });
    };
    form.addEventListener('change', aoMudar);
    form.addEventListener('input', aoDigitar);
    form.addEventListener('click', aoClicar);
    form.addEventListener('submit', aoEnviar);
    return () => {
      form.removeEventListener('change', aoMudar);
      form.removeEventListener('input', aoDigitar);
      form.removeEventListener('click', aoClicar);
      form.removeEventListener('submit', aoEnviar);
    };
  },
};
