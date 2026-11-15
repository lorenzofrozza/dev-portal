/**
 * tool-diff — Comparador de textos/código (ciclo 4 — A IMPLEMENTAR).
 * Seguir o padrão de tool-json.js. Requisitos: RF17–RF20 em docs/REQUISITOS.md.
 * Sugestão de algoritmo: diff por linha via LCS (implementação própria, sem lib).
 */

class ToolDiff extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1 class="text-3xl font-extrabold text-ink">Diff de Código</h1>
      <p class="mt-1 text-muted">Compare dois textos e veja as diferenças — direto no seu navegador.</p>
      <div class="mt-6 rounded-2xl border-2 border-dashed border-line bg-white p-6">
        <p class="font-bold text-navy">Ciclo 4 — em desenvolvimento</p>
        <ul class="mt-3 list-disc pl-5 text-sm text-muted leading-6">
          <li>Dois textos lado a lado (empilhado no mobile) — RF17</li>
          <li>Linhas adicionadas/removidas destacadas (LCS) — RF18</li>
          <li>Resumo +N / −N — RF19</li>
          <li>Copiar em diff unificado — RF20</li>
        </ul>
      </div>
      <p class="mt-8 text-sm"><strong class="text-leaf">Processado localmente</strong>
        <span class="text-muted">— nada saiu do seu navegador.</span></p>
    `;
  }
}

customElements.define('tool-diff', ToolDiff);
