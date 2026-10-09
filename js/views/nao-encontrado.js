import { html } from '../ui.js';
import { vazio } from './comum.js';

export default {
  titulo: 'Página não encontrada',
  render() {
    return html`<div class="pagina">${vazio({
      icone: 'alerta',
      titulo: 'Página não encontrada',
      texto: 'O endereço pode ter mudado. Que tal voltar ao início?',
      acao: { href: '#/', rotulo: 'Ir para o início' },
    })}</div>`;
  },
};
