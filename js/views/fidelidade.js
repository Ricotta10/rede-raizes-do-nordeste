import * as store from '../store.js';
import { html, icone, moeda, data, aviso, dialogo } from '../ui.js';
import { NIVEIS, RECOMPENSAS } from '../data.js';
import { nivelPorPontos, proximoNivel } from '../domain.js';
import { FINALIDADES } from './cadastro.js';

function tabelaNiveis(atualId = null) {
  return html`<ul class="niveis">
    ${NIVEIS.map((n) => html`<li class="nivel ${atualId === n.id ? 'nivel--atual' : ''}" style="--cor-nivel:${n.cor}">
      <strong>${n.nome}</strong>
      <span>${n.minimo === 0 ? 'Ao entrar' : `A partir de ${n.minimo} pontos`}</span>
      <span class="nivel__beneficio">${n.desconto ? `${n.desconto}% de desconto em todo pedido` : 'Pontos em todo pedido'}</span>
    </li>`)}
  </ul>`;
}

export default {
  titulo: 'Programa Raízes',
  aoVivo: true,
  render() {
    const c = store.clienteAtual();
    const intro = html`
      <header class="pagina__topo">
        <h1>${icone('estrela', 26)} Programa Raízes</h1>
        <p class="texto-suave">A cada R$ 1,00 pago você ganha 1 ponto. Os pontos viram recompensas, e quanto mais você participa, maior o desconto progressivo do seu nível.</p>
      </header>`;

    if (!c || !c.consentimentos.fidelidade) {
      const f = FINALIDADES.find((x) => x.nome === 'fidelidade');
      return html`<div class="pagina pagina--estreita">
        ${intro}
        ${tabelaNiveis()}
        <section class="cartao">
          <h2>Como funciona a sua privacidade</h2>
          <p>${f.detalhe}</p>
          <p class="texto-suave">A participação é voluntária e pode ser encerrada a qualquer momento na Central de privacidade.</p>
          ${c ? html`<button class="btn btn--primario btn--grande" data-aderir>Quero participar</button>`
            : html`<div class="acoes-linha"><a class="btn btn--primario" href="#/cadastro?volta=/fidelidade">Criar conta</a><a class="btn btn--secundario" href="#/entrar?volta=/fidelidade">Já tenho conta</a></div>`}
        </section>
      </div>`;
    }

    const nivel = nivelPorPontos(c.pontosAcumulados);
    const prox = proximoNivel(c.pontosAcumulados);
    const progresso = prox ? Math.round(((c.pontosAcumulados - nivel.minimo) / (prox.minimo - nivel.minimo)) * 100) : 100;
    const vouchers = (c.vouchers || []).filter((v) => !v.usadoEm);

    return html`<div class="pagina pagina--estreita">
      ${intro}
      <section class="cartao-pontos" style="--cor-nivel:${nivel.cor}">
        <div>
          <span class="cartao-pontos__rotulo">Seu saldo</span>
          <strong class="cartao-pontos__valor">${c.pontos} <small>pontos</small></strong>
        </div>
        <div class="cartao-pontos__nivel">
          <span>Nível <strong>${nivel.nome}</strong>${nivel.desconto ? ` · ${nivel.desconto}% off` : ''}</span>
          <div class="progresso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso}" aria-label="Progresso para o próximo nível">
            <span style="width:${progresso}%"></span>
          </div>
          <small>${prox ? `Faltam ${prox.minimo - c.pontosAcumulados} pontos para o nível ${prox.nome}` : 'Você está no nível máximo!'}</small>
        </div>
      </section>

      ${tabelaNiveis(nivel.id)}

      ${vouchers.length ? html`<section class="secao">
        <h2>Suas recompensas</h2>
        <ul class="lista-vouchers">
          ${vouchers.map((v) => html`<li class="cartao voucher">
            <span class="voucher__emoji" aria-hidden="true">${v.emoji}</span>
            <span><strong>${v.nome}</strong><small>${v.pedidoId ? 'Reservada em um pedido em andamento' : `Use na sacola até ${data(v.validoAte)}`}</small></span>
          </li>`)}
        </ul>
      </section>` : ''}

      <section class="secao">
        <h2>Trocar pontos</h2>
        <ul class="grade-recompensas">
          ${RECOMPENSAS.map((r) => {
            const pode = c.pontos >= r.pontos;
            return html`<li class="cartao recompensa">
              <span class="recompensa__emoji" aria-hidden="true">${r.emoji}</span>
              <strong>${r.nome}</strong>
              <span class="recompensa__pontos">${r.pontos} pontos</span>
              <small class="texto-suave">Vale até ${moeda(r.valor)}</small>
              <button class="btn ${pode ? 'btn--primario' : 'btn--secundario'} btn--pequeno" data-resgatar="${r.id}" ${pode ? '' : html`disabled aria-disabled="true"`}>
                ${pode ? 'Resgatar' : `Faltam ${r.pontos - c.pontos}`}
              </button>
            </li>`;
          })}
        </ul>
      </section>

      <section class="secao">
        <h2>Extrato</h2>
        ${c.extrato.length ? html`<ul class="extrato">
          ${c.extrato.slice(0, 15).map((e) => html`<li>
            <span><strong>${e.descricao}</strong><small>${data(e.em)}</small></span>
            <span class="${e.pontos >= 0 ? 'texto-sucesso' : 'texto-erro'}">${e.pontos >= 0 ? '+' : ''}${e.pontos}</span>
          </li>`)}
        </ul>` : html`<p class="texto-suave">Seus pontos aparecem aqui depois do primeiro pedido pago.</p>`}
      </section>
      <p class="texto-suave texto-pequeno">${icone('escudo', 14)} Quer sair do programa? Acesse a <a href="#/privacidade">Central de privacidade</a>.</p>
    </div>`;
  },
  montar(raiz) {
    const aoClicar = async (e) => {
      if (e.target.closest('[data-aderir]')) {
        const f = FINALIDADES.find((x) => x.nome === 'fidelidade');
        const ok = await dialogo({
          titulo: 'Participar do Programa Raízes',
          corpo: html`<p>${f.detalhe}</p><p class="texto-suave">Ao confirmar, registramos seu consentimento com data e hora. Você pode revogá-lo quando quiser.</p>`,
          confirmar: 'Concordo e quero participar',
        });
        if (ok) {
          store.atualizarConsentimentos({ fidelidade: true });
          aviso('Bem-vindo(a) ao Programa Raízes!', 'sucesso');
        }
        return;
      }
      const b = e.target.closest('[data-resgatar]');
      if (!b) return;
      const r = RECOMPENSAS.find((x) => x.id === b.dataset.resgatar);
      const ok = await dialogo({
        titulo: 'Confirmar resgate',
        corpo: html`<p>Trocar <strong>${r.pontos} pontos</strong> por <strong>${r.nome}</strong>?</p><p class="texto-suave">A recompensa fica disponível na sacola por 30 dias e não é cumulativa com cupons.</p>`,
        confirmar: 'Resgatar',
      });
      if (!ok) return;
      const res = store.resgatarRecompensa(r.id);
      aviso(res.ok ? 'Recompensa resgatada! Use na sacola.' : res.erro, res.ok ? 'sucesso' : 'erro');
    };
    raiz.addEventListener('click', aoClicar);
    return () => raiz.removeEventListener('click', aoClicar);
  },
};
