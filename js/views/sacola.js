import * as store from '../store.js';
import { html, icone, moeda, aviso } from '../ui.js';
import { pontosPorValor } from '../domain.js';
import { linhaTotais, vazio } from './comum.js';

export default {
  titulo: 'Sacola',
  aoVivo: true,
  layout: () => (store.modoTotem() ? 'totem' : 'cliente'),
  render() {
    const ctx = store.contextoAtual();
    const totem = ctx === 'totem';
    const r = store.resumoCarrinho(ctx);
    if (!r.quantidade) {
      return html`<div class="pagina">${vazio({
        icone: 'sacola', titulo: 'Sua sacola está vazia',
        texto: 'Que tal um cuscuz com ovo ou uma tapioca de carne de sol?',
        acao: { href: '#/cardapio', rotulo: 'Ver cardápio' },
      })}</div>`;
    }
    const vouchers = !totem && r.cliente ? (r.cliente.vouchers || []).filter((v) => !v.usadoEm && !v.pedidoId) : [];
    const pontos = r.cliente?.consentimentos?.fidelidade ? pontosPorValor(r.totais.total) : null;

    return html`
      <div class="pagina pagina--estreita ${totem ? 'pagina--totem' : ''}">
        <header class="pagina__topo">
          <h1>Sua sacola</h1>
          <p class="texto-suave">${icone('pin', 16)} ${r.unidade.nome}</p>
        </header>

        ${r.indisponiveis.length ? html`
          <div class="caixa-erro" role="alert">${icone('alerta', 18)}
            <span>Alguns itens ficaram indisponíveis nesta unidade enquanto você escolhia: <strong>${r.indisponiveis.map((i) => i.nome).join(', ')}</strong>. Ajuste a quantidade ou remova para continuar.</span>
          </div>` : ''}

        <ul class="linhas-sacola">
          ${r.itens.map((i) => {
            const problema = !i.disp.disponivel || i.qtd > i.disp.quantidade;
            return html`<li class="linha-sacola ${problema ? 'linha-sacola--problema' : ''}">
              <span class="linha-sacola__emoji" aria-hidden="true">${i.emoji}</span>
              <div class="linha-sacola__info">
                <strong>${i.nome}</strong>
                ${i.obs ? html`<small>Obs.: ${i.obs}</small>` : ''}
                ${problema ? html`<small class="texto-erro">${i.disp.disponivel ? `Disponível: ${i.disp.quantidade}` : i.disp.rotulo}</small>` : ''}
                <span class="linha-sacola__preco">${moeda(i.preco * i.qtd)}</span>
              </div>
              <div class="contador-qtd" role="group" aria-label="Quantidade de ${i.nome}">
                <button class="btn-icone" data-qtd="${i.linhaId}" data-delta="-1" aria-label="${i.qtd === 1 ? 'Remover' : 'Diminuir'} ${i.nome}">${icone(i.qtd === 1 ? 'lixeira' : 'menos', 18)}</button>
                <span aria-live="polite">${i.qtd}</span>
                <button class="btn-icone" data-qtd="${i.linhaId}" data-delta="1" aria-label="Aumentar ${i.nome}">${icone('mais', 18)}</button>
              </div>
            </li>`;
          })}
        </ul>
        <a class="link" href="#/cardapio">${icone('mais', 16)} Adicionar mais itens</a>

        <section class="cartao secao-beneficios">
          <h2>Descontos</h2>
          ${r.carrinho.cupom ? html`
            <div class="cupom-aplicado ${r.cupomErro ? 'cupom-aplicado--erro' : ''}">
              <span>${icone('tag', 18)} Cupom <strong>${r.carrinho.cupom}</strong></span>
              <button class="link" data-acao-sacola="remover-cupom">Remover</button>
            </div>
            ${r.cupomErro ? html`<p class="texto-erro" role="alert">${r.cupomErro}</p>` : html`<p class="texto-sucesso">${r.promocao.descricao}</p>`}
          ` : html`
            <form class="form-cupom" data-form-cupom novalidate>
              <label class="campo">
                <span class="campo__rotulo">Cupom de desconto</span>
                <span class="campo__linha">
                  <input name="cupom" autocomplete="off" autocapitalize="characters" placeholder="Ex.: CAFE10" maxlength="20">
                  <button class="btn btn--secundario">Aplicar</button>
                </span>
              </label>
              <p class="texto-erro" data-erro-cupom role="alert"></p>
            </form>`}

          ${vouchers.length ? html`
            <fieldset class="vouchers">
              <legend>Usar uma recompensa ${r.carrinho.cupom ? html`<small>(não é possível junto com cupom)</small>` : ''}</legend>
              <label class="opcao">
                <input type="radio" name="voucher" value="" ${!r.carrinho.voucherId ? 'checked' : ''} ${r.carrinho.cupom ? 'disabled' : ''}>
                <span>Não usar agora</span>
              </label>
              ${vouchers.map((v) => html`
                <label class="opcao">
                  <input type="radio" name="voucher" value="${v.id}" ${r.carrinho.voucherId === v.id ? 'checked' : ''} ${r.carrinho.cupom ? 'disabled' : ''}>
                  <span>${v.emoji} ${v.nome} <small>(até ${moeda(v.valor)})</small></span>
                </label>`)}
            </fieldset>` : ''}

          ${r.nivel?.desconto ? html`<p class="texto-suave">${icone('estrela', 16)} Desconto do nível ${r.nivel.nome} aplicado automaticamente.</p>` : ''}
          ${!totem && !r.cliente ? html`<p class="texto-suave">${icone('estrela', 16)} <a href="#/entrar?volta=/sacola">Entre na sua conta</a> para ganhar pontos e usar recompensas.</p>` : ''}
        </section>

        <section class="cartao">
          ${linhaTotais(r.totais, { pontos })}
        </section>

        <div class="acoes-fixas">
          <a class="btn btn--primario btn--grande btn--bloco ${r.indisponiveis.length ? 'btn--desabilitado' : ''}"
            href="#/checkout" ${r.indisponiveis.length ? html`aria-disabled="true" data-bloqueado` : ''}>
            Continuar · ${moeda(r.totais.total)}
          </a>
        </div>
      </div>`;
  },
  montar(raiz, ctx) {
    const c = store.contextoAtual();
    const aoClicar = (e) => {
      const q = e.target.closest('[data-qtd]');
      if (q) {
        const linha = store.carrinho(c).itens.find((i) => i.id === q.dataset.qtd);
        if (!linha) return;
        const res = store.alterarQuantidade(linha.id, linha.qtd + Number(q.dataset.delta), c);
        if (!res.ok && res.erro) aviso(res.erro, 'erro');
        return;
      }
      if (e.target.closest('[data-acao-sacola="remover-cupom"]')) {
        store.removerCupom(c);
        return;
      }
      if (e.target.closest('[data-bloqueado]')) {
        e.preventDefault();
        aviso('Revise os itens indisponíveis antes de continuar.', 'erro');
      }
    };
    const aoEnviar = (e) => {
      if (!e.target.matches('[data-form-cupom]')) return;
      e.preventDefault();
      const codigo = e.target.cupom.value;
      const res = store.aplicarCupom(codigo, c);
      if (res.ok) aviso(`Cupom ${res.promocao.cupom} aplicado!`, 'sucesso');
      else {
        const el = raiz.querySelector('[data-erro-cupom]');
        if (el) el.textContent = res.erro;
        e.target.cupom.setAttribute('aria-invalid', 'true');
        e.target.cupom.focus();
      }
    };
    const aoMudar = (e) => {
      if (e.target.name === 'voucher') store.selecionarVoucher(e.target.value, c);
    };
    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('submit', aoEnviar);
    raiz.addEventListener('change', aoMudar);
    return () => {
      raiz.removeEventListener('click', aoClicar);
      raiz.removeEventListener('submit', aoEnviar);
      raiz.removeEventListener('change', aoMudar);
    };
  },
};
