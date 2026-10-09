import * as store from '../store.js';
import { html, icone, aviso } from '../ui.js';
import { PAPEIS } from '../data.js';

export const rotaInicialEquipe = (papel) =>
  ({ atendente: '/equipe/balcao', cozinha: '/equipe/cozinha', gerente: '/equipe/gerencia', admin: '/equipe/gerencia' }[papel] || '/equipe');

// Guarda reutilizada pelas telas internas: exige sessão e papel autorizado.
export function exigirPapel(...papeis) {
  return () => {
    const m = store.membroEquipe();
    if (!m) return '/equipe';
    if (!papeis.includes(m.papel)) return rotaInicialEquipe(m.papel);
    return null;
  };
}

const DEMO = [
  ['atendente@raizes.demo', 'atendente'],
  ['cozinha@raizes.demo', 'cozinha'],
  ['gerente@raizes.demo', 'gerente'],
  ['matriz@raizes.demo', 'admin'],
];

export default {
  titulo: 'Área da equipe',
  layout: 'equipe',
  guarda: () => {
    const m = store.membroEquipe();
    return m ? rotaInicialEquipe(m.papel) : null;
  },
  render() {
    return html`<div class="pagina pagina--form">
      <div class="cartao cartao--form">
        <h1>${icone('caixa', 24)} Sistema interno</h1>
        <p class="texto-suave">Acesso restrito a colaboradores. Cada perfil vê apenas as funções da sua atividade.</p>
        <form data-entrar-equipe novalidate>
          <label class="campo"><span class="campo__rotulo">E-mail corporativo</span><input type="email" name="email" autocomplete="username" required></label>
          <label class="campo"><span class="campo__rotulo">Senha</span><input type="password" name="senha" autocomplete="current-password" required></label>
          <p class="caixa-erro" data-erro role="alert" hidden></p>
          <button class="btn btn--primario btn--bloco btn--grande">Entrar</button>
        </form>
        <div class="caixa-demo">
          <strong>Perfis de demonstração</strong> <small>(senha <code>equipe123</code>)</small>
          <div class="acoes-linha">
            ${DEMO.map(([email, papel]) => html`<button type="button" class="btn btn--secundario btn--pequeno" data-demo="${email}">${PAPEIS[papel]}</button>`)}
          </div>
        </div>
        <p class="texto-suave texto-pequeno">Dica: abra o site do cliente em uma aba e a cozinha em outra para ver o pedido mudar de status nas duas telas.</p>
      </div>
    </div>`;
  },
  montar(raiz, ctx) {
    const form = raiz.querySelector('[data-entrar-equipe]');
    const erro = raiz.querySelector('[data-erro]');
    const entrar = async () => {
      erro.hidden = true;
      const r = await store.entrarEquipe(form.email.value, form.senha.value);
      if (!r.ok) {
        erro.textContent = r.erro;
        erro.hidden = false;
        return;
      }
      aviso(`Bom trabalho, ${r.membro.nome.split(' ')[0]}!`, 'sucesso');
      ctx.navegar(rotaInicialEquipe(r.membro.papel), { substituir: true });
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      entrar();
    });
    const aoClicar = (e) => {
      const b = e.target.closest('[data-demo]');
      if (!b) return;
      form.email.value = b.dataset.demo;
      form.senha.value = 'equipe123';
      entrar();
    };
    raiz.addEventListener('click', aoClicar);
    return () => raiz.removeEventListener('click', aoClicar);
  },
};
