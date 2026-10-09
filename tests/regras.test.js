// Testes automatizados das regras de negócio (node --test).
// Executar: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIDADES, PRODUTOS, PROMOCOES, NIVEIS } from '../js/data.js';
import {
  podeTransitar, clientePodeCancelar, unidadeAberta, disponibilidade, adaptarProduto,
  horariosRetirada, validarCupom, calcularTotais, nivelPorPontos, proximoNivel, pontosPorValor,
  validarEmail, validarSenha, validarCPF, validarTelefone, mascararEmail, mascararCPF, mascararNome,
  idade, faixaEtaria,
} from '../js/domain.js';

const recife = UNIDADES.find((u) => u.id === 'recife-boa-viagem');
const salvador = UNIDADES.find((u) => u.id === 'salvador-barra');
const saoPaulo = UNIDADES.find((u) => u.id === 'sao-paulo-paulista');
const fortaleza = UNIDADES.find((u) => u.id === 'fortaleza-aldeota');
const produto = (id) => PRODUTOS.find((p) => p.id === id);
const item = (id, qtd = 1) => ({ produtoId: id, categoria: produto(id).categoria, preco: produto(id).preco, qtd });
const outubro = new Date(2026, 9, 9, 10, 0);
const junho = new Date(2026, 5, 20, 10, 0);

test('máquina de estados do pedido só aceita transições válidas', () => {
  assert.ok(podeTransitar('AGUARDANDO_PAGAMENTO', 'CONFIRMADO'));
  assert.ok(podeTransitar('CONFIRMADO', 'EM_PREPARO'));
  assert.ok(podeTransitar('PRONTO', 'ENTREGUE'));
  assert.ok(!podeTransitar('ENTREGUE', 'CANCELADO'));
  assert.ok(!podeTransitar('AGUARDANDO_PAGAMENTO', 'PRONTO'));
  assert.ok(!podeTransitar('PRONTO', 'CANCELADO'));
});

test('cliente só cancela antes do preparo', () => {
  assert.ok(clientePodeCancelar({ status: 'CONFIRMADO' }));
  assert.ok(!clientePodeCancelar({ status: 'EM_PREPARO' }));
});

test('horário de funcionamento da unidade', () => {
  assert.ok(unidadeAberta(recife, new Date(2026, 9, 9, 6, 0)));
  assert.ok(!unidadeAberta(recife, new Date(2026, 9, 9, 22, 0)));
  assert.ok(!unidadeAberta(salvador, new Date(2026, 9, 9, 6, 30)));
});

test('cardápio por unidade: formato, sazonalidade, pausa e estoque', () => {
  assert.equal(disponibilidade(produto('cus-charque'), salvador, { estoque: { 'cus-charque': 10 } }, outubro).motivo, 'formato');
  assert.equal(disponibilidade(produto('canjica'), recife, { estoque: { canjica: 10 } }, outubro).motivo, 'sazonal');
  assert.equal(disponibilidade(produto('canjica'), recife, { estoque: { canjica: 10 } }, junho).disponivel, true);
  assert.equal(disponibilidade(produto('cartola'), fortaleza, { estoque: { cartola: 10 }, pausados: ['cartola'] }, outubro).motivo, 'pausado');
  assert.equal(disponibilidade(produto('tap-carne-sol'), saoPaulo, { estoque: { 'tap-carne-sol': 0 } }, outubro).motivo, 'esgotado');
  const d = disponibilidade(produto('bolo-rolo'), recife, { estoque: { 'bolo-rolo': 4 } }, outubro);
  assert.equal(d.disponivel, true);
  assert.equal(d.ultimas, true);
});

test('variação regional de receita sem alterar preço', () => {
  const p = adaptarProduto(produto('tap-coco'), fortaleza);
  assert.match(p.descricao, /Ceará/);
  assert.equal(p.preco, produto('tap-coco').preco);
  assert.equal(adaptarProduto(produto('tap-coco'), recife).variacaoRegional, undefined);
});

test('horários de retirada respeitam o funcionamento da unidade', () => {
  const noite = new Date(2026, 9, 9, 23, 0);
  const lista = horariosRetirada(recife, noite, 4).map((iso) => new Date(iso));
  assert.equal(lista.length, 4);
  assert.equal(lista[0].getDate(), 10);
  assert.equal(lista[0].getHours() * 60 + lista[0].getMinutes(), 6 * 60 + 15);
});

test('cupons: regras de canal, campanha, segmento e valor mínimo', () => {
  const base = { promocoes: PROMOCOES, unidade: recife, agora: outubro };
  const itens = [item('tap-carne-sol', 2)];
  assert.equal(validarCupom('', { ...base, canal: 'app', itens }).ok, false);
  assert.match(validarCupom('NAOEXISTE', { ...base, canal: 'app', itens }).erro, /não encontrado/);
  assert.match(validarCupom('ARRAIA', { ...base, canal: 'app', itens }).erro, /encerrada/);
  assert.match(validarCupom('TOTEM5', { ...base, canal: 'app', itens }).erro, /Totem/);
  assert.match(validarCupom('BEMVINDO', { ...base, canal: 'app', itens }).erro, /Entre na sua conta/);
  assert.equal(validarCupom('bemvindo', { ...base, canal: 'app', itens, usuario: { consentimentos: {} } }).ok, true);
  assert.match(validarCupom('BEMVINDO', { ...base, canal: 'app', itens, usuario: {}, pedidosAnteriores: 1 }).erro, /primeiro pedido/);
  assert.match(validarCupom('RAIZ15', { ...base, canal: 'app', itens, usuario: { consentimentos: { fidelidade: false } } }).erro, /fidelidade/);
  assert.match(validarCupom('RAIZ15', { ...base, unidade: saoPaulo, canal: 'app', itens, usuario: { consentimentos: { fidelidade: true } } }).erro, /região/);
  assert.match(validarCupom('CAFE10', { ...base, canal: 'app', itens }).erro, /item participante/);
  assert.match(validarCupom('TOTEM5', { ...base, canal: 'totem', itens: [item('cafe-coado')] }).erro, /mínimo/);
});

test('totais: desconto de nível + cupom percentual só nos itens da categoria', () => {
  const itens = [item('cafe-sertanejo'), item('suco-caja')];
  const cafe10 = PROMOCOES.find((p) => p.cupom === 'CAFE10');
  const t = calcularTotais({ itens, promocao: cafe10, nivel: NIVEIS[1] });
  assert.equal(t.subtotal, 44.8);
  assert.equal(t.descontos[0].valor, 1.34); // 3% de 44,80
  assert.equal(t.descontos[1].valor, 3.49); // 10% de 34,90
  assert.equal(t.total, 39.97);
});

test('totais: recompensa nunca deixa o total negativo e não acumula com cupom', () => {
  const itens = [item('cafe-coado')];
  const voucher = { id: 'v1', nome: 'R$ 10,00 de desconto', valor: 10 };
  assert.equal(calcularTotais({ itens, voucher }).total, 0);
  const cupom = PROMOCOES.find((p) => p.cupom === 'BEMVINDO');
  const t = calcularTotais({ itens: [item('tap-carne-sol')], promocao: cupom, voucher });
  assert.equal(t.descontos.length, 1);
  assert.equal(t.descontos[0].tipo, 'cupom');
});

test('fidelidade: pontos e níveis progressivos', () => {
  assert.equal(pontosPorValor(44.99), 44);
  assert.equal(nivelPorPontos(0).id, 'semente');
  assert.equal(nivelPorPontos(300).id, 'mandacaru');
  assert.equal(nivelPorPontos(1500).id, 'juazeiro');
  assert.equal(proximoNivel(620).id, 'juazeiro');
  assert.equal(proximoNivel(1000), null);
});

test('validações de formulário', () => {
  assert.ok(validarEmail('ana@exemplo.com'));
  assert.ok(!validarEmail('ana@exemplo'));
  assert.deepEqual(validarSenha('abc'), ['mínimo de 8 caracteres', 'ao menos um número']);
  assert.deepEqual(validarSenha('senhaForte1'), []);
  assert.ok(validarCPF('529.982.247-25'));
  assert.ok(!validarCPF('111.111.111-11'));
  assert.ok(!validarCPF('123.456.789-00'));
  assert.ok(validarTelefone('(81) 99876-5432'));
  assert.ok(!validarTelefone('9999'));
});

test('LGPD: mascaramento e faixa etária (minimização)', () => {
  assert.equal(mascararEmail('cliente@raizes.demo'), 'cl***@raizes.demo');
  assert.equal(mascararCPF('529.982.247-25'), '***.982.247-**');
  assert.equal(mascararNome('Ana Maria Souza'), 'Ana S.');
  assert.equal(idade('2000-10-10', outubro), 25);
  assert.equal(faixaEtaria(25), '25–34');
  assert.equal(faixaEtaria(null), 'Não informada');
});
