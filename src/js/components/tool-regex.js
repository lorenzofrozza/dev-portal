/**
 * tool-regex — Testador de expressões regulares (ciclo 3).
 * Requisitos: RF12–RF16 em docs/REQUISITOS.md. Segue o padrão de tool-json.js:
 * custom element em light DOM, processamento 100% em memória, nota de
 * privacidade no rodapé, nenhuma requisição de rede.
 *
 * A busca roda num Web Worker criado a partir de um Blob (código deste próprio
 * arquivo, sem rede). Motivo (caso R5 do VALIDACAO.md): uma regex com
 * backtracking catastrófico, como (a+)+$, trava a thread por minutos e não pode
 * ser interrompida — no worker, basta encerrá-lo após LIMITE_MS.
 */

const LIMITE_MS = 2000;
const MAX_OCORRENCIAS = 1000;   // destacadas no texto
const MAX_LINHAS_GRUPOS = 200;  // listadas na tabela de grupos
const ESPERA_DIGITACAO_MS = 150;

const FLAGS = [
  { flag: 'g', nome: 'global', dica: 'todas as ocorrências' },
  { flag: 'i', nome: 'ignorar caixa', dica: 'maiúsculas = minúsculas' },
  { flag: 'm', nome: 'multilinha', dica: '^ e $ em cada linha' },
  { flag: 's', nome: 'dotAll', dica: '. casa quebra de linha' },
  { flag: 'u', nome: 'unicode', dica: 'emoji e \\u{…}' },
];

/** Roda dentro do worker: é serializada com toString(), então não enxerga nada deste módulo. */
function trabalhador() {
  self.onmessage = ({ data: { id, padrao, flags, texto, limite } }) => {
    const re = new RegExp(padrao, flags);
    const inicio = performance.now();
    const ocorrencias = [];
    let total = 0;
    const encontradas = flags.includes('g') ? texto.matchAll(re) : [re.exec(texto)].filter(Boolean);
    for (const m of encontradas) {
      total++;
      if (ocorrencias.length < limite) {
        ocorrencias.push({ indice: m.index, texto: m[0], grupos: m.slice(1), nomeados: m.groups ? { ...m.groups } : null });
      }
    }
    self.postMessage({ id, ocorrencias, total, ms: performance.now() - inicio });
  };
}

/** Mensagens dos motores (V8, SpiderMonkey, JavaScriptCore) → explicação em pt-BR (RF15). */
const ERROS = [
  [/unterminated group|missing \)|unterminated parenthetical/i, 'há um "(" sem o ")" correspondente'],
  [/unmatched '?\)'?|unbalanced parenthes/i, 'há um ")" sem o "(" correspondente'],
  [/nothing to repeat/i, 'quantificador (*, +, ? ou {}) sem nada antes para repetir'],
  [/unterminated character class|missing \]/i, 'há um "[" sem o "]" correspondente'],
  [/\\ at end of pattern|escape at end/i, 'a expressão termina com uma "\\" sozinha'],
  [/range out of order|out of order in character class/i, 'intervalo invertido dentro de [ ] (ex.: z-a)'],
  [/out of order in \{\}|numbers out of order/i, 'quantificador {n,m} com n maior que m'],
  [/duplicate capture group name|duplicate group name/i, 'dois grupos nomeados com o mesmo nome'],
  [/invalid capture group name|invalid group name/i, 'nome de grupo inválido'],
  [/invalid group/i, 'grupo inválido depois de "(?"'],
  [/invalid (unicode |identity )?escape|invalid escape/i, 'escape inválido (com a flag u, escapes desconhecidos não são aceitos)'],
];

function explicarErro(mensagem) {
  return ERROS.find(([re]) => re.test(mensagem))?.[1] ?? null;
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
// Duas cores alternadas para que ocorrências vizinhas não pareçam uma só.
const CLASSES_MARCA = [
  'rounded-sm bg-leaf-soft text-ink ring-1 ring-leaf/40',
  'rounded-sm bg-navy/15 text-ink ring-1 ring-navy/40',
];
const CLASSE_MARCA_VAZIA = 'inline-block h-[1.1em] w-0.5 align-text-bottom bg-navy';

class ToolRegex extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1 class="text-3xl font-extrabold text-ink">Testador de Regex</h1>
      <p class="mt-1 text-muted">Teste expressões com destaque das ocorrências e dos grupos — direto no seu navegador.</p>

      <div class="mt-6">
        <label for="re-padrao" class="text-lg font-bold text-ink">Padrão</label>
        <div class="mt-2 flex items-center rounded-2xl border-2 border-line bg-white px-4
                    focus-within:outline-2 focus-within:outline-navy focus-within:outline-offset-2" id="re-caixa">
          <span class="font-mono text-muted" aria-hidden="true">/</span>
          <input id="re-padrao" type="text" spellcheck="false" autocomplete="off" autocapitalize="off"
            placeholder="ex.: (\\w+)@(\\w+)" aria-describedby="re-status"
            class="min-w-0 flex-1 bg-transparent px-1 py-3 font-mono text-ink outline-none">
          <span id="re-flags-exibidas" class="font-mono text-muted" aria-hidden="true">/g</span>
        </div>

        <fieldset class="mt-3">
          <legend class="text-sm font-bold text-ink">Flags</legend>
          <div class="mt-2 flex flex-wrap gap-2">
            ${FLAGS.map(({ flag, nome, dica }) => `
              <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-sm text-ink has-[:checked]:border-navy has-[:checked]:bg-mist">
                <input type="checkbox" value="${flag}" class="h-4 w-4 accent-navy" ${flag === 'g' ? 'checked' : ''}>
                <span><code class="font-mono font-bold text-navy">${flag}</code> ${nome}
                  <span class="hidden text-muted sm:inline">— ${dica}</span></span>
              </label>`).join('')}
          </div>
        </fieldset>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <label for="re-texto" class="text-lg font-bold text-ink">Texto de teste</label>
          <textarea id="re-texto" spellcheck="false" placeholder="Cole aqui o texto onde a expressão será testada…"
            class="mt-2 h-72 w-full resize-y rounded-2xl border-2 border-line bg-white p-4 font-mono text-sm text-ink
                   focus-visible:outline-2 focus-visible:outline-navy"></textarea>
        </section>

        <section>
          <p class="text-lg font-bold text-ink" id="re-destaque-titulo">Ocorrências destacadas</p>
          <pre id="re-destaque" aria-labelledby="re-destaque-titulo"
            class="mt-2 h-72 w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl border-2 border-line bg-white p-4 font-mono text-sm text-ink"></pre>
        </section>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-3">
        <p id="re-status" role="status" class="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy">Digite um padrão e um texto de teste.</p>
        <button type="button" id="re-copiar" class="hidden rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy hover:bg-line ${CLASSE_FOCO}">Copiar regex</button>
      </div>
      <p id="re-detalhe" class="mt-2 hidden text-sm text-muted"></p>

      <section class="mt-8" aria-labelledby="re-grupos-titulo">
        <h2 id="re-grupos-titulo" class="text-lg font-bold text-ink">Grupos de captura</h2>
        <p id="re-grupos-vazio" class="mt-2 text-sm text-muted">Use parênteses para capturar partes da ocorrência — ex.: <code class="font-mono">(\\w+)@(\\w+)</code>.</p>
        <div id="re-grupos" tabindex="0" role="region" aria-labelledby="re-grupos-titulo"
          class="mt-2 hidden overflow-x-auto rounded-2xl border-2 border-line bg-white ${CLASSE_FOCO}"></div>
      </section>

      <p class="mt-8 text-sm"><strong class="text-leaf">Processado localmente</strong>
        <span class="text-muted">— nada saiu do seu navegador.</span></p>
    `;

    this.$padrao = this.querySelector('#re-padrao');
    this.$caixa = this.querySelector('#re-caixa');
    this.$flagsExibidas = this.querySelector('#re-flags-exibidas');
    this.$flags = [...this.querySelectorAll('fieldset input[type="checkbox"]')];
    this.$texto = this.querySelector('#re-texto');
    this.$destaque = this.querySelector('#re-destaque');
    this.$status = this.querySelector('#re-status');
    this.$detalhe = this.querySelector('#re-detalhe');
    this.$copiar = this.querySelector('#re-copiar');
    this.$grupos = this.querySelector('#re-grupos');
    this.$gruposVazio = this.querySelector('#re-grupos-vazio');

    this.seq = 0;
    const agendar = () => {
      clearTimeout(this.espera);
      this.espera = setTimeout(() => this.avaliar(), ESPERA_DIGITACAO_MS);
    };
    this.$padrao.addEventListener('input', agendar);
    this.$texto.addEventListener('input', agendar);
    this.$flags.forEach((cb) => cb.addEventListener('change', () => this.avaliar()));
    this.$copiar.addEventListener('click', async () => {
      const ok = await copiarTexto(this.$copiar.dataset.regex);
      this.$copiar.textContent = ok ? 'Copiado ✓' : 'Não copiou';
      setTimeout(() => (this.$copiar.textContent = 'Copiar regex'), 1500);
    });

    // O worker nasce com a ferramenta (antes de qualquer digitação), não a cada busca.
    this.criarWorker();
  }

  disconnectedCallback() {
    clearTimeout(this.espera);
    clearTimeout(this.limite);
    clearTimeout(this.aviso);
    this.encerrarWorker();
  }

  criarWorker() {
    const url = URL.createObjectURL(new Blob([`(${trabalhador})()`], { type: 'text/javascript' }));
    this.worker = new Worker(url);
    URL.revokeObjectURL(url);
    this.ocupado = false;
    this.worker.onmessage = ({ data }) => {
      this.ocupado = false;
      if (data.id !== this.seq) return; // resposta de uma busca já superada pela digitação
      clearTimeout(this.limite);
      this.mostrarResultado(data);
    };
  }

  encerrarWorker() {
    this.worker?.terminate();
    this.worker = null;
    this.ocupado = false;
  }

  flagsMarcadas() {
    return this.$flags.filter((cb) => cb.checked).map((cb) => cb.value).join('');
  }

  avaliar() {
    const padrao = this.$padrao.value;
    const flags = this.flagsMarcadas();
    const texto = this.$texto.value;
    const id = ++this.seq;
    clearTimeout(this.limite);
    this.$flagsExibidas.textContent = `/${flags}`;

    this.$copiar.classList.add('hidden');

    if (!padrao) {
      this.marcarErro(false);
      this.mostrarStatus('neutro', 'Digite um padrão e um texto de teste.');
      this.limparResultado(texto);
      return;
    }

    // RF15 — erro de sintaxe é detectado aqui, na hora, sem passar pelo worker.
    let re;
    try {
      re = new RegExp(padrao, flags);
    } catch (e) {
      const explicacao = explicarErro(e.message);
      this.marcarErro(true);
      this.mostrarStatus('erro', `✗ Padrão inválido${explicacao ? ` — ${explicacao}` : ''}`, `Mensagem do navegador: ${e.message}`);
      this.limparResultado(texto);
      return;
    }
    this.marcarErro(false);
    this.$copiar.dataset.regex = re.toString();
    this.$copiar.classList.remove('hidden');

    if (!texto) {
      this.mostrarStatus('neutro', 'Digite um texto de teste.');
      this.limparResultado(texto);
      return;
    }

    this.textoAvaliado = texto;
    this.flagsAvaliadas = flags;
    // Busca anterior ainda rodando (ex.: presa num padrão catastrófico que o
    // usuário acabou de corrigir) → descarta o worker em vez de enfileirar atrás dela.
    if (this.ocupado) this.encerrarWorker();
    if (!this.worker) this.criarWorker();
    this.limite = setTimeout(() => {
      if (id !== this.seq) return;
      this.encerrarWorker();
      this.mostrarStatus(
        'erro',
        `✗ A busca passou de ${LIMITE_MS / 1000} s e foi interrompida`,
        'O padrão provavelmente tem backtracking catastrófico (ex.: (a+)+$). Evite quantificadores aninhados sobre o mesmo trecho.'
      );
      this.limparResultado(texto);
    }, LIMITE_MS);
    // Busca lenta: não deixar o resultado anterior na tela como se fosse o atual.
    clearTimeout(this.aviso);
    this.aviso = setTimeout(() => {
      if (id === this.seq && this.ocupado) this.mostrarStatus('neutro', 'Buscando…');
    }, 250);
    this.ocupado = true;
    this.worker.postMessage({ id, padrao, flags, texto, limite: MAX_OCORRENCIAS });
  }

  /** RF13 + RF16 + RF14 */
  mostrarResultado({ ocorrencias, total, ms }) {
    const texto = this.textoAvaliado;
    const partes = [];
    let pos = 0;
    ocorrencias.forEach((o, i) => {
      if (o.indice > pos) partes.push(texto.slice(pos, o.indice));
      const marca = document.createElement('mark');
      if (o.texto === '') {
        marca.className = CLASSE_MARCA_VAZIA;
        marca.title = `Ocorrência vazia na posição ${o.indice}`;
      } else {
        marca.className = CLASSES_MARCA[i % 2];
        marca.textContent = o.texto;
      }
      partes.push(marca);
      pos = o.indice + o.texto.length;
    });
    partes.push(texto.slice(pos));
    this.$destaque.replaceChildren(...partes);

    const tempo = ms < 1 ? 'menos de 1 ms' : `${Math.round(ms)} ms`;
    const semG = this.flagsAvaliadas.includes('g') ? '' : ' (sem a flag g, só a primeira)';
    const recorte = total > ocorrencias.length ? ` — destacando as primeiras ${ocorrencias.length}` : '';
    if (total === 0) this.mostrarStatus('neutro', `Nenhuma ocorrência${semG}`, `Busca em ${tempo}.`);
    else this.mostrarStatus('ok', `✓ ${total} ${total === 1 ? 'ocorrência' : 'ocorrências'}${semG}${recorte}`, `Busca em ${tempo}.`);

    this.mostrarGrupos(ocorrencias);
  }

  mostrarGrupos(ocorrencias) {
    const qtdGrupos = ocorrencias[0]?.grupos.length ?? 0;
    const nomes = Object.keys(ocorrencias[0]?.nomeados ?? {});
    if (!ocorrencias.length || !qtdGrupos) {
      this.$grupos.classList.add('hidden');
      this.$grupos.replaceChildren();
      this.$gruposVazio.classList.remove('hidden');
      return;
    }

    const celula = (tag, conteudo, classe = '') => {
      const el = document.createElement(tag);
      el.className = `border-b border-line px-3 py-2 text-left align-top ${classe}`;
      if (conteudo === undefined) {
        el.textContent = '(não participou)';
        el.classList.add('italic', 'text-muted');
      } else {
        el.textContent = conteudo;
      }
      return el;
    };

    const tabela = document.createElement('table');
    tabela.className = 'w-full border-collapse text-sm';
    const cabecalho = document.createElement('tr');
    ['#', 'Posição', 'Ocorrência', ...Array.from({ length: qtdGrupos }, (_, i) => `$${i + 1}`), ...nomes.map((n) => `<${n}>`)]
      .forEach((titulo) => {
        const th = celula('th', titulo, 'bg-mist font-bold text-navy whitespace-nowrap');
        th.scope = 'col';
        cabecalho.append(th);
      });
    const thead = document.createElement('thead');
    thead.append(cabecalho);

    const tbody = document.createElement('tbody');
    ocorrencias.slice(0, MAX_LINHAS_GRUPOS).forEach((o, i) => {
      const tr = document.createElement('tr');
      tr.append(
        celula('td', String(i + 1), 'text-muted'),
        celula('td', String(o.indice), 'text-muted'),
        celula('td', o.texto, 'font-mono'),
        ...o.grupos.map((g) => celula('td', g, 'font-mono')),
        ...nomes.map((n) => celula('td', o.nomeados[n], 'font-mono'))
      );
      tbody.append(tr);
    });
    tabela.append(thead, tbody);

    const nodos = [tabela];
    if (ocorrencias.length > MAX_LINHAS_GRUPOS) {
      const nota = document.createElement('p');
      nota.className = 'px-3 py-2 text-sm text-muted';
      nota.textContent = `Mostrando as primeiras ${MAX_LINHAS_GRUPOS} ocorrências.`;
      nodos.push(nota);
    }
    this.$grupos.replaceChildren(...nodos);
    this.$grupos.classList.remove('hidden');
    this.$gruposVazio.classList.add('hidden');
  }

  limparResultado(texto) {
    this.$destaque.textContent = texto;
    this.$grupos.classList.add('hidden');
    this.$grupos.replaceChildren();
    this.$gruposVazio.classList.remove('hidden');
  }

  marcarErro(erro) {
    this.$padrao.setAttribute('aria-invalid', String(erro));
    this.$caixa.classList.toggle('border-red-deep', erro);
    this.$caixa.classList.toggle('border-line', !erro);
  }

  /** tipo: 'ok' | 'erro' | 'neutro' */
  mostrarStatus(tipo, msg, detalhe = '') {
    this.$status.textContent = msg;
    this.$status.classList.toggle('bg-leaf-soft', tipo === 'ok');
    this.$status.classList.toggle('text-leaf', tipo === 'ok');
    this.$status.classList.toggle('bg-red-soft', tipo === 'erro');
    this.$status.classList.toggle('text-red-deep', tipo === 'erro');
    this.$status.classList.toggle('bg-mist', tipo === 'neutro');
    this.$status.classList.toggle('text-navy', tipo === 'neutro');
    this.$detalhe.textContent = detalhe;
    this.$detalhe.classList.toggle('hidden', !detalhe);
  }
}

customElements.define('tool-regex', ToolRegex);
