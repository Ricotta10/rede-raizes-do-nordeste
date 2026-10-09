# Rede Raízes do Nordeste – Front-end multicanal

Projeto Multidisciplinar UNINTER 2026 · **Trilha Front-End** · Entrega técnica **Opção B (codificação)**.

Interface do sistema da rede de lanchonetes nordestinas **Raízes do Nordeste**, cobrindo os canais **App/Site, Totem de autoatendimento e Balcão**, além dos painéis internos de **Cozinha, Gerência da unidade e Matriz**. Os dados são simulados (*mock data*) e o pagamento é feito por um **provedor externo simulado**.

- **Site publicado:** https://ricotta10.github.io/rede-raizes-do-nordeste/
- **Repositório:** https://github.com/Ricotta10/rede-raizes-do-nordeste

> Empresa, pessoas, CPFs e transações são fictícios. Nenhum pagamento real é processado.

---

## Como testar (roteiro rápido para o avaliador)

| Perfil | Acesso | Credenciais de teste |
|---|---|---|
| Cliente (App/Site) | menu **Entrar** | `cliente@raizes.demo` / `cliente123` |
| Totem | rodapé → **Modo totem** | sem login (CPF opcional `529.982.247-25`) |
| Atendente (Balcão) | rodapé → **Área da equipe** | `atendente@raizes.demo` / `equipe123` |
| Cozinha | Área da equipe | `cozinha@raizes.demo` / `equipe123` |
| Gerente da unidade | Área da equipe | `gerente@raizes.demo` / `equipe123` |
| Matriz (administração) | Área da equipe | `matriz@raizes.demo` / `equipe123` |

1. **Jornada do cliente:** Início → escolher unidade → Cardápio → adicionar itens → Sacola (cupom `CAFE10`, `BEMVINDO` ou recompensa) → Entrar → Finalizar → Pagamento (Pix ou cartão) → Acompanhar pedido → retirada com o código.
2. **Painel de demonstração** (rodapé): força a resposta do provedor de pagamento (**aprovar**, **recusar** ou **sem resposta/timeout**), liga/desliga a simulação automática da cozinha e restaura os dados iniciais.
3. **Visão multicanal ao vivo:** abra o site do cliente em uma aba e a **Cozinha** ou o **Balcão** em outra. O status do pedido muda nas duas telas em tempo real.

---

## Requisitos atendidos

### Funcionais

| Código | Requisito | Onde ver |
|---|---|---|
| RF01 | Cadastro e autenticação de clientes (validações, senha forte, bloqueio após 5 tentativas) | `#/cadastro`, `#/entrar` |
| RF02 | Escolha de unidade com status aberto/fechado e formato (cozinha completa/compacta) | `#/unidades` |
| RF03 | Cardápio **dinâmico por unidade**: formato da loja, estoque local, item pausado, sazonal (São João) e variação regional de receita | `#/cardapio` |
| RF04 | Sacola com quantidades, observações para a cozinha e revalidação de estoque | `#/sacola` |
| RF05 | Pedido para levar/comer na loja, **o quanto antes ou agendado** (pedido antecipado) | `#/checkout` |
| RF06 | **Solicitação de pagamento a serviço externo** com retorno visual: aprovado, recusado, Pix pendente/expirado e falha de comunicação com reconciliação | `#/pagamento/:id` |
| RF07 | Acompanhamento do status do pedido em tempo real + código de retirada | `#/pedido/:id`, `#/pedidos` |
| RF08 | Programa de fidelidade: pontos, níveis com desconto progressivo, resgate de recompensas, extrato | `#/fidelidade` |
| RF09 | Promoções e campanhas com regras por canal, região, segmento, mínimo e validade | `#/promocoes` |
| RF10 | Totem de autoatendimento: sem cadastro, CPF opcional para pontuar, reinício por inatividade | `#/totem` |
| RF11 | Balcão (PDV): registrar pedido, troco, fila de retirada, cancelamento com motivo | `#/equipe/balcao` |
| RF12 | Cozinha (KDS): fila por status com tempo de espera (SLA) e observações | `#/equipe/cozinha` |
| RF13 | Gerência/Matriz: vendas por unidade/região/canal, produtos mais vendidos, relatório financeiro, estoque, campanhas, exportação CSV | `#/equipe/gerencia` |
| RF14 | **Auditoria** de cancelamentos, ajustes de estoque, campanhas e acessos a dados pessoais | Gerência → Auditoria |
| RF15 | **LGPD**: banner de cookies, consentimentos separados por finalidade, histórico de consentimentos, download dos dados (portabilidade), correção, exclusão de conta com anonimização | `#/privacidade` |

### Não funcionais

| Código | Requisito | Como foi atendido |
|---|---|---|
| RNF01 | **Mobile-first** | CSS escrito para celular e ampliado com `min-width` (600, 768, 1100 px); navegação inferior no celular |
| RNF02 | **Responsividade** | Grades fluidas; layouts próprios para celular, desktop, totem (alvos de toque grandes) e equipe |
| RNF03 | Desempenho | Sem framework e sem etapa de build; ES Modules nativos; imagens substituídas por emoji/SVG; atualização parcial do DOM em contadores |
| RNF04 | Disponibilidade/tolerância a falhas | PWA com *service worker* (rede primeiro, cache de reserva); tempo limite no pagamento; idempotência e consulta de status antes de nova cobrança |
| RNF05 | Escalabilidade | Regras de negócio isoladas (`domain.js`), camada de dados (`store.js`) e provedor externo (`services/gateway.js`) desacoplados: trocar o mock por API REST não altera as telas |
| RNF06 | Segurança | Escape automático de HTML (anti-XSS), senhas com hash SHA-256, mensagens de login genéricas, controle de acesso por perfil, mascaramento de dados pessoais |
| RNF07 | Acessibilidade | HTML semântico, *skip link*, foco gerenciado na troca de tela, `aria-live` para status, contraste, `prefers-reduced-motion` |
| RNF08 | Privacidade (LGPD) | Minimização (data de nascimento só com consentimento), agregação com k ≥ 5 nos relatórios de campanha, auditoria de acessos |

---

## Arquitetura

```
index.html            → casca da SPA (roteamento por hash, compatível com GitHub Pages)
css/estilos.css       → estilos mobile-first
js/app.js             → roteador, layouts por canal (cliente, totem, equipe), cookies, painel de demonstração
js/data.js            → mock data: unidades, cardápio, campanhas, níveis, contas de teste
js/domain.js          → regras de negócio puras (estados do pedido, cupons, totais, fidelidade, validações)
js/store.js           → estado + "back-end simulado" (localStorage/sessionStorage, auditoria)
js/services/gateway.js→ provedor EXTERNO de pagamento simulado (armazenamento separado)
js/views/*.js         → telas
tests/regras.test.js  → testes automatizados das regras de negócio (node --test)
docs/                 → plano de testes da interface
sw.js, manifest       → PWA
```

**Fluxo de pagamento desacoplado:** a tela cria o pedido (`AGUARDANDO_PAGAMENTO`) → `store.pagarPedido` envia ao provedor com **chave de idempotência** → o provedor responde (aprovado/recusado/pendente) ou não responde em 7 s → em caso de silêncio, o sistema **consulta o status** antes de permitir nova tentativa, evitando cobrança em duplicidade. Pedidos sem pagamento expiram em 15 minutos e devolvem o estoque reservado.

**Estados do pedido:** `AGUARDANDO_PAGAMENTO → CONFIRMADO → EM_PREPARO → PRONTO → ENTREGUE`, com `PAGAMENTO_RECUSADO` e `CANCELADO` (estorno automático se já pago). As transições são validadas por uma máquina de estados.

**Integração futura com o back-end:** cada função de `store.js` corresponde a um endpoint, por exemplo `POST /pedidos`, `POST /pagamentos`, `GET /unidades/:id/cardapio`, `PATCH /pedidos/:id/status`. O `localStorage` faz o papel da API e o evento `storage` simula notificações em tempo real (que seriam via WebSocket/SSE).

---

## Executar localmente

Qualquer servidor de arquivos estáticos funciona (ES Modules não abrem via `file://`):

```bash
npx serve .
```

Testes automatizados (Node 18+):

```bash
npm test
```

---

## Tecnologias

HTML5, CSS3 (custom properties, grid, `:has`), JavaScript ES2022 (módulos nativos), Web Crypto (SHA-256), Service Worker/PWA, `node:test`. Publicação: GitHub Pages.
