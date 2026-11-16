/**
 * tool-diff — Comparador de textos/código (ciclo 4).
 * Requisitos: RF17–RF20 em docs/REQUISITOS.md. Segue o padrão de tool-json.js:
 * custom element em light DOM, processamento 100% em memória, nota de
 * privacidade no rodapé, nenhuma requisição de rede.
 *
 * Algoritmo: diff por linha via LCS (maior subsequência comum), implementação
 * própria. Antes da tabela da LCS, o prefixo e o sufixo iguais são separados —
 * numa mudança pontual em arquivo grande (caso D4), a tabela fica minúscula.
 */

const CONTEXTO = 3;                 // linhas iguais ao redor de cada mudança (igual ao diff -u)
const MAX_CELULAS = 10_000_000;     // tabela da LCS: ~20 MB em Uint16; acima disso, recusa com aviso
const MAX_LINHAS_EXIBIDAS = 3000;   // linhas renderizadas; o diff copiado é sempre completo
const MIN_RECOLHER = 5;             // trechos iguais menores aparecem inteiros: a barra ocuparia o mesmo espaço
const ESPERA_DIGITACAO_MS = 250;

/** Quebra em linhas aceitando \n, \r\n e \r; a quebra final não conta como linha extra. */
export function linhas(texto) {
  if (texto === '') return [];
  return texto.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
}

/**
 * RF18 — sequência de operações { tipo: '=' | '-' | '+', a?, b?, texto },
 * com a/b = índice (0-based) da linha no original/modificado.
 * Retorna null se a parte diferente for grande demais para a tabela da LCS.
 */
export function diffLinhas(antigo, novo) {
  let ini = 0;
  while (ini < antigo.length && ini < novo.length && antigo[ini] === novo[ini]) ini++;
  let fimA = antigo.length;
  let fimB = novo.length;
  while (fimA > ini && fimB > ini && antigo[fimA - 1] === novo[fimB - 1]) {
    fimA--;
    fimB--;
  }

  const a = antigo.slice(ini, fimA);
  const b = novo.slice(ini, fimB);
  const n = a.length;
  const m = b.length;
  if ((n + 1) * (m + 1) > MAX_CELULAS) return null;

  // Linhas viram números: comparar inteiros na tabela é bem mais rápido que strings.
  const ids = new Map();
  const id = (s) => {
    if (!ids.has(s)) ids.set(s, ids.size);
    return ids.get(s);
  };
  const ia = a.map(id);
  const ib = b.map(id);

  // lcs[i][j] = tamanho da LCS de a[i..] e b[j..]. Uint16 basta: com o limite de
  // células, min(n, m) ≤ √10.000.000 ≈ 3.162.
  const w = m + 1;
  const lcs = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] = ia[i] === ib[j]
        ? lcs[(i + 1) * w + j + 1] + 1
        : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    }
  }

  const ops = [];
  for (let k = 0; k < ini; k++) ops.push({ tipo: '=', a: k, b: k, texto: antigo[k] });
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && ia[i] === ib[j]) {
      ops.push({ tipo: '=', a: ini + i, b: ini + j, texto: a[i] });
      i++;
      j++;
    } else if (j >= m || (i < n && lcs[(i + 1) * w + j] >= lcs[i * w + j + 1])) {
      ops.push({ tipo: '-', a: ini + i, texto: a[i] }); // remoções antes das adições, como no diff -u
      i++;
    } else {
      ops.push({ tipo: '+', b: ini + j, texto: b[j] });
      j++;
    }
  }
  for (let k = 0; k < antigo.length - fimA; k++) {
    ops.push({ tipo: '=', a: fimA + k, b: fimB + k, texto: antigo[fimA + k] });
  }
  return ops;
}

/** Agrupa as mudanças em blocos com CONTEXTO linhas iguais em volta (os "hunks" do diff -u). */
export function blocos(ops, contexto = CONTEXTO) {
  const mudancas = [];
  ops.forEach((o, i) => o.tipo !== '=' && mudancas.push(i));
  if (!mudancas.length) return [];

  const ultimo = ops.length - 1;
  const faixas = [];
  let ini = Math.max(0, mudancas[0] - contexto);
  let fim = Math.min(ultimo, mudancas[0] + contexto);
  for (const k of mudancas.slice(1)) {
    if (k - contexto <= fim + 1) {
      fim = Math.min(ultimo, k + contexto);
    } else {
      faixas.push([ini, fim]);
      ini = Math.max(0, k - contexto);
      fim = Math.min(ultimo, k + contexto);
    }
  }
  faixas.push([ini, fim]);
  return faixas.map(([inicio, final]) => ({ inicio, fim: final, ops: ops.slice(inicio, final + 1) }));
}

/** RF20 — texto no formato diff unificado (diff -u / git diff), aplicável com patch. */
export function diffUnificado(ops, nomes = ['original', 'modificado']) {
  const bs = blocos(ops);
  if (!bs.length) return '';
  const saida = [`--- ${nomes[0]}`, `+++ ${nomes[1]}`];
  let op = 0;
  let linhaA = 0; // linhas do original já percorridas
  let linhaB = 0;
  for (const bloco of bs) {
    for (; op < bloco.inicio; op++) {
      if (ops[op].tipo !== '+') linhaA++;
      if (ops[op].tipo !== '-') linhaB++;
    }
    const qa = bloco.ops.filter((o) => o.tipo !== '+').length;
    const qb = bloco.ops.filter((o) => o.tipo !== '-').length;
    // Convenção do formato: bloco vazio de um lado aponta para a linha anterior (ex.: -0,0).
    saida.push(`@@ -${qa ? linhaA + 1 : linhaA},${qa} +${qb ? linhaB + 1 : linhaB},${qb} @@`);
    for (const o of bloco.ops) saida.push((o.tipo === '=' ? ' ' : o.tipo) + o.texto);
  }
  return `${saida.join('\n')}\n`;
}

/** Cópia com alternativa para quando a Clipboard API é negada (mesma abordagem do tool-cpf). */
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

const CLASSE_FOCO = 'focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2';
// Linha alterada = fundo + faixa mais forte na numeração + barra na borda esquerda:
// a diferença aparece mesmo em telas com pouco contraste ou com brilho alto.
const FUNDO = { '-': 'bg-red-line', '+': 'bg-leaf-line', '=': '' };
const FAIXA = { '-': 'bg-red-gutter', '+': 'bg-leaf-gutter', '=': '' };
const NUMERO = { '-': 'text-ink', '+': 'text-ink', '=': 'text-muted' };
const BARRA = { '-': 'border-l-4 border-red-deep', '+': 'border-l-4 border-leaf', '=': 'border-l-4 border-transparent' };
// Onde a linha não existe de um lado (lado a lado), listras em vez de branco.
const SEM_LINHA = 'bg-paper bg-[repeating-linear-gradient(-45deg,var(--color-line)_0_1px,transparent_1px_7px)]';
const SINAL = { '-': '−', '+': '+', '=': '' };
const LEITURA = { '-': 'removida: ', '+': 'adicionada: ', '=': '' };

const telaMedia = matchMedia('(min-width: 768px)'); // abaixo disso, só a visualização unificada

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

class ToolDiff extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1 class="text-3xl font-extrabold text-ink">Diff de Código</h1>
      <p class="mt-1 text-muted">Compare duas versões de um texto ou código e veja as linhas alteradas — direto no seu navegador.</p>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <label for="diff-a" class="text-lg font-bold text-ink">Original</label>
          <textarea id="diff-a" spellcheck="false" placeholder="Cole aqui a versão original…"
            class="mt-2 h-56 w-full resize-y rounded-2xl border-2 border-line bg-white p-4 font-mono text-sm text-ink
                   focus-visible:outline-2 focus-visible:outline-navy"></textarea>
        </section>
        <section>
          <label for="diff-b" class="text-lg font-bold text-ink">Modificado</label>
          <textarea id="diff-b" spellcheck="false" placeholder="Cole aqui a versão modificada…"
            class="mt-2 h-56 w-full resize-y rounded-2xl border-2 border-line bg-white p-4 font-mono text-sm text-ink
                   focus-visible:outline-2 focus-visible:outline-navy"></textarea>
        </section>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <p id="diff-resumo" role="status" class="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy">Cole os dois textos para comparar.</p>
        <button type="button" id="diff-copiar" class="hidden rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy hover:bg-line ${CLASSE_FOCO}">Copiar diff unificado</button>
        <div id="diff-modos" role="group" aria-label="Visualização" class="ml-auto hidden gap-1 rounded-xl bg-mist p-1 md:flex">
          <button type="button" data-modo="unificado" class="modo-btn rounded-lg px-3 py-1.5 text-sm font-bold ${CLASSE_FOCO}">Unificado</button>
          <button type="button" data-modo="lado" class="modo-btn rounded-lg px-3 py-1.5 text-sm font-bold ${CLASSE_FOCO}">Lado a lado</button>
        </div>
      </div>

      <div id="diff-resultado" tabindex="0" role="region" aria-label="Resultado da comparação"
        class="mt-3 hidden overflow-x-auto rounded-2xl border-2 border-line bg-white font-mono text-sm ${CLASSE_FOCO}"></div>

      <p class="mt-8 text-sm"><strong class="text-leaf">Processado localmente</strong>
        <span class="text-muted">— nada saiu do seu navegador.</span></p>
    `;

    this.$a = this.querySelector('#diff-a');
    this.$b = this.querySelector('#diff-b');
    this.$resumo = this.querySelector('#diff-resumo');
    this.$copiar = this.querySelector('#diff-copiar');
    this.$resultado = this.querySelector('#diff-resultado');
    this.modo = 'unificado';
    this.abertos = new Set(); // trechos recolhidos que o usuário abriu (índice da 1ª linha)

    const agendar = () => {
      clearTimeout(this.espera);
      this.espera = setTimeout(() => this.comparar(), ESPERA_DIGITACAO_MS);
    };
    this.$a.addEventListener('input', agendar);
    this.$b.addEventListener('input', agendar);
    this.querySelectorAll('.modo-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        this.modo = btn.dataset.modo;
        this.renderizar();
      })
    );
    this.$copiar.addEventListener('click', async () => {
      const ok = await copiarTexto(diffUnificado(this.ops));
      this.$copiar.textContent = ok ? 'Copiado ✓' : 'Não copiou';
      setTimeout(() => (this.$copiar.textContent = 'Copiar diff unificado'), 1500);
    });
    this.aoMudarTela = () => this.renderizar();
    telaMedia.addEventListener('change', this.aoMudarTela);

    this.marcarModo();
  }

  disconnectedCallback() {
    clearTimeout(this.espera);
    telaMedia.removeEventListener('change', this.aoMudarTela);
  }

  comparar() {
    const textoA = this.$a.value;
    const textoB = this.$b.value;
    this.ops = null;
    this.abertos.clear();
    this.$copiar.classList.add('hidden');
    this.$resultado.classList.add('hidden');

    if (!textoA && !textoB) {
      this.mostrarResumo('neutro', 'Cole os dois textos para comparar.');
      return;
    }

    const ops = diffLinhas(linhas(textoA), linhas(textoB));
    if (!ops) {
      this.mostrarResumo('erro', '✗ Diferença grande demais para comparar no navegador — compare trechos menores.');
      return;
    }

    this.ops = ops;
    const adicionadas = ops.filter((o) => o.tipo === '+').length;
    const removidas = ops.filter((o) => o.tipo === '-').length;
    const iguais = ops.length - adicionadas - removidas;

    if (!adicionadas && !removidas) {
      // D1. Textos que diferem só na quebra de linha (\r\n × \n, quebra final) também caem aqui.
      this.mostrarResumo('ok', textoA === textoB
        ? '✓ Sem diferenças — os textos são iguais.'
        : '✓ Sem diferenças nas linhas (só nas quebras de linha).');
      return;
    }

    // RF19
    this.$resumo.replaceChildren(
      el('span', 'text-leaf', `+${adicionadas}`),
      ' / ',
      el('span', 'text-red-deep', `−${removidas}`),
      ` ${adicionadas + removidas === 1 ? 'linha' : 'linhas'} · ${iguais} ${iguais === 1 ? 'igual' : 'iguais'}`
    );
    this.estiloResumo('neutro');
    this.$copiar.classList.remove('hidden');
    this.renderizar();
  }

  marcarModo() {
    this.querySelectorAll('.modo-btn').forEach((btn) => {
      const ativo = btn.dataset.modo === this.modo;
      btn.setAttribute('aria-pressed', String(ativo));
      btn.classList.toggle('bg-navy', ativo);
      btn.classList.toggle('text-white', ativo);
      btn.classList.toggle('text-muted', !ativo);
    });
  }

  /**
   * RF17 + RF18 — contexto em volta das mudanças; trechos iguais longos ficam
   * recolhidos atrás de um botão que os abre (os curtos aparecem direto).
   */
  renderizar() {
    this.marcarModo();
    if (!this.ops) return;
    const ladoALado = this.modo === 'lado' && telaMedia.matches;

    // 1) Segmentos: { ops } a exibir ou { inicio, qtd } recolhido.
    const segmentos = [];
    const exibir = (ops) => {
      const ultimo = segmentos.at(-1);
      if (ultimo?.ops) ultimo.ops.push(...ops);
      else segmentos.push({ ops: [...ops] });
    };
    const trechoIgual = (inicio, fim) => {
      const qtd = fim - inicio;
      if (qtd <= 0) return;
      if (qtd < MIN_RECOLHER || this.abertos.has(inicio)) exibir(this.ops.slice(inicio, fim));
      else segmentos.push({ inicio, qtd });
    };
    let anterior = 0;
    for (const bloco of blocos(this.ops)) {
      trechoIgual(anterior, bloco.inicio);
      exibir(bloco.ops);
      anterior = bloco.fim + 1;
    }
    trechoIgual(anterior, this.ops.length);

    // 2) Linhas na tela, até o limite.
    const linhasHtml = [];
    let exibidas = 0;
    for (const seg of segmentos) {
      if (exibidas >= MAX_LINHAS_EXIBIDAS) break;
      if (!seg.ops) {
        linhasHtml.push(this.botaoRecolhidas(seg));
        continue;
      }
      const novas = ladoALado ? this.linhasLadoALado(seg.ops) : seg.ops.map((o) => this.linhaUnificada(o));
      const cabe = novas.slice(0, MAX_LINHAS_EXIBIDAS - exibidas);
      linhasHtml.push(...cabe);
      exibidas += cabe.length;
    }
    if (exibidas >= MAX_LINHAS_EXIBIDAS) {
      linhasHtml.push(el('div', 'bg-mist px-4 py-2 font-sans text-sm text-muted',
        `Mostrando as primeiras ${MAX_LINHAS_EXIBIDAS} linhas — o diff copiado sai completo.`));
    }

    this.$resultado.replaceChildren(...linhasHtml);
    this.$resultado.classList.remove('hidden');
  }

  botaoRecolhidas({ inicio, qtd }) {
    const btn = el('button', 'block w-full border-y border-line bg-mist px-4 py-1.5 text-left font-sans text-sm ' +
      `font-semibold text-navy hover:bg-line ${CLASSE_FOCO}`);
    btn.type = 'button';
    const reticencias = el('span', 'mr-2', '⋯');
    reticencias.setAttribute('aria-hidden', 'true');
    btn.append(reticencias, `Mostrar ${qtd} linhas iguais`);
    btn.addEventListener('click', () => {
      this.abertos.add(inicio);
      this.renderizar();
      this.$resultado.focus({ preventScroll: true }); // o botão some; o foco não pode cair no topo da página
    });
    return btn;
  }

  linhaUnificada(o) {
    const linha = el('div', `grid grid-cols-[3rem_3rem_1.5rem_1fr] ${FUNDO[o.tipo]}`);
    linha.append(
      el('span', `select-none px-2 py-0.5 text-right ${NUMERO[o.tipo]} ${FAIXA[o.tipo]} ${BARRA[o.tipo]}`, o.a === undefined ? '' : String(o.a + 1)),
      el('span', `select-none px-2 py-0.5 text-right ${NUMERO[o.tipo]} ${FAIXA[o.tipo]}`, o.b === undefined ? '' : String(o.b + 1)),
      this.sinal(o.tipo, FAIXA[o.tipo]),
      el('span', 'whitespace-pre-wrap wrap-anywhere py-0.5 pr-4 text-ink', o.texto)
    );
    return linha;
  }

  /** Remoções e adições consecutivas viram pares na mesma linha (linha alterada). */
  linhasLadoALado(opsBloco) {
    const saida = [];
    let removidas = [];
    let adicionadas = [];
    const despejar = () => {
      for (let k = 0; k < Math.max(removidas.length, adicionadas.length); k++) {
        saida.push(this.parLadoALado(removidas[k], adicionadas[k]));
      }
      removidas = [];
      adicionadas = [];
    };
    for (const o of opsBloco) {
      if (o.tipo === '-') removidas.push(o);
      else if (o.tipo === '+') adicionadas.push(o);
      else {
        despejar();
        saida.push(this.parLadoALado(o, o));
      }
    }
    despejar();
    return saida;
  }

  parLadoALado(esq, dir) {
    const linha = el('div', 'grid grid-cols-[3rem_1.5rem_1fr_3rem_1.5rem_1fr]');
    const lado = (o, chave, tipoDoLado) => {
      // A metade direita começa com uma divisória, para as duas colunas não se misturarem.
      const divisoria = tipoDoLado === '+' ? 'border-l-2 border-line' : '';
      if (!o) return [el('span', `col-span-3 ${SEM_LINHA} ${divisoria}`)];
      const tipo = o.tipo === '=' ? '=' : tipoDoLado;
      const barra = tipo === '=' ? divisoria : BARRA[tipo];
      return [
        el('span', `select-none px-2 py-0.5 text-right ${NUMERO[tipo]} ${FAIXA[tipo]} ${barra}`, String(o[chave] + 1)),
        this.sinal(tipo, FAIXA[tipo]),
        el('span', `whitespace-pre-wrap wrap-anywhere py-0.5 pr-3 text-ink ${FUNDO[tipo]}`, o.texto),
      ];
    };
    linha.append(...lado(esq, 'a', '-'), ...lado(dir, 'b', '+'));
    return linha;
  }

  sinal(tipo, fundo = '') {
    const s = el('span', `select-none py-0.5 text-center font-bold ${tipo === '-' ? 'text-red-deep' : 'text-leaf'} ${fundo}`);
    s.append(el('span', '', SINAL[tipo]), el('span', 'sr-only', LEITURA[tipo]));
    s.firstChild.setAttribute('aria-hidden', 'true');
    return s;
  }

  mostrarResumo(tipo, msg) {
    this.$resumo.textContent = msg;
    this.estiloResumo(tipo);
  }

  /** tipo: 'ok' | 'erro' | 'neutro' */
  estiloResumo(tipo) {
    this.$resumo.classList.toggle('bg-leaf-soft', tipo === 'ok');
    this.$resumo.classList.toggle('text-leaf', tipo === 'ok');
    this.$resumo.classList.toggle('bg-red-soft', tipo === 'erro');
    this.$resumo.classList.toggle('text-red-deep', tipo === 'erro');
    this.$resumo.classList.toggle('bg-mist', tipo === 'neutro');
    this.$resumo.classList.toggle('text-navy', tipo === 'neutro');
  }
}

customElements.define('tool-diff', ToolDiff);
