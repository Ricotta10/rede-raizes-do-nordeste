import * as store from '../store.js';
import { html, icone, aviso, campoErro } from '../ui.js';
import { validarEmail } from '../domain.js';

const destinoSeguro = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/');

export default {
  titulo: 'Entrar',
  guarda: (ctx) => (store.clienteAtual() ? destinoSeguro(ctx.query.volta) : null),
  render(ctx) {
    const volta = destinoSeguro(ctx.query.volta);
    return html`
      <div class="pagina pagina--form">
        <div class="cartao cartao--form">
          <h1>Entrar</h1>
          ${ctx.query.motivo === 'checkout' ? html`<p class="caixa-info">${icone('info', 18)} <span>Para pedir pelo app ou site, entre na sua conta. Assim você acompanha o pedido de qualquer aparelho e ganha pontos. Na loja, o totem e o balcão funcionam sem cadastro.</span></p>` : ''}
          <form data-entrar novalidate>
            <label class="campo">
              <span class="campo__rotulo">E-mail</span>
              <input type="email" name="email" autocomplete="email" required aria-describedby="erro-email">
              <small class="campo__erro" id="erro-email" data-erro-de="email"></small>
            </label>
            <label class="campo">
              <span class="campo__rotulo">Senha</span>
              <span class="campo__linha">
                <input type="password" name="senha" autocomplete="current-password" required aria-describedby="erro-senha">
                <button type="button" class="btn btn--secundario btn--pequeno" data-mostrar aria-pressed="false">Mostrar</button>
              </span>
              <small class="campo__erro" id="erro-senha" data-erro-de="senha"></small>
            </label>
            <p class="caixa-erro" data-erro-geral role="alert" hidden></p>
            <button class="btn btn--primario btn--bloco btn--grande" data-enviar>Entrar</button>
          </form>
          <p class="centro">Ainda não tem conta? <a href="#/cadastro?volta=${encodeURIComponent(volta)}">Criar conta</a></p>
          <details class="caixa-demo">
            <summary>Conta de demonstração</summary>
            <p>E-mail <code>cliente@raizes.demo</code> · senha <code>cliente123</code></p>
            <button type="button" class="btn btn--secundario btn--pequeno" data-preencher>Preencher automaticamente</button>
          </details>
        </div>
      </div>`;
  },
  montar(raiz, ctx) {
    const form = raiz.querySelector('[data-entrar]');
    const geral = raiz.querySelector('[data-erro-geral]');
    const aoClicar = (e) => {
      const mostrar = e.target.closest('[data-mostrar]');
      if (mostrar) {
        const visivel = form.senha.type === 'text';
        form.senha.type = visivel ? 'password' : 'text';
        mostrar.textContent = visivel ? 'Mostrar' : 'Ocultar';
        mostrar.setAttribute('aria-pressed', String(!visivel));
      }
      if (e.target.closest('[data-preencher]')) {
        form.email.value = 'cliente@raizes.demo';
        form.senha.value = 'cliente123';
      }
    };
    const aoEnviar = async (e) => {
      e.preventDefault();
      geral.hidden = true;
      const email = form.email.value.trim();
      const senha = form.senha.value;
      campoErro(form, 'email', !email ? 'Informe seu e-mail.' : !validarEmail(email) ? 'E-mail em formato inválido.' : '');
      campoErro(form, 'senha', !senha ? 'Informe sua senha.' : '');
      if (!email || !validarEmail(email) || !senha) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      const botao = form.querySelector('[data-enviar]');
      botao.disabled = true;
      botao.textContent = 'Entrando…';
      const r = await store.entrar(email, senha);
      if (!r.ok) {
        botao.disabled = false;
        botao.textContent = 'Entrar';
        geral.textContent = r.erro;
        geral.hidden = false;
        form.senha.value = '';
        form.senha.focus();
        return;
      }
      aviso(`Olá, ${r.usuario.nome.split(' ')[0]}!`, 'sucesso');
      ctx.navegar(destinoSeguro(ctx.query.volta), { substituir: true });
    };
    form.addEventListener('submit', aoEnviar);
    raiz.addEventListener('click', aoClicar);
    return () => raiz.removeEventListener('click', aoClicar);
  },
};
