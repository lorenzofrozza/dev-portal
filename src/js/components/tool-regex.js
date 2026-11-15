/**
 * tool-regex — Testador de expressões regulares (ciclo 3 — A IMPLEMENTAR).
 * Seguir o padrão de tool-json.js. Requisitos: RF12–RF16 em docs/REQUISITOS.md.
 * Lembrete: padrão inválido nunca pode quebrar a tela (try/catch no new RegExp).
 */

class ToolRegex extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1 class="text-3xl font-extrabold text-ink">Testador de Regex</h1>
      <p class="mt-1 text-muted">Teste expressões com destaque das ocorrências — direto no seu navegador.</p>
      <div class="mt-6 rounded-2xl border-2 border-dashed border-line bg-white p-6">
        <p class="font-bold text-navy">Ciclo 3 — em desenvolvimento</p>
        <ul class="mt-3 list-disc pl-5 text-sm text-muted leading-6">
          <li>Padrão + flags (g, i, m, s, u) — RF12</li>
          <li>Destaque de todas as ocorrências no texto — RF13</li>
          <li>Grupos de captura por ocorrência — RF14</li>
          <li>Erro claro em padrão inválido — RF15</li>
          <li>Contador de ocorrências — RF16</li>
        </ul>
      </div>
      <p class="mt-8 text-sm"><strong class="text-leaf">Processado localmente</strong>
        <span class="text-muted">— nada saiu do seu navegador.</span></p>
    `;
  }
}

customElements.define('tool-regex', ToolRegex);
