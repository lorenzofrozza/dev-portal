/**
 * tool-json — Formatador/Validador JSON (ciclo 1).
 * COMPONENTE DE REFERÊNCIA: as demais ferramentas seguem este padrão —
 * custom element em light DOM, processamento 100% em memória, nota de
 * privacidade no rodapé, nenhuma requisição de rede.
 *
 * Validade: quem decide é o JSON.parse nativo. Quando ele recusa, o portal
 * localiza o erro por conta própria (localizarErro), porque cada navegador
 * escreve a mensagem de um jeito e o Chrome atual nem informa a posição (RF02).
 */

const ESPACOS = ' \t\n\r';            // os únicos espaços que o JSON aceita (RFC 8259)
const FECHA = { '{': '}', '[': ']' };
const ESCAPES = '"\\/bfnrt';
const RE_NUMERO = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const RE_HEX4 = /^[0-9a-fA-F]{4}$/;
const LARGURA_TRECHO = 64;            // caracteres por linha no trecho do erro

/* ---------- RF02: localizar o erro ---------- */

/** Linha e coluna (1-based) de uma posição. Coluna conta caracteres, não unidades UTF-16. */
export function linhaColuna(texto, pos) {
  const antes = texto.slice(0, pos);
  const inicioLinha = antes.lastIndexOf('\n') + 1;
  let linha = 1;
  for (let i = antes.indexOf('\n'); i !== -1; i = antes.indexOf('\n', i + 1)) linha++;
  return { linha, coluna: [...texto.slice(inicioLinha, pos)].length + 1 };
}

function nomeChar(c) {
  const cp = c.codePointAt(0);
  if (c === '\t') return 'uma tabulação';
  if (c === '\n' || c === '\r') return 'uma quebra de linha';
  if (cp === 0xfeff) return 'um caractere invisível (BOM, U+FEFF)';
  if (cp < 0x20 || cp === 0x7f || cp === 0xa0 || (cp >= 0x2000 && cp <= 0x200f) || cp === 0x2028 || cp === 0x2029) {
    return `um caractere invisível (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`;
  }
  return `'${c}'`;
}

/**
 * Percorre o texto segundo a gramática do JSON e devolve o primeiro erro como
 * { pos, msg } — ou null se o texto é válido. Iterativo (pilha explícita), para
 * não estourar a pilha de chamadas com JSON muito aninhado. Só roda quando o
 * JSON.parse já recusou a entrada.
 */
export function localizarErro(texto) {
  const n = texto.length;
  const pilha = [];       // posições dos '{' e '[' ainda abertos
  let i = 0;
  let estado = 'valor';   // valor | chave | dois-pontos | depois
  let veio = 'inicio';    // o que levou ao estado atual: inicio | abriu | virgula | dois-pontos
  let virgula = -1;       // posição da última vírgula, para apontar a "vírgula sobrando"

  const erro = (pos, msg) => ({ pos, msg });
  const onde = (p) => { const { linha, coluna } = linhaColuna(texto, p); return `linha ${linha}, coluna ${coluna}`; };
  const palavra = (p) => /^[A-Za-z_$][\w$]*/.exec(texto.slice(p, p + 40))[0];

  function lerTexto() {   // i está na aspa de abertura
    const inicio = i++;
    while (i < n) {
      const c = texto[i];
      if (c === '"') { i++; return null; }
      if (c === '\\') {
        const e = texto[i + 1];
        if (e === 'u') {
          if (!RE_HEX4.test(texto.slice(i + 2, i + 6))) return erro(i, "o escape \\u precisa de 4 dígitos hexadecimais (ex.: \\u00e9)");
          i += 6;
          continue;
        }
        if (e !== undefined && ESCAPES.includes(e)) { i += 2; continue; }
        if (e === undefined) break;
        return erro(i, `barra invertida inválida '\\${e}' — para uma barra literal use '\\\\' (comum em caminhos do Windows)`);
      }
      if (c === '\n' || c === '\r') return erro(inicio, 'faltam as aspas que fecham este texto (ele termina na mesma linha)');
      if (c < ' ') return erro(i, `${nomeChar(c)} dentro do texto — use o escape (\\t, \\n…)`);
      i++;
    }
    return erro(inicio, 'faltam as aspas que fecham este texto');
  }

  for (;;) {
    while (i < n && ESPACOS.includes(texto[i])) i++;

    if (i >= n) {
      if (estado === 'depois' && !pilha.length) return null;
      const fim = texto.trimEnd().length;   // aponta logo depois do último caractere visível
      if (pilha.length) {
        const p = pilha.at(-1);
        if (estado === 'valor' && veio === 'dois-pontos') return erro(fim, 'faltou o valor deste campo');
        return erro(fim, `o JSON terminou sem fechar o '${texto[p]}' aberto na ${onde(p)} — falta '${FECHA[texto[p]]}'`);
      }
      return erro(fim, 'o JSON terminou antes de um valor');
    }

    const c = texto[i];
    if (c === '/' && (texto[i + 1] === '/' || texto[i + 1] === '*')) return erro(i, 'comentários não são permitidos em JSON');

    if (estado === 'chave') {
      if (c === '"') {
        const e = lerTexto();
        if (e) return e;
        estado = 'dois-pontos';
        continue;
      }
      if (c === '}' && veio === 'abriu') { pilha.pop(); i++; estado = 'depois'; continue; }
      if (c === '}') return erro(virgula, "vírgula sobrando antes de '}'");
      if (c === "'") return erro(i, 'nome de campo com aspas simples — o JSON exige aspas duplas');
      if (/[A-Za-z_$]/.test(c)) return erro(i, `nome de campo sem aspas — escreva "${palavra(i)}"`);
      if (c === ',' && veio === 'virgula') return erro(i, 'vírgula repetida');
      return erro(i, `esperava o nome de um campo entre aspas duplas, mas encontrou ${nomeChar(c)}`);
    }

    if (estado === 'dois-pontos') {
      if (c === ':') { i++; estado = 'valor'; veio = 'dois-pontos'; continue; }
      if (c === '=') return erro(i, "use ':' entre o nome do campo e o valor, não '='");
      return erro(i, "faltou ':' depois do nome do campo");
    }

    if (estado === 'depois') {
      if (!pilha.length) {
        if (c === '}' || c === ']') return erro(i, `'${c}' sobrando — não há nada aberto para fechar`);
        return erro(i, 'há conteúdo depois do fim do JSON — só pode haver um valor principal (falta envolver em [ ]?)');
      }
      const aberto = texto[pilha.at(-1)];
      if (c === ',') { virgula = i++; estado = aberto === '{' ? 'chave' : 'valor'; veio = 'virgula'; continue; }
      if (c === FECHA[aberto]) { pilha.pop(); i++; continue; }
      if (c === '}' || c === ']') {
        return erro(i, `'${c}' não combina com o '${aberto}' aberto na ${onde(pilha.at(-1))} — esperava '${FECHA[aberto]}'`);
      }
      if (/["'{[\-\dA-Za-z]/.test(c)) return erro(i, 'faltou uma vírgula antes deste item');
      return erro(i, `esperava ',' ou '${FECHA[aberto]}', mas encontrou ${nomeChar(c)}`);
    }

    // estado === 'valor'
    if (c === '{' || c === '[') {
      pilha.push(i++);
      estado = c === '{' ? 'chave' : 'valor';
      veio = 'abriu';
      continue;
    }
    if (c === '}' || c === ']' || c === ',') {
      const topo = pilha.length ? texto[pilha.at(-1)] : null;
      if (c === ']' && veio === 'abriu' && topo === '[') { pilha.pop(); i++; estado = 'depois'; continue; }
      if (veio === 'dois-pontos') return erro(i, 'faltou o valor deste campo');
      if (veio === 'virgula' && c === ',') return erro(i, 'vírgula repetida — falta um valor entre as duas');
      if (veio === 'virgula') return erro(virgula, `vírgula sobrando antes de '${c}'`);
      if (veio === 'abriu' && c === ',') return erro(i, `vírgula logo depois de '${topo}' — falta o primeiro item`);
      if (topo) return erro(i, `'${c}' não combina com o '${topo}' aberto na ${onde(pilha.at(-1))} — esperava '${FECHA[topo]}'`);
      return erro(i, `esperava um valor, mas encontrou '${c}'`);
    }
    if (c === '"') {
      const e = lerTexto();
      if (e) return e;
      estado = 'depois';
      continue;
    }
    if (c === "'") return erro(i, 'texto com aspas simples — o JSON exige aspas duplas');
    if (c === '-' || c === '.' || c === '+' || (c >= '0' && c <= '9')) {
      const token = /^[-+.\w]*/.exec(texto.slice(i, i + 64))[0];
      if (RE_NUMERO.test(token)) { i += token.length; estado = 'depois'; continue; }
      if (c === '+') return erro(i, "o sinal '+' não é permitido antes de números");
      if (/^-?0[xX]/.test(token)) return erro(i, 'números hexadecimais não são permitidos em JSON');
      if (/^-?(Infinity|NaN)/.test(token)) return erro(i, 'Infinity e NaN não existem em JSON — use null ou um texto');
      if (c === '.' || token.startsWith('-.')) return erro(i, 'falta um dígito antes do ponto (ex.: 0.5)');
      if (/^-?0\d/.test(token)) return erro(i, 'número com zero à esquerda não é permitido — se é um código, use texto entre aspas');
      if (/\.(?!\d)/.test(token)) return erro(i, 'falta um dígito depois do ponto decimal');
      return erro(i, `número inválido: ${token}`);
    }
    if (/[A-Za-z_$]/.test(c)) {
      const p = palavra(i);
      if (p === 'true' || p === 'false' || p === 'null') { i += p.length; estado = 'depois'; continue; }
      const minusc = p.toLowerCase();
      if (minusc === 'true' || minusc === 'false' || minusc === 'null') return erro(i, `escreva '${minusc}' em minúsculas`);
      if (p === 'undefined' || p === 'None') return erro(i, `'${p}' não existe em JSON — use null`);
      if (p === 'NaN' || p === 'Infinity') return erro(i, 'Infinity e NaN não existem em JSON — use null ou um texto');
      return erro(i, `valor desconhecido '${p}' — textos precisam de aspas duplas`);
    }
    return erro(i, `esperava um valor, mas encontrou ${nomeChar(c)}`);
  }
}

/**
 * Trecho em volta do erro: linha anterior, linha do erro, marcador '^' e
 * linha seguinte, com numeração. Linhas longas são recortadas em volta da coluna.
 */
export function trechoDoErro(texto, pos) {
  const { linha, coluna } = linhaColuna(texto, pos);
  const todas = texto.split('\n');
  const largura = String(Math.min(linha + 1, todas.length)).length;
  const corte = Math.max(0, coluna - 1 - Math.floor(LARGURA_TRECHO / 2));

  const recortar = (l) => {
    const cps = [...l.replace(/\r$/, '').replace(/\t/g, ' ')];
    const parte = cps.slice(corte, corte + LARGURA_TRECHO).join('');
    return (corte > 0 ? '…' : '') + parte + (cps.length > corte + LARGURA_TRECHO ? '…' : '');
  };
  const numerar = (k) => `${String(k).padStart(largura)} | ${recortar(todas[k - 1])}`;

  const linhas = [];
  if (linha > 1) linhas.push({ texto: numerar(linha - 1) });
  linhas.push({ texto: numerar(linha) });
  linhas.push({ texto: `${' '.repeat(largura)} | ${' '.repeat(coluna - 1 - corte + (corte > 0 ? 1 : 0))}^`, marcador: true });
  if (linha < todas.length) linhas.push({ texto: numerar(linha + 1) });
  return linhas;
}

/* ---------- RF01/RF03: formatar e minificar sem alterar valores ---------- */

/**
 * Reescreve só os espaços entre os elementos; textos e números são copiados
 * exatamente como vieram. Assim o formatador não muda dados: JSON.stringify
 * arredondaria inteiros acima de 2^53 (ex.: IDs de 19 dígitos), trocaria
 * 1.0 por 1 e descartaria campos repetidos. Para JSON comum, o resultado é
 * idêntico ao de JSON.stringify(obj, null, 2). Pressupõe texto já validado.
 */
export function reformatar(texto, indent) {
  const n = texto.length;
  const saida = [];
  let nivel = 0;
  const quebra = () => (indent ? '\n' + ' '.repeat(indent * nivel) : '');

  for (let i = 0; i < n;) {
    const c = texto[i];
    if (ESPACOS.includes(c)) { i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (texto[j] !== '"') j += texto[j] === '\\' ? 2 : 1;
      saida.push(texto.slice(i, j + 1));
      i = j + 1;
    } else if (c === '{' || c === '[') {
      let j = i + 1;
      while (ESPACOS.includes(texto[j])) j++;
      if (texto[j] === FECHA[c]) { saida.push(c + FECHA[c]); i = j + 1; continue; }
      nivel++;
      saida.push(c + quebra());
      i++;
    } else if (c === '}' || c === ']') {
      nivel--;
      saida.push(quebra() + c);
      i++;
    } else if (c === ',') {
      saida.push(',' + quebra());
      i++;
    } else if (c === ':') {
      saida.push(indent ? ': ' : ':');
      i++;
    } else {
      let j = i;   // número ou true/false/null
      while (j < n && !ESPACOS.includes(texto[j]) && !',:]}'.includes(texto[j])) j++;
      saida.push(texto.slice(i, j));
      i = j;
    }
  }
  return saida.join('');
}

/* ---------- interface ---------- */

function copiarLegado(texto) {
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

const CLASSE_FOCO = 'focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2';

class ToolJson extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1 class="text-3xl font-extrabold text-ink">Formatador / Validador JSON</h1>
      <p class="mt-1 text-muted">Formate, valide e encontre erros de estrutura — direto no seu navegador.</p>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <label for="json-in" class="text-lg font-bold text-ink">Entrada</label>
          <textarea id="json-in" spellcheck="false" placeholder='Cole o JSON aqui… ex.: {"ativo":true}'
            class="mt-2 h-72 w-full resize-y rounded-2xl border-2 border-line bg-white p-4 font-mono text-sm
                   focus-visible:outline-2 focus-visible:outline-navy"></textarea>
          <div class="mt-3 flex flex-wrap gap-3">
            <button type="button" id="btn-formatar" class="rounded-xl bg-navy px-6 py-2.5 font-bold text-white hover:bg-navy-deep ${CLASSE_FOCO}">Formatar</button>
            <button type="button" id="btn-validar" class="rounded-xl border-2 border-navy px-6 py-2.5 font-bold text-navy hover:bg-mist ${CLASSE_FOCO}">Validar</button>
            <button type="button" id="btn-minificar" class="rounded-xl border-2 border-line px-6 py-2.5 font-bold text-muted hover:bg-mist ${CLASSE_FOCO}">Minificar</button>
          </div>
        </section>

        <section>
          <h2 id="json-saida-titulo" class="text-lg font-bold text-ink">Saída</h2>
          <pre id="json-out" role="region" aria-labelledby="json-saida-titulo" tabindex="0"
               class="mt-2 h-72 w-full overflow-auto rounded-2xl border-2 border-line bg-white p-4
                      font-mono text-sm whitespace-pre-wrap wrap-anywhere focus-visible:outline-2 focus-visible:outline-navy"></pre>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <p id="json-status" role="status" class="hidden rounded-xl px-4 py-2 text-sm font-bold"></p>
            <button type="button" id="btn-ir-erro" class="hidden rounded-xl border-2 border-red-deep px-4 py-2 text-sm font-bold text-red-deep hover:bg-red-soft ${CLASSE_FOCO}">Mostrar na entrada</button>
            <button type="button" id="btn-copiar" class="hidden rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy hover:bg-line ${CLASSE_FOCO}">Copiar saída</button>
          </div>
        </section>
      </div>

      <p class="mt-8 text-sm"><strong class="text-leaf">Processado localmente</strong>
        <span class="text-muted">— nada saiu do seu navegador.</span></p>
    `;

    this.$in = this.querySelector('#json-in');
    this.$out = this.querySelector('#json-out');
    this.$status = this.querySelector('#json-status');
    this.$copiar = this.querySelector('#btn-copiar');
    this.$irErro = this.querySelector('#btn-ir-erro');
    this.posErro = null;

    this.querySelector('#btn-formatar').addEventListener('click', () => this.processar(2));
    this.querySelector('#btn-minificar').addEventListener('click', () => this.processar(0));
    this.querySelector('#btn-validar').addEventListener('click', () => this.processar(null));
    this.$copiar.addEventListener('click', () => this.copiar());
    this.$irErro.addEventListener('click', () => this.irParaErro());
  }

  /** indent: 2 = formatar, 0 = minificar, null = só validar */
  processar(indent) {
    const texto = this.$in.value;
    this.posErro = null;
    this.$irErro.classList.add('hidden');

    if (!texto.trim()) {
      this.mostrarStatus(false, 'Cole um JSON na entrada para começar.');
      this.$out.textContent = '';
      this.$copiar.classList.add('hidden');
      return;
    }

    let erroNativo = null;
    try {
      JSON.parse(texto);
    } catch (e) {
      erroNativo = e;
    }

    if (!erroNativo) {
      if (indent !== null) {
        this.$out.textContent = reformatar(texto, indent);
        this.$copiar.classList.remove('hidden');
      } else if (this.$out.dataset.erro) {
        this.$out.textContent = '';   // não deixa o trecho de um erro já corrigido na tela
      }
      delete this.$out.dataset.erro;
      this.mostrarStatus(true, '✓ JSON válido');
      return;
    }

    this.$copiar.classList.add('hidden');
    const local = localizarErro(texto);
    if (!local) {
      // Não deveria acontecer (as duas leituras seguem a mesma gramática); mostra a mensagem original.
      this.$out.textContent = '';
      this.mostrarStatus(false, `✗ JSON inválido — ${erroNativo.message}`);
      return;
    }
    const { linha, coluna } = linhaColuna(texto, local.pos);
    this.posErro = local.pos;
    this.mostrarStatus(false, `✗ JSON inválido — linha ${linha}, coluna ${coluna}: ${local.msg}`);
    this.mostrarTrecho(texto, local.pos);
    this.$irErro.classList.remove('hidden');
  }

  /** Trecho do erro na área de saída (nós de texto: o conteúdo é do usuário, nunca innerHTML). */
  mostrarTrecho(texto, pos) {
    this.$out.dataset.erro = '1';
    this.$out.replaceChildren();
    for (const l of trechoDoErro(texto, pos)) {
      const span = document.createElement('span');
      span.className = l.marcador ? 'font-bold text-red-deep' : 'text-ink';
      span.textContent = l.texto + '\n';
      this.$out.append(span);
    }
  }

  /** Seleciona o caractere do erro na entrada e rola até ele. */
  irParaErro() {
    if (this.posErro === null) return;
    const ta = this.$in;
    const pos = Math.min(this.posErro, ta.value.length);
    const fim = pos < ta.value.length ? pos + 1 : pos;
    ta.focus();
    ta.setSelectionRange(pos, fim);
    const { linha } = linhaColuna(ta.value, pos);
    const alturaLinha = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, (linha - 3) * alturaLinha);
  }

  async copiar() {
    const btn = this.$copiar;
    const original = (btn.dataset.rotulo ??= btn.textContent);
    const texto = this.$out.textContent;
    let ok = true;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      ok = copiarLegado(texto);
    }
    btn.textContent = ok ? 'Copiado ✓' : 'Não copiou';
    clearTimeout(this.timerCopia);
    this.timerCopia = setTimeout(() => (btn.textContent = original), 1500);
  }

  mostrarStatus(ok, msg) {
    this.$status.textContent = msg;
    this.$status.classList.remove('hidden');
    this.$status.classList.toggle('bg-leaf-soft', ok);
    this.$status.classList.toggle('text-leaf', ok);
    this.$status.classList.toggle('bg-red-soft', !ok);
    this.$status.classList.toggle('text-red-deep', !ok);
  }
}

customElements.define('tool-json', ToolJson);
