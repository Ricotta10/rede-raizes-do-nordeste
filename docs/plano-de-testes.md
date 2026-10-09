# Plano de testes da interface – Raízes do Nordeste

## Estratégia

| Tipo | Objetivo | Como |
|---|---|---|
| Funcional (manual) | Validar os fluxos principais de cada canal | Cenários CT01–CT18 abaixo, executados no site publicado |
| Unitário automatizado | Garantir as regras de negócio (cupons, totais, estados, validações, LGPD) | `npm test` (12 testes em `tests/regras.test.js`) |
| Integração com serviço externo | Respostas do provedor de pagamento: aprovado, recusado, Pix e timeout | Painel de demonstração → "Resposta do provedor" |
| Usabilidade | Clareza do fluxo, mensagens de erro, alvos de toque no totem | Teste com 3 usuários (tarefa: pedir uma tapioca e acompanhar até a retirada) |
| Responsividade | Layout em 360 px, 768 px, 1280 px e totem (1080 × 1920) | DevTools → modo dispositivo |
| Privacidade (LGPD) | Consentimento, transparência, minimização e direitos do titular | Cenários CT13–CT17 |
| Acessibilidade | Navegação por teclado e leitor de tela | Tab/Shift+Tab, NVDA, Lighthouse |

**Ambiente:** Chrome, Edge e Firefox atuais, além do Safari no iOS. Antes de cada rodada, usar Painel de demonstração → "Restaurar dados iniciais".

## Cenários

| ID | Cenário | Tipo | Entradas / passos | Resultado esperado |
|---|---|---|---|---|
| CT01 | Cardápio por unidade | Positivo | Escolher **Salvador · Barra** (formato compacto) → Cardápio | Itens de cozinha completa (ex.: *Cuscuz com charque*) não aparecem; *Cuscuz com ovo* aparece com a receita baiana |
| CT02 | Item sazonal fora de época | Negativo | Cardápio em outubro → "Especiais de São João" | Itens desabilitados com o selo "Volta no São João"; não podem ser adicionados |
| CT03 | Item esgotado | Negativo | Recife → *Suco de graviola* | Selo "Esgotado nesta unidade"; clique não abre o diálogo |
| CT04 | Limite de estoque | Negativo | Recife → *Bolo de rolo* (4 un.) → quantidade 6 | Mensagem "Só temos 4 unidade(s)… disponível(is) agora" |
| CT05 | Cupom inválido | Negativo | Sacola → cupom `XYZ` | "Cupom não encontrado. Confira o código digitado." |
| CT06 | Cupom fora do canal | Negativo | Sacola no site → `TOTEM5` | "Cupom válido apenas em: Totem." |
| CT07 | Cupom de categoria | Positivo | Adicionar *Café sertanejo* → `CAFE10` | Desconto de 10% apenas sobre o café da manhã |
| CT08 | Checkout exige login (app/site) | Negativo | Sacola → Continuar sem estar logado | Redireciona para Entrar com o aviso explicativo; após o login, volta ao checkout |
| CT09 | Login inválido e bloqueio | Negativo | Senha errada 6 vezes seguidas | "E-mail ou senha incorretos."; após 5 erros, a próxima tentativa mostra "Muitas tentativas sem sucesso. Aguarde 30 segundos." |
| CT10 | Pagamento aprovado | Positivo | Demonstração = "Sempre aprovar" → Crédito | Etapas preenchidas → "Pagamento aprovado!" → pontos creditados → redireciona ao acompanhamento |
| CT11 | Pagamento recusado | Negativo | Demonstração = "Sempre recusar" | Motivo da recusa, "Nenhum valor foi cobrado", opções de tentar com outra forma ou cancelar |
| CT12 | Falha de comunicação (timeout) | Negativo | Demonstração = "Simular falha" | Após 7 s: "Não recebemos a resposta…" → "Verificar status" consulta o provedor e confirma sem cobrar de novo |
| CT13 | Pix | Positivo | Forma Pix | QR Code, copia e cola e contagem regressiva; "Simular pagamento" → aprovado por consulta automática |
| CT14 | Banner de cookies | LGPD | Primeiro acesso | Botões "Somente necessários", "Personalizar" e "Aceitar todos" com o mesmo destaque; escolha registrada com data |
| CT15 | Consentimentos no cadastro | LGPD | Criar conta sem marcar os termos | Erro "É preciso aceitar…"; finalidades opcionais desmarcadas por padrão; data de nascimento só aparece com "ofertas personalizadas" |
| CT16 | Revogar consentimento | LGPD | Privacidade → desmarcar Fidelidade → Salvar | Diálogo explica as consequências; histórico registra "Revogado" com data e canal |
| CT17 | Exclusão de conta | LGPD | Privacidade → Excluir → digitar `EXCLUIR` | Conta removida, sessão encerrada, pedidos anonimizados, registro "Exclusão de conta (LGPD)" na auditoria |
| CT18 | Acesso a dados pessoais pela gerência | LGPD/Auditoria | Gerente → Últimos pedidos → "Ver dados" | Aviso prévio; dados exibidos mascarados; auditoria registra quem acessou e quando |
| CT19 | Totem com CPF | Positivo/Negativo | CPF `111.111.111-11` e depois `529.982.247-25` | Primeiro: "CPF inválido"; segundo: "Olá, Ana! Este pedido vai render X pontos" |
| CT20 | Totem por inatividade | Usabilidade | Deixar o totem 90 s sem toque | Aviso "Você ainda está aí?" e reinício após 15 s, com a sacola limpa |
| CT21 | Balcão – dinheiro | Negativo | Valor recebido menor que o total | "Informe um valor recebido igual ou maior que R$ X"; com valor maior, o troco é exibido |
| CT22 | Cancelamento auditado | Positivo | Balcão → Pedidos do dia → Cancelar pedido pago | Motivo obrigatório; estorno solicitado; pontos estornados; registro na auditoria |
| CT23 | Responsividade | RNF | Telas de 360 px a 1280 px | Sem rolagem horizontal; navegação inferior no celular e superior no desktop |

## Critérios de aceite gerais

- Toda ação com efeito colateral exige confirmação e mostra o resultado (aviso visual).
- Mensagens de erro dizem o que aconteceu e como resolver.
- Nenhum dado pessoal completo aparece para a equipe; acessos ficam auditados.
- O fluxo principal (cardápio → pagamento → retirada) é concluído em menos de 2 minutos por um usuário novo.
