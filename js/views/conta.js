import * as store from '../store.js';
import { html, icone, aviso, campoErro, data } from '../ui.js';
import { mascararCPF, formatarTelefone, nivelPorPontos } from '../domain.js';

export default {
  titulo: 'Minha conta',
  guarda: () => (!store.clienteAtual() ? '/entrar?volta=/conta' : null),
  render() {
    const c = store.clienteAtual();
    const nivel = c.consentimentos.fidelidade ? nivelPorPontos(c.pontosAcumulados) : null;
    return html`<div class="pagina pagina--estreita">
      <header class="pagina__topo perfil-topo">
        <span class="avatar" aria-hidden="true">${c.nome[0]}</span>
        <div>
          <h1>${c.nome}</h1>
          <p class="texto-suave">Cliente desde ${data(c.criadoEm)}${nivel ? ` · Nível ${nivel.nome}` : ''}</p>
        </div>
      </header>

      <nav class="atalhos" aria-label="Atalhos da conta">
        <a class="cartao atalho" href="#/pedidos">${icone('recibo', 24)}<span>Meus pedidos</span></a>
        <a class="cartao atalho" href="#/fidelidade">${icone('estrela', 24)}<span>${c.consentimentos.fidelidade ? `${c.pontos} pontos` : 'Fidelidade'}</span></a>
        <a class="cartao atalho" href="#/privacidade">${icone('escudo', 24)}<span>Privacidade</span></a>
      </nav>

      <section class="cartao">
        <h2>Dados pessoais</h2>
        <form data-perfil novalidate>
          <label class="campo">
            <span class="campo__rotulo">Nome completo</span>
            <input name="nome" value="${c.nome}" autocomplete="name" maxlength="80">
            <small class="campo__erro" data-erro-de="nome"></small>
          </label>
          <label class="campo">
            <span class="campo__rotulo">E-mail</span>
            <input value="${c.email}" readonly aria-describedby="ajuda-email">
            <small class="campo__ajuda" id="ajuda-email">O e-mail é seu login. Para alterá-lo, fale com ${'privacidade@raizes.demo'}.</small>
          </label>
          <label class="campo">
            <span class="campo__rotulo">Celular <small>(opcional)</small></span>
            <input name="telefone" value="${c.telefone || ''}" inputmode="tel" autocomplete="tel">
            <small class="campo__erro" data-erro-de="telefone"></small>
          </label>
          <div class="campo">
            <span class="campo__rotulo">CPF</span>
            <p>${c.cpf ? mascararCPF(c.cpf) : 'Não informado'} <small class="texto-suave">(exibido parcialmente por segurança)</small></p>
          </div>
          <button class="btn btn--primario">Salvar alterações</button>
        </form>
      </section>

      <button class="btn btn--secundario btn--bloco" data-sair>${icone('sair', 18)} Sair da conta</button>
    </div>`;
  },
  montar(raiz, ctx) {
    const form = raiz.querySelector('[data-perfil]');
    form.addEventListener('input', (e) => {
      if (e.target.name === 'telefone') e.target.value = formatarTelefone(e.target.value);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const r = store.atualizarPerfil({ nome: form.nome.value, telefone: form.telefone.value });
      ['nome', 'telefone'].forEach((k) => campoErro(form, k, r.erros?.[k]));
      if (r.ok) {
        aviso('Dados atualizados.', 'sucesso');
        ctx.rerender();
      }
    });
    raiz.querySelector('[data-sair]').addEventListener('click', () => {
      store.sair();
      aviso('Você saiu da sua conta.', 'info');
      ctx.navegar('/');
    });
    return null;
  },
};
