# Registro de execução – testes E2E

- Executado em: 09/10/2026, 21:28:17
- Ambiente: https://ricotta10.github.io/rede-raizes-do-nordeste/ (msedge.exe, modo headless)
- Resultado: **24/24 aprovados**

| ID | Cenário | Resultado | Obtido |
|---|---|---|---|
| CT01 | Cardápio por unidade (formato e variação regional) | Aprovado | Cuscuz com charque não exibido; item regional: "Cuscuz de milho com ovo e coalho" |
| CT02 | Item sazonal fora de época | Aprovado | aria-disabled=true; selo: "Volta no São João" |
| CT03 | Item esgotado na unidade | Aprovado | Selo exibido; diálogo não abriu |
| CT04 | Limite de estoque | Aprovado | 6 un.: envio bloqueado pelo limite do campo (true); 3 + 2 un.: "Só temos 4 unidade(s) de Bolo de rolo (fatia) disponível(is) agora." |
| CT05 | Cupom inexistente | Aprovado | Cupom não encontrado. Confira o código digitado. |
| CT06 | Cupom fora do canal | Aprovado | Cupom válido apenas em: Totem. |
| CT07 | Cupom de categoria | Aprovado | Subtotal R$ 44,80 Nível Mandacaru (−3%) − R$ 1,34 Cupom CAFE10 − R$ 3,49 Total R$ 39,97 Pontos de fidelidade +39 |
| CT08 | Checkout exige login no app/site | Aprovado | #/entrar?volta=/checkout&motivo=checkout → #/checkout |
| CT09 | Login inválido e bloqueio | Aprovado | 1ª: "E-mail ou senha incorretos." · 6ª: "Muitas tentativas sem sucesso. Aguarde 30 segundos." |
| CT10 | Pagamento aprovado (cartão) | Aprovado | Pagamento aprovado → tela de acompanhamento com pontos creditados |
| CT11 | Pagamento recusado | Aprovado | Pagamento não aprovado · Transação não autorizada pelo banco emissor. |
| CT12 | Falha de comunicação com o provedor (timeout) | Aprovado | Sem resposta → "Verificar status" → aprovado com 1 tentativa (sem cobrança duplicada) |
| CT13 | Pagamento via Pix | Aprovado | QR exibido → pagamento simulado → pedido confirmado |
| CT14 | Banner de cookies | Aprovado | Botões: Somente necessários, Personalizar, Aceitar todos; desempenho=false; registrado em 2026-10-10T00:27:12.071Z |
| CT15 | Consentimentos no cadastro | Aprovado | Pré-marcados: 0; erro: "É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta."; nascimento aparece só após consentir: true |
| CT16 | Revogação de consentimento | Aprovado | Histórico: fidelidade = Revogado em 2026-10-10T00:27:20.936Z (App) |
| CT17 | Exclusão de conta (direito do titular) | Aprovado | Sessão ativa: false; conta existe: false; auditoria: CONTA_EXCLUIDA |
| CT18 | Acesso a dados pessoais pela gerência | Aprovado | Dados exibidos: Nome Ana S. E-mail cl***@raizes.demo Telefone (81) ****-32 Programa de fidelidad…; auditoria: DADOS_PESSOAIS_ACESSADOS |
| CT19 | Totem: identificação por CPF | Aprovado | Inválido: "CPF inválido. Confira os números digitados." · Válido: "Olá, Ana! Este pedido vai render 33 pontos." |
| CT20 | Totem: reinício por inatividade | Aprovado | Aviso exibido; voltou à tela inicial com sacola de 0 itens |
| CT21 | Balcão: pagamento em dinheiro | Aprovado | Informe um valor recebido igual ou maior que R$ 22,40. · Troco: R$ 27,60 |
| CT22 | Cancelamento auditado de pedido pago | Aprovado | CANCELADO; pagamento estornado; auditoria: Motivo: Cliente desistiu no balcão. Valor: R$ 15,42 (estorno solicitado ao provedor) |
| CT23 | Responsividade sem rolagem horizontal | Aprovado | 27 combinações de tela × largura sem rolagem horizontal nem erros de script |
| CT24 | Controle de acesso por perfil | Aprovado | Visitante → #/equipe; atendente em /cozinha → #/equipe/balcao; em /gerencia → #/equipe/balcao |
