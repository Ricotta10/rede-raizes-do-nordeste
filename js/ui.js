// Utilitários de interface: templates com escape automático (proteção contra XSS),
// ícones, avisos (toasts), diálogos acessíveis e download de arquivos.

export { moeda } from './domain.js';

class Seguro {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => MAPA[c]);
export const bruto = (s) => new Seguro(String(s));

function parte(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Seguro) return v.s;
  if (Array.isArray(v)) return v.map(parte).join('');
  return esc(v);
}

// Tagged template: todo valor interpolado é escapado, exceto fragmentos já seguros.
export function html(strings, ...valores) {
  let saida = strings[0];
  for (let i = 0; i < valores.length; i++) saida += parte(valores[i]) + strings[i + 1];
  return new Seguro(saida);
}

export const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const data = (iso) => new Date(iso).toLocaleDateString('pt-BR');
export const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function tempoDecorrido(iso) {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

const ICONES = {
  casa: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  cardapio: 'M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3zM9 8h6M9 12h6M9 16h3',
  sacola: 'M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9zM9 8V6a3 3 0 0 1 6 0v2',
  estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  recibo: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  fechar: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  voltar: 'M15 6l-6 6 6 6',
  seta: 'M9 6l6 6-6 6',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  fogo: 'M12 21c4 0 7-2.7 7-6.5 0-3.6-2.7-5.6-4-8.5-.8 2-2 3-3 3.5C12 7 11 4.5 9 3c.3 3-3 5.4-3 10 0 4.6 2.6 8 6 8z',
  grafico: 'M4 20V11M10 20V5M16 20v-7M21 20H3',
  sair: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h10',
  totem: 'M7 2h10a1 1 0 0 1 1 1v18H6V3a1 1 0 0 1 1-1zM9 6h6v6H9zM10 17h4',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01',
  alerta: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  baixar: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  lixeira: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  caixa: 'M3 7h18v13H3zM3 7l2-4h14l2 4M9 12h6',
  presente: 'M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9S10 4 7.5 5 9 9 12 9zM12 9s2-5 4.5-4S15 9 12 9z',
  config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  telefone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
};

export function icone(nome, tamanho = 20, rotulo = '') {
  const d = ICONES[nome] || ICONES.info;
  const acess = rotulo ? `role="img" aria-label="${esc(rotulo)}"` : 'aria-hidden="true" focusable="false"';
  return bruto(`<svg class="icone" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${acess}><path d="${d}"/></svg>`);
}

export function aviso(mensagem, tipo = 'info', duracao = 4200) {
  const area = document.getElementById('avisos');
  if (!area) return;
  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.innerHTML = String(html`${icone(tipo === 'erro' ? 'alerta' : tipo === 'sucesso' ? 'check' : 'info', 18)}<span>${mensagem}</span>`);
  area.append(el);
  setTimeout(() => {
    el.classList.add('toast--saindo');
    setTimeout(() => el.remove(), 300);
  }, duracao);
}

/**
 * Diálogo modal acessível baseado em <dialog>.
 * Retorna false se cancelado; true ou um objeto com os campos do formulário se confirmado.
 */
export function dialogo({ titulo, corpo = '', confirmar = 'Confirmar', cancelar = 'Cancelar', perigo = false, classe = '' }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = `dialogo ${classe}`;
    d.setAttribute('aria-labelledby', 'dialogo-titulo');
    d.innerHTML = String(html`
      <form method="dialog" class="dialogo__form">
        <header class="dialogo__topo">
          <h2 id="dialogo-titulo" class="dialogo__titulo">${titulo}</h2>
          <button class="btn-icone" value="cancelar" formnovalidate aria-label="Fechar">${icone('fechar')}</button>
        </header>
        <div class="dialogo__corpo">${corpo}</div>
        <footer class="dialogo__acoes">
          ${cancelar ? html`<button class="btn btn--secundario" value="cancelar" formnovalidate>${cancelar}</button>` : ''}
          ${confirmar ? html`<button class="btn ${perigo ? 'btn--perigo' : 'btn--primario'}" value="ok">${confirmar}</button>` : ''}
        </footer>
      </form>`);
    document.body.append(d);
    const form = d.querySelector('form');
    const focoAnterior = document.activeElement;
    let finalizado = false;

    // Resolve no próprio envio do formulário (síncrono), sem depender do evento "close",
    // que alguns navegadores entregam com atraso.
    const finalizar = (ok) => {
      if (finalizado) return;
      finalizado = true;
      let dados = null;
      if (ok) {
        dados = {};
        new FormData(form).forEach((v, k) => { dados[k] = v; });
        form.querySelectorAll('input[type=checkbox]').forEach((c) => { if (c.name) dados[c.name] = c.checked; });
      }
      if (d.open) d.close();
      d.remove();
      if (focoAnterior?.isConnected) focoAnterior.focus?.({ preventScroll: true });
      resolve(ok ? (Object.keys(dados).length ? dados : true) : false);
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      finalizar(e.submitter?.value === 'ok');
    });
    d.addEventListener('cancel', (e) => { e.preventDefault(); finalizar(false); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); finalizar(false); } });
    d.addEventListener('close', () => finalizar(d.returnValue === 'ok'));
    d.addEventListener('click', (e) => { if (e.target === d) finalizar(false); });
    d.showModal();
    const primeiro = d.querySelector('.dialogo__corpo input, .dialogo__corpo select, .dialogo__corpo textarea');
    (primeiro || d.querySelector('.dialogo__acoes .btn:last-child'))?.focus();
  });
}

export function baixarArquivo(nome, conteudo, tipo = 'application/json') {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    aviso('Copiado para a área de transferência.', 'sucesso');
  } catch {
    aviso('Não foi possível copiar automaticamente. Selecione e copie o texto.', 'erro');
  }
}

// Padrão visual determinístico a partir de um texto (ilustra QR Code de retirada/Pix; não é um QR real).
export function padraoQR(texto, tamanho = 21) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const celulas = [];
  const marcador = (x, y) => (x < 7 && y < 7) || (x >= tamanho - 7 && y < 7) || (x < 7 && y >= tamanho - 7);
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      if (marcador(x, y)) continue;
      h = Math.imul(h ^ (x * 31 + y), 16777619);
      if ((h >>> 0) % 100 < 46) celulas.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  const quadro = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return bruto(`<svg class="qr" viewBox="-1 -1 ${tamanho + 2} ${tamanho + 2}" role="img" aria-label="Código para leitura: ${esc(texto)}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${tamanho + 2}" height="${tamanho + 2}" fill="#fff"/><g fill="#1e1410">${quadro(0, 0)}${quadro(tamanho - 7, 0)}${quadro(0, tamanho - 7)}${celulas.join('')}</g></svg>`);
}

export function campoErro(form, nome, mensagem) {
  const campo = form.querySelector(`[name="${nome}"]`);
  const alvo = form.querySelector(`[data-erro-de="${nome}"]`);
  if (campo) {
    campo.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
  }
  if (alvo) alvo.textContent = mensagem || '';
}
