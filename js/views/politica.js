import { html, icone } from '../ui.js';
import { CONTATO_DPO, VERSAO_TERMOS } from '../data.js';

export default {
  titulo: 'Política de privacidade',
  render() {
    return html`<article class="pagina pagina--texto">
      <header class="pagina__topo">
        <h1>Política de privacidade</h1>
        <p class="texto-suave">Versão ${VERSAO_TERMOS} · Texto de demonstração de um projeto acadêmico (empresa fictícia).</p>
      </header>

      <h2>1. Quem somos</h2>
      <p>A Rede Raízes do Nordeste (franqueadora e unidades franqueadas) é a controladora dos dados pessoais tratados no app, site, totens e balcões.</p>

      <h2>2. Quais dados tratamos e por quê</h2>
      <ul>
        <li><strong>Cadastro</strong> (nome, e-mail, celular e, opcionalmente, CPF): criar sua conta, identificar seus pedidos e avisar quando estiverem prontos. Base legal: execução de contrato.</li>
        <li><strong>Pedidos e pagamentos</strong> (itens, valores, unidade, canal, status do pagamento): preparar, cobrar e entregar o pedido e cumprir obrigações fiscais. Base legal: execução de contrato e obrigação legal.</li>
        <li><strong>Fidelidade</strong> (histórico de consumo, pontos): somente com seu consentimento.</li>
        <li><strong>Personalização</strong> (frequência, preferências e faixa etária): somente com seu consentimento.</li>
        <li><strong>Comunicações de marketing</strong>: somente com seu consentimento.</li>
      </ul>

      <h2>3. Pagamentos</h2>
      <p>Os pagamentos são processados por um provedor externo certificado. Não recebemos nem armazenamos número de cartão, CVV ou senha. Recebemos apenas o identificador da transação e o resultado (aprovado ou recusado).</p>

      <h2>4. Totem e balcão</h2>
      <p>O totem não exige cadastro. O CPF, quando informado para pontuar, é usado apenas para localizar sua conta e não fica gravado no equipamento. O nome para chamada é apagado após a retirada.</p>

      <h2>5. Compartilhamento</h2>
      <p>Compartilhamos dados apenas com o provedor de pagamento e prestadores de infraestrutura, sob contrato. A matriz recebe relatórios de vendas consolidados e anonimizados. A equipe das lojas vê somente o primeiro nome do cliente e os itens do pedido.</p>

      <h2>6. Retenção</h2>
      <p>Dados de cadastro: enquanto a conta estiver ativa. Pedidos: 5 anos, de forma anonimizada após a exclusão da conta (obrigação fiscal). Saldo de pontos após sair do programa: 90 dias.</p>

      <h2>7. Segurança e auditoria</h2>
      <p>Acessos a dados pessoais e operações sensíveis (cancelamentos, descontos e ajustes de estoque) são registrados em trilha de auditoria. Senhas são armazenadas apenas na forma de hash.</p>

      <h2>8. Seus direitos</h2>
      <p>Você pode acessar, corrigir, portar e excluir seus dados e revogar consentimentos na <a href="#/privacidade">Central de privacidade</a> ou pelo e-mail do encarregado: <a href="mailto:${CONTATO_DPO}">${CONTATO_DPO}</a>.</p>

      <p><a class="btn btn--secundario" href="#/privacidade">${icone('escudo', 18)} Ir para a Central de privacidade</a></p>
    </article>`;
  },
};
