import * as store from '../store.js';
import { html, icone, aviso, campoErro } from '../ui.js';
import { validarSenha, formatarCPF, formatarTelefone } from '../domain.js';

const destinoSeguro = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/');

// Cada finalidade de tratamento é um consentimento separado, desmarcado por padrão (LGPD, art. 8º).
export const FINALIDADES = [
  {
    nome: 'fidelidade',
    titulo: 'Participar do Programa Raízes (fidelidade)',
    resumo: 'Acumular pontos, subir de nível e trocar por recompensas.',
    detalhe: 'Usamos o histórico dos seus pedidos (itens, valores, datas e unidades) para calcular pontos e níveis. Sem este consentimento você pode pedir normalmente, mas não acumula pontos.',
  },
  {
    nome: 'personalizacao',
    titulo: 'Receber ofertas personalizadas',
    resumo: 'Sugestões e campanhas de acordo com seu perfil.',
    detalhe: 'Usamos frequência de consumo, itens preferidos e faixa etária (calculada pela data de nascimento) para sugerir produtos e incluir você em campanhas segmentadas. Relatórios internos usam apenas dados agregados e anonimizados.',
  },
  {
    nome: 'comunicacoes',
    titulo: 'Receber novidades por e-mail e WhatsApp',
    resumo: 'Promoções, lançamentos e cardápio de São João.',
    detalhe: 'Enviamos no máximo 2 mensagens por semana. Você pode cancelar a qualquer momento pelo link da mensagem ou na Central de privacidade.',
  },
];

export function blocoConsentimento(f, marcado = false) {
  return html`<div class="consentimento">
    <label class="opcao-consentimento">
      <input type="checkbox" name="${f.nome}" ${marcado ? 'checked' : ''}>
      <span><strong>${f.titulo}</strong><small>${f.resumo}</small></span>
    </label>
    <details class="consentimento__detalhe">
      <summary>Como usamos seus dados</summary>
      <p>${f.detalhe}</p>
    </details>
  </div>`;
}

export default {
  titulo: 'Criar conta',
  guarda: (ctx) => (store.clienteAtual() ? destinoSeguro(ctx.query.volta) : null),
  render(ctx) {
    return html`
      <div class="pagina pagina--form">
        <div class="cartao cartao--form cartao--form-largo">
          <h1>Criar conta</h1>
          <p class="texto-suave">Pedimos apenas o necessário. Campos opcionais estão indicados.</p>
          <form data-cadastro novalidate>
            <fieldset>
              <legend>Seus dados</legend>
              <label class="campo">
                <span class="campo__rotulo">Nome completo</span>
                <input name="nome" autocomplete="name" required maxlength="80">
                <small class="campo__erro" data-erro-de="nome"></small>
              </label>
              <label class="campo">
                <span class="campo__rotulo">E-mail</span>
                <input type="email" name="email" autocomplete="email" required>
                <small class="campo__ajuda">Usado para login e para enviar o comprovante do pedido.</small>
                <small class="campo__erro" data-erro-de="email"></small>
              </label>
              <div class="campos-lado">
                <label class="campo">
                  <span class="campo__rotulo">Celular <small>(opcional)</small></span>
                  <input name="telefone" inputmode="tel" autocomplete="tel" placeholder="(81) 99999-9999">
                  <small class="campo__ajuda">Para avisar quando o pedido estiver pronto.</small>
                  <small class="campo__erro" data-erro-de="telefone"></small>
                </label>
                <label class="campo">
                  <span class="campo__rotulo">CPF <small>(opcional)</small></span>
                  <input name="cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00">
                  <small class="campo__ajuda">Só para pontuar no totem e no balcão sem precisar do celular.</small>
                  <small class="campo__erro" data-erro-de="cpf"></small>
                </label>
              </div>
              <div class="campos-lado">
                <label class="campo">
                  <span class="campo__rotulo">Senha</span>
                  <input type="password" name="senha" autocomplete="new-password" required aria-describedby="forca-senha">
                  <span class="forca" id="forca-senha" data-forca aria-live="polite">Mínimo de 8 caracteres, com letras e números.</span>
                  <small class="campo__erro" data-erro-de="senha"></small>
                </label>
                <label class="campo">
                  <span class="campo__rotulo">Confirme a senha</span>
                  <input type="password" name="confirmacao" autocomplete="new-password" required>
                  <small class="campo__erro" data-erro-de="confirmacao"></small>
                </label>
              </div>
            </fieldset>

            <fieldset class="consentimentos">
              <legend>${icone('escudo', 18)} Privacidade e consentimentos</legend>
              <p class="texto-suave">Os itens abaixo são opcionais e independentes. Você pode mudar de ideia quando quiser na Central de privacidade.</p>
              ${FINALIDADES.map((f) => blocoConsentimento(f))}
              <label class="campo" data-campo-nascimento hidden>
                <span class="campo__rotulo">Data de nascimento <small>(opcional)</small></span>
                <input type="date" name="nascimento" max="${new Date().toISOString().slice(0, 10)}">
                <small class="campo__ajuda">Só é guardada se você aceitar ofertas personalizadas. Usada para campanhas por faixa etária e no mês do seu aniversário.</small>
                <small class="campo__erro" data-erro-de="nascimento"></small>
              </label>
              <label class="opcao-consentimento opcao-consentimento--obrigatoria">
                <input type="checkbox" name="termos" required>
                <span><strong>Li e aceito os Termos de Uso e a <a href="#/politica-de-privacidade" target="_blank" rel="noopener">Política de Privacidade</a></strong>
                <small>Obrigatório para criar a conta. Seus dados de cadastro e pedidos são tratados para executar o serviço que você contrata.</small></span>
              </label>
              <small class="campo__erro" data-erro-de="termos"></small>
            </fieldset>

            <p class="caixa-erro" data-erro-geral role="alert" hidden></p>
            <button class="btn btn--primario btn--bloco btn--grande" data-enviar>Criar conta</button>
          </form>
          <p class="centro">Já tem conta? <a href="#/entrar?volta=${encodeURIComponent(destinoSeguro(ctx.query.volta))}">Entrar</a></p>
        </div>
      </div>`;
  },
  montar(raiz, ctx) {
    const form = raiz.querySelector('[data-cadastro]');
    const aoDigitar = (e) => {
      const t = e.target;
      if (t.name === 'cpf') t.value = formatarCPF(t.value);
      if (t.name === 'telefone') t.value = formatarTelefone(t.value);
      if (t.name === 'senha') {
        const faltas = validarSenha(t.value);
        const forca = raiz.querySelector('[data-forca]');
        forca.textContent = !t.value ? 'Mínimo de 8 caracteres, com letras e números.'
          : faltas.length ? `Falta: ${faltas.join(', ')}.` : 'Senha forte o suficiente ✓';
        forca.dataset.ok = String(!faltas.length);
      }
    };
    const aoMudar = (e) => {
      if (e.target.name === 'personalizacao') {
        raiz.querySelector('[data-campo-nascimento]').hidden = !e.target.checked;
        if (!e.target.checked) form.nascimento.value = '';
      }
    };
    const aoEnviar = async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      ['termos', 'fidelidade', 'personalizacao', 'comunicacoes'].forEach((k) => { dados[k] = form[k].checked; });
      const erros = store.validarCadastro(dados);
      ['nome', 'email', 'telefone', 'cpf', 'senha', 'confirmacao', 'nascimento', 'termos'].forEach((k) => campoErro(form, k, erros[k]));
      if (Object.keys(erros).length) {
        const geral = raiz.querySelector('[data-erro-geral]');
        geral.textContent = `Corrija ${Object.keys(erros).length === 1 ? 'o campo destacado' : `os ${Object.keys(erros).length} campos destacados`} para continuar.`;
        geral.hidden = false;
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      const botao = form.querySelector('[data-enviar]');
      botao.disabled = true;
      botao.textContent = 'Criando conta…';
      const r = await store.cadastrar(dados);
      if (!r.ok) {
        botao.disabled = false;
        botao.textContent = 'Criar conta';
        Object.entries(r.erros).forEach(([k, v]) => campoErro(form, k, v));
        return;
      }
      aviso(`Conta criada. Bem-vindo(a), ${r.usuario.nome.split(' ')[0]}!`, 'sucesso');
      ctx.navegar(destinoSeguro(ctx.query.volta), { substituir: true });
    };
    form.addEventListener('input', aoDigitar);
    form.addEventListener('change', aoMudar);
    form.addEventListener('submit', aoEnviar);
    return null;
  },
};
