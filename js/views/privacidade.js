// Central de privacidade: direitos do titular (LGPD, art. 18) acessíveis pela interface.

import * as store from '../store.js';
import { html, icone, aviso, dialogo, baixarArquivo, dataHora } from '../ui.js';
import { mascararCPF, mascararEmail, idade, faixaEtaria } from '../domain.js';
import { CONTATO_DPO } from '../data.js';
import { FINALIDADES, blocoConsentimento } from './cadastro.js';

const NOMES_FINALIDADE = {
  termos: 'Termos de uso e política',
  fidelidade: 'Programa de fidelidade',
  personalizacao: 'Ofertas personalizadas',
  comunicacoes: 'Comunicações de marketing',
};

function inventario(c) {
  const linhas = [
    ['Nome', c.nome, 'Identificação, chamada no balcão', 'Execução de contrato'],
    ['E-mail', mascararEmail(c.email), 'Login e comprovantes', 'Execução de contrato'],
    ['Celular', c.telefone || '—', 'Aviso de pedido pronto', 'Execução de contrato'],
    ['CPF', c.cpf ? mascararCPF(c.cpf) : '—', 'Identificação no totem/balcão', 'Execução de contrato'],
    ['Histórico de pedidos', `${store.pedidosDoCliente(c.id).length} pedidos`, 'Atendimento e obrigações fiscais', 'Obrigação legal'],
    ['Pontos e nível', c.consentimentos.fidelidade ? `${c.pontos} pontos` : 'Não participa', 'Programa de fidelidade', 'Consentimento'],
    ['Data de nascimento', c.nascimento ? `Faixa ${faixaEtaria(idade(c.nascimento))}` : '—', 'Campanhas por faixa etária', 'Consentimento'],
  ];
  return html`<div class="tabela-rolagem"><table class="tabela">
    <caption class="sr-only">Dados pessoais tratados</caption>
    <thead><tr><th scope="col">Dado</th><th scope="col">O que temos</th><th scope="col">Para quê</th><th scope="col">Base legal</th></tr></thead>
    <tbody>${linhas.map((l) => html`<tr>${l.map((v, i) => (i === 0 ? html`<th scope="row">${v}</th>` : html`<td>${v}</td>`))}</tr>`)}</tbody>
  </table></div>`;
}

export default {
  titulo: 'Central de privacidade',
  render() {
    const c = store.clienteAtual();
    const cookies = store.consentimentoCookies();
    return html`<div class="pagina pagina--estreita">
      <header class="pagina__topo">
        <h1>${icone('escudo', 26)} Central de privacidade</h1>
        <p class="texto-suave">“Conhecer o cliente é importante, mas respeitar sua privacidade é obrigatório.” Aqui você controla como a Raízes do Nordeste usa seus dados, conforme a LGPD (Lei nº 13.709/2018).</p>
      </header>

      ${c ? html`
        <section class="cartao">
          <h2>Seus consentimentos</h2>
          <p class="texto-suave">Cada finalidade é independente. Desativar não afeta seus pedidos.</p>
          <form data-consentimentos>
            ${FINALIDADES.map((f) => blocoConsentimento(f, c.consentimentos[f.nome]))}
            <label class="campo" data-campo-nascimento ${c.consentimentos.personalizacao ? '' : 'hidden'}>
              <span class="campo__rotulo">Data de nascimento <small>(opcional)</small></span>
              <input type="date" name="nascimento" value="${c.nascimento || ''}" max="${new Date().toISOString().slice(0, 10)}">
            </label>
            <button class="btn btn--primario">Salvar escolhas</button>
          </form>
        </section>

        <section class="cartao">
          <h2>Dados que temos sobre você</h2>
          ${inventario(c)}
          <div class="acoes-linha">
            <button class="btn btn--secundario" data-exportar>${icone('baixar', 18)} Baixar meus dados (JSON)</button>
            <a class="btn btn--secundario" href="#/conta">Corrigir meus dados</a>
          </div>
        </section>

        <section class="cartao">
          <h2>Histórico de consentimentos</h2>
          <p class="texto-suave">Registramos quando e por qual canal você deu ou retirou cada consentimento.</p>
          <ul class="extrato">
            ${c.historicoConsentimentos.slice(0, 12).map((h) => html`<li>
              <span><strong>${NOMES_FINALIDADE[h.finalidade]}</strong><small>${dataHora(h.em)} · ${h.canal}</small></span>
              <span class="${h.valor ? 'texto-sucesso' : 'texto-erro'}">${h.valor ? 'Concedido' : 'Revogado'}</span>
            </li>`)}
          </ul>
        </section>

        <section class="cartao cartao--perigo">
          <h2>Excluir minha conta</h2>
          <p>Seus dados pessoais, pontos e recompensas serão apagados. Os pedidos já realizados são mantidos sem identificação, apenas para fins fiscais.</p>
          <button class="btn btn--perigo" data-excluir>${icone('lixeira', 18)} Excluir conta</button>
        </section>` : html`
        <section class="cartao">
          <h2>Seus dados de cadastro</h2>
          <p>Para ver, baixar, corrigir ou excluir seus dados e gerenciar consentimentos, entre na sua conta.</p>
          <a class="btn btn--primario" href="#/entrar?volta=/privacidade">Entrar</a>
        </section>`}

      <section class="cartao">
        <h2>Cookies neste navegador</h2>
        <p>${cookies
          ? `Necessários: sim · Desempenho: ${cookies.desempenho ? 'sim' : 'não'} · Personalização: ${cookies.personalizacao ? 'sim' : 'não'} (escolha feita em ${dataHora(cookies.em)})`
          : 'Você ainda não escolheu suas preferências de cookies.'}</p>
        <button class="btn btn--secundario" data-acao="cookies-preferencias">Alterar preferências de cookies</button>
      </section>

      <section class="cartao">
        <h2>Seus direitos</h2>
        <ul class="lista-simples">
          <li>Confirmar se tratamos seus dados e acessá-los.</li>
          <li>Corrigir dados incompletos ou desatualizados.</li>
          <li>Pedir anonimização, bloqueio ou eliminação de dados desnecessários.</li>
          <li>Portabilidade (download em formato aberto).</li>
          <li>Revogar consentimentos a qualquer momento.</li>
        </ul>
        <p>Encarregado de dados (DPO): <a href="mailto:${CONTATO_DPO}">${CONTATO_DPO}</a> · Prazo de resposta: até 15 dias.</p>
        <a href="#/politica-de-privacidade">Ler a política de privacidade completa</a>
      </section>
    </div>`;
  },
  montar(raiz, ctx) {
    const form = raiz.querySelector('[data-consentimentos]');
    form?.addEventListener('change', (e) => {
      if (e.target.name === 'personalizacao') raiz.querySelector('[data-campo-nascimento]').hidden = !e.target.checked;
    });
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const c = store.clienteAtual();
      const novos = { fidelidade: form.fidelidade.checked, personalizacao: form.personalizacao.checked, comunicacoes: form.comunicacoes.checked };
      if (c.consentimentos.fidelidade && !novos.fidelidade) {
        const ok = await dialogo({
          titulo: 'Sair do Programa Raízes?',
          corpo: html`<p>Você deixará de acumular pontos e não poderá resgatar recompensas. Seu saldo de <strong>${c.pontos} pontos</strong> fica guardado por 90 dias caso você volte; depois disso é apagado.</p>`,
          confirmar: 'Sair do programa', perigo: true,
        });
        if (!ok) return;
      }
      store.atualizarConsentimentos(novos, form.nascimento?.value || null);
      aviso('Suas escolhas de privacidade foram salvas.', 'sucesso');
      ctx.rerender();
    });

    raiz.querySelector('[data-exportar]')?.addEventListener('click', () => {
      const dados = store.exportarDados();
      baixarArquivo(`meus-dados-raizes-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dados, null, 2));
      aviso('Arquivo gerado com seus dados.', 'sucesso');
    });

    raiz.querySelector('[data-excluir]')?.addEventListener('click', async () => {
      const r = await dialogo({
        titulo: 'Excluir conta definitivamente',
        corpo: html`<p>Esta ação não pode ser desfeita. Para confirmar, digite <strong>EXCLUIR</strong> abaixo.</p>
          <label class="campo"><span class="sr-only">Confirmação</span><input name="confirmacao" autocomplete="off" required pattern="EXCLUIR"></label>`,
        confirmar: 'Excluir minha conta', perigo: true,
      });
      if (!r) return;
      if (r.confirmacao !== 'EXCLUIR') {
        aviso('Confirmação incorreta. A conta não foi excluída.', 'erro');
        return;
      }
      store.excluirConta();
      aviso('Sua conta foi excluída e seus dados pessoais apagados.', 'info');
      ctx.navegar('/');
    });
    return null;
  },
};
