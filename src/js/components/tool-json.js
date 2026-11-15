/**
 * tool-json — Formatador/Validador JSON (ciclo 1).
 * COMPONENTE DE REFERÊNCIA: as demais ferramentas seguem este padrão —
 * custom element em light DOM, processamento 100% em memória, nota de
 * privacidade no rodapé, nenhuma requisição de rede.
 */

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
            <button id="btn-formatar" class="rounded-xl bg-navy px-6 py-2.5 font-bold text-white hover:bg-navy-deep
                     focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2">Formatar</button>
            <button id="btn-validar" class="rounded-xl border-2 border-navy px-6 py-2.5 font-bold text-navy hover:bg-mist
                     focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2">Validar</button>
            <button id="btn-minificar" class="rounded-xl border-2 border-line px-6 py-2.5 font-bold text-muted hover:bg-mist
                     focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2">Minificar</button>
          </div>
        </section>

        <section>
          <p class="text-lg font-bold text-ink">Saída</p>
          <pre id="json-out" class="mt-2 h-72 w-full overflow-auto rounded-2xl border-2 border-line bg-white p-4
               font-mono text-sm whitespace-pre-wrap" aria-live="polite"></pre>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <span id="json-status" class="hidden rounded-xl px-4 py-2 text-sm font-bold"></span>
            <button id="btn-copiar" class="hidden rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy hover:bg-line
                     focus-visible:outline-2 focus-visible:outline-navy">Copiar saída</button>
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

    this.querySelector('#btn-formatar').addEventListener('click', () => this.processar(2));
    this.querySelector('#btn-minificar').addEventListener('click', () => this.processar(0));
    this.querySelector('#btn-validar').addEventListener('click', () => this.processar(null));
    this.$copiar.addEventListener('click', async () => {
      await navigator.clipboard.writeText(this.$out.textContent);
      this.$copiar.textContent = 'Copiado ✓';
      setTimeout(() => (this.$copiar.textContent = 'Copiar saída'), 1500);
    });
  }

  /** indent: 2 = formatar, 0 = minificar, null = só validar */
  processar(indent) {
    const texto = this.$in.value;
    if (!texto.trim()) {
      this.mostrarStatus(false, 'Cole um JSON na entrada para começar.');
      this.$out.textContent = '';
      this.$copiar.classList.add('hidden');
      return;
    }
    try {
      const obj = JSON.parse(texto);
      if (indent !== null) {
        this.$out.textContent = indent ? JSON.stringify(obj, null, indent) : JSON.stringify(obj);
        this.$copiar.classList.remove('hidden');
      }
      this.mostrarStatus(true, '✓ JSON válido');
    } catch (e) {
      this.$copiar.classList.add('hidden');
      this.$out.textContent = '';
      this.mostrarStatus(false, `✗ JSON inválido — ${this.descreverErro(e, texto)}`);
    }
  }

  /** Converte o erro do JSON.parse em "linha X, coluna Y" + trecho. */
  descreverErro(e, texto) {
    let pos = null;
    const mPos = /position (\d+)/i.exec(e.message);          // V8 (Chrome/Edge)
    const mLC = /line (\d+) column (\d+)/i.exec(e.message);  // Firefox / V8 novo
    if (mLC) return `linha ${mLC[1]}, coluna ${mLC[2]}`;
    if (mPos) pos = Number(mPos[1]);
    if (pos === null) return e.message;
    const antes = texto.slice(0, pos);
    const linha = antes.split('\n').length;
    const coluna = pos - antes.lastIndexOf('\n');
    const trecho = texto.slice(Math.max(0, pos - 12), pos + 12).replace(/\n/g, '⏎');
    return `linha ${linha}, coluna ${coluna} (perto de "…${trecho}…")`;
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
