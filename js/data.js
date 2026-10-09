// Dados mockados (Mock Data) que simulam as respostas da API da rede.
// Em produção estes dados viriam do back-end (cardápio, unidades, campanhas).

export const CANAIS = {
  app: 'App',
  web: 'Site',
  totem: 'Totem',
  balcao: 'Balcão',
};

export const UNIDADES = [
  {
    id: 'recife-boa-viagem',
    nome: 'Recife · Boa Viagem',
    cidade: 'Recife', uf: 'PE', regiao: 'Nordeste',
    formato: 'completa',
    endereco: 'Av. Conselheiro Aguiar, 1200 – Boa Viagem',
    abre: '06:00', fecha: '22:00',
    observacao: 'Primeira unidade da rede, inaugurada por Dona Francisca.',
  },
  {
    id: 'caruaru-centro',
    nome: 'Caruaru · Centro',
    cidade: 'Caruaru', uf: 'PE', regiao: 'Nordeste',
    formato: 'completa',
    endereco: 'Rua da Matriz, 85 – Centro',
    abre: '06:00', fecha: '21:00',
  },
  {
    id: 'fortaleza-aldeota',
    nome: 'Fortaleza · Aldeota',
    cidade: 'Fortaleza', uf: 'CE', regiao: 'Nordeste',
    formato: 'completa',
    endereco: 'Av. Santos Dumont, 2450 – Aldeota',
    abre: '06:30', fecha: '22:00',
  },
  {
    id: 'salvador-barra',
    nome: 'Salvador · Barra',
    cidade: 'Salvador', uf: 'BA', regiao: 'Nordeste',
    formato: 'reduzida',
    endereco: 'Av. Oceânica, 310 – Barra',
    abre: '07:00', fecha: '20:00',
  },
  {
    id: 'sao-paulo-paulista',
    nome: 'São Paulo · Paulista',
    cidade: 'São Paulo', uf: 'SP', regiao: 'Sudeste',
    formato: 'reduzida',
    endereco: 'Av. Paulista, 1500 – quiosque térreo',
    abre: '06:00', fecha: '20:00',
  },
  {
    id: 'brasilia-asa-sul',
    nome: 'Brasília · Asa Sul',
    cidade: 'Brasília', uf: 'DF', regiao: 'Centro-Oeste',
    formato: 'reduzida',
    endereco: 'CLS 405, Bloco B, loja 12',
    abre: '06:30', fecha: '19:30',
  },
];

export const FORMATOS = {
  completa: 'Cozinha completa',
  reduzida: 'Formato compacto',
};

export const CATEGORIAS = [
  { id: 'cafe-da-manha', nome: 'Cafés da manhã' },
  { id: 'tapiocas', nome: 'Tapiocas' },
  { id: 'cuscuz', nome: 'Cuscuz' },
  { id: 'bolos-doces', nome: 'Bolos e doces' },
  { id: 'bebidas', nome: 'Sucos e cafés' },
  { id: 'juninos', nome: 'Especiais de São João' },
];

// formatos: em quais formatos de unidade o item pode ser produzido.
// sazonal: meses (1-12) em que o item é vendido.
// variacoes: ajustes regionais de receita por UF, sem quebrar o padrão da franquia.
export const PRODUTOS = [
  {
    id: 'cafe-sertanejo', categoria: 'cafe-da-manha', emoji: '🍳',
    nome: 'Café sertanejo',
    descricao: 'Cuscuz, ovo mexido, queijo coalho, macaxeira cozida, suco regional de 300 ml e café coado.',
    preco: 34.9, formatos: ['completa'], tags: ['Serve 1 pessoa bem servida'],
  },
  {
    id: 'cafe-rapido', categoria: 'cafe-da-manha', emoji: '☕',
    nome: 'Café da manhã expresso',
    descricao: 'Tapioca de queijo coalho + café coado ou suco de 300 ml. Pronto em poucos minutos.',
    preco: 19.9, tags: ['Mais pedido'],
  },
  {
    id: 'tap-carne-sol', categoria: 'tapiocas', emoji: '🫓',
    nome: 'Tapioca de carne de sol com coalho',
    descricao: 'Carne de sol desfiada, queijo coalho tostado e manteiga de garrafa.',
    preco: 22.9, tags: ['Mais pedido'],
  },
  {
    id: 'tap-frango', categoria: 'tapiocas', emoji: '🫓',
    nome: 'Tapioca de frango com requeijão',
    descricao: 'Frango desfiado temperado com coentro e requeijão cremoso.',
    preco: 18.9,
  },
  {
    id: 'tap-coalho', categoria: 'tapiocas', emoji: '🧀',
    nome: 'Tapioca de queijo coalho',
    descricao: 'Queijo coalho derretido e um fio de manteiga de garrafa.',
    preco: 15.9, tags: ['Vegetariano'],
  },
  {
    id: 'tap-coco', categoria: 'tapiocas', emoji: '🥥',
    nome: 'Tapioca de coco com leite condensado',
    descricao: 'Coco ralado fresco e leite condensado.',
    preco: 14.9, tags: ['Vegetariano', 'Doce'],
    variacoes: {
      CE: { descricao: 'Coco ralado fresco, leite condensado e coco queimado — receita da casa no Ceará.' },
    },
  },
  {
    id: 'cus-ovo', categoria: 'cuscuz', emoji: '🌽',
    nome: 'Cuscuz com ovo e coalho',
    descricao: 'Cuscuz de milho no vapor, ovo frito e queijo coalho na chapa.',
    preco: 16.9, tags: ['Vegetariano'],
    variacoes: {
      BA: { nome: 'Cuscuz de milho com ovo e coalho', descricao: 'Cuscuz de milho com leite de coco, ovo frito e queijo coalho — do jeito baiano.' },
    },
  },
  {
    id: 'cus-charque', categoria: 'cuscuz', emoji: '🌽',
    nome: 'Cuscuz recheado com charque',
    descricao: 'Charque acebolada, queijo coalho e manteiga de garrafa.',
    preco: 24.9, formatos: ['completa'],
  },
  {
    id: 'cus-nata', categoria: 'cuscuz', emoji: '🥩',
    nome: 'Cuscuz com carne de sol na nata',
    descricao: 'Carne de sol cozida na nata, com cebola roxa e cheiro-verde.',
    preco: 27.9, formatos: ['completa'],
  },
  {
    id: 'bolo-macaxeira', categoria: 'bolos-doces', emoji: '🍰',
    nome: 'Bolo de macaxeira (fatia)',
    descricao: 'Macaxeira, coco e leite de coco. Úmido e cremoso.',
    preco: 9.9, tags: ['Sem glúten'],
  },
  {
    id: 'bolo-rolo', categoria: 'bolos-doces', emoji: '🍥',
    nome: 'Bolo de rolo (fatia)',
    descricao: 'Massa fininha enrolada com goiabada.',
    preco: 10.9,
    variacoes: {
      PE: { descricao: 'Massa fininha enrolada com goiabada — receita tradicional pernambucana.' },
    },
  },
  {
    id: 'cartola', categoria: 'bolos-doces', emoji: '🍌',
    nome: 'Cartola',
    descricao: 'Banana frita, queijo coalho, açúcar e canela.',
    preco: 16.9, formatos: ['completa'],
  },
  {
    id: 'suco-caja', categoria: 'bebidas', emoji: '🧃',
    nome: 'Suco de cajá (300 ml)', descricao: 'Polpa de cajá batida na hora.', preco: 9.9,
  },
  {
    id: 'suco-caju', categoria: 'bebidas', emoji: '🧃',
    nome: 'Suco de caju (300 ml)', descricao: 'Caju natural, sem conservantes.', preco: 8.9,
  },
  {
    id: 'suco-graviola', categoria: 'bebidas', emoji: '🥤',
    nome: 'Suco de graviola (300 ml)', descricao: 'Graviola cremosa batida com água ou leite.', preco: 9.9,
  },
  {
    id: 'cafe-coado', categoria: 'bebidas', emoji: '☕',
    nome: 'Café coado (200 ml)', descricao: 'Café torrado no Sertão, passado na hora.', preco: 5.5,
  },
  {
    id: 'cafe-leite', categoria: 'bebidas', emoji: '🥛',
    nome: 'Café com leite (300 ml)', descricao: 'Café coado com leite vaporizado.', preco: 7.5,
  },
  {
    id: 'canjica', categoria: 'juninos', emoji: '🥣',
    nome: 'Canjica', descricao: 'Milho verde, leite de coco e canela.', preco: 11.9,
    sazonal: { nome: 'São João', meses: [6, 7] },
  },
  {
    id: 'pamonha', categoria: 'juninos', emoji: '🌽',
    nome: 'Pamonha', descricao: 'Pamonha doce cozida na palha do milho.', preco: 10.9,
    sazonal: { nome: 'São João', meses: [6, 7] },
  },
  {
    id: 'milho-cozido', categoria: 'juninos', emoji: '🌽',
    nome: 'Milho cozido com manteiga', descricao: 'Espiga inteira com manteiga de garrafa.', preco: 8.9,
    sazonal: { nome: 'São João', meses: [6, 7] },
  },
];

// Programa de fidelidade: 1 ponto por R$ 1,00 pago; descontos progressivos por nível.
export const NIVEIS = [
  { id: 'semente', nome: 'Semente', minimo: 0, desconto: 0, cor: '#8a6b4f' },
  { id: 'mandacaru', nome: 'Mandacaru', minimo: 300, desconto: 3, cor: '#2f6b4f' },
  { id: 'juazeiro', nome: 'Juazeiro', minimo: 1000, desconto: 5, cor: '#b5462b' },
];

export const RECOMPENSAS = [
  { id: 'rec-cafe', nome: 'Café coado por nossa conta', pontos: 100, valor: 5.5, emoji: '☕' },
  { id: 'rec-10', nome: 'R$ 10,00 de desconto', pontos: 200, valor: 10, emoji: '🎟️' },
  { id: 'rec-tapioca', nome: 'Tapioca de queijo coalho grátis', pontos: 300, valor: 15.9, emoji: '🫓' },
  { id: 'rec-sertanejo', nome: 'Café sertanejo grátis', pontos: 650, valor: 34.9, emoji: '🍳' },
];

export const PROMOCOES = [
  {
    id: 'promo-bemvindo', cupom: 'BEMVINDO', ativa: true,
    titulo: 'Primeiro pedido com R$ 5 off',
    descricao: 'Desconto de R$ 5,00 no seu primeiro pedido pelo app ou site.',
    tipo: 'valor', valor: 5, minimo: 20,
    canais: ['app', 'web'], regra: 'primeiro_pedido',
    validaAte: '2026-12-31',
  },
  {
    id: 'promo-cafe10', cupom: 'CAFE10', ativa: true,
    titulo: '10% nos cafés da manhã',
    descricao: '10% de desconto nos combos de café da manhã, em qualquer canal.',
    tipo: 'percentual', valor: 10, categorias: ['cafe-da-manha'],
    validaAte: '2026-12-31',
  },
  {
    id: 'promo-raiz15', cupom: 'RAIZ15', ativa: true,
    titulo: '15% para quem é da casa',
    descricao: 'Exclusivo para participantes do programa de fidelidade nas unidades do Nordeste.',
    tipo: 'percentual', valor: 15, minimo: 30,
    segmento: 'fidelidade', regioes: ['Nordeste'],
    validaAte: '2026-12-31',
  },
  {
    id: 'promo-totem', cupom: 'TOTEM5', ativa: true,
    titulo: 'R$ 5 off no totem',
    descricao: 'Peça pelo totem de autoatendimento e ganhe R$ 5,00 em pedidos acima de R$ 25,00.',
    tipo: 'valor', valor: 5, minimo: 25, canais: ['totem'],
    validaAte: '2026-12-31',
  },
  {
    id: 'promo-saojoao', cupom: 'ARRAIA', ativa: false,
    titulo: 'Arraiá Raízes',
    descricao: 'Campanha sazonal de São João (encerrada). Volta em junho!',
    tipo: 'percentual', valor: 20, categorias: ['juninos'],
    validaAte: '2026-07-31',
  },
];

// Contas de demonstração (dados fictícios). As senhas são convertidas em hash na carga inicial.
export const CLIENTES_DEMO = [
  {
    id: 'cli-ana',
    nome: 'Ana Souza',
    email: 'cliente@raizes.demo',
    senha: 'cliente123',
    telefone: '(81) 99876-5432',
    cpf: '529.982.247-25',
    nascimento: '1994-10-21',
    pontos: 420,
    pontosAcumulados: 620,
    consentimentos: { fidelidade: true, personalizacao: true, comunicacoes: false },
  },
];

export const EQUIPE = [
  { id: 'eq-atd', nome: 'Carlos Lima', email: 'atendente@raizes.demo', senha: 'equipe123', papel: 'atendente', unidadeId: 'recife-boa-viagem' },
  { id: 'eq-coz', nome: 'Josefa Alves', email: 'cozinha@raizes.demo', senha: 'equipe123', papel: 'cozinha', unidadeId: 'recife-boa-viagem' },
  { id: 'eq-ger', nome: 'Marcos Bezerra', email: 'gerente@raizes.demo', senha: 'equipe123', papel: 'gerente', unidadeId: 'recife-boa-viagem' },
  { id: 'eq-adm', nome: 'Francisca Raízes', email: 'matriz@raizes.demo', senha: 'equipe123', papel: 'admin', unidadeId: null },
];

export const PAPEIS = {
  atendente: 'Atendente',
  cozinha: 'Cozinha',
  gerente: 'Gerente da unidade',
  admin: 'Administração (matriz)',
};

export const METODOS_PAGAMENTO = {
  pix: 'Pix',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  cartao_totem: 'Cartão na maquininha do totem',
  dinheiro: 'Dinheiro',
  cartao_balcao: 'Cartão (maquininha do caixa)',
  pix_balcao: 'Pix no caixa',
};

export const VERSAO_TERMOS = '2026.1';
export const CONTATO_DPO = 'privacidade@raizes.demo';
