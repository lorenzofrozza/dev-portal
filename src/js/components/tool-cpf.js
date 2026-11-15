/**
 * tool-cpf — Gerador de dados de teste CPF/CNPJ (ciclo 2 — A IMPLEMENTAR).
 * Seguir o padrão de tool-json.js. Requisitos: RF06–RF11 em docs/REQUISITOS.md.
 * Layout de referência: docs/assets/dev_mobile_cpf.png.
 * Lembretes: números por algoritmo de DV, aviso "fictício" permanente,
 * histórico da sessão só em memória (máx. 10).
 */

class ToolCpf extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1 class="text-3xl font-extrabold text-ink">Gerador CPF/CNPJ</h1>
      <p class="mt-1 text-muted">Dados fictícios para testes e homologação — gerados por algoritmo, localmente.</p>
      <div class="mt-6 rounded-2xl border-2 border-dashed border-line bg-white p-6">
        <p class="font-bold text-navy">Ciclo 2 — em desenvolvimento</p>
        <ul class="mt-3 list-disc pl-5 text-sm text-muted leading-6">
          <li>Gerar CPF e CNPJ válidos (dígitos verificadores) — RF06, RF07</li>
          <li>Com/sem pontuação — RF08</li>
          <li>Copiar + histórico da sessão (memória, máx. 10) — RF09</li>
          <li>Aviso "fictício — para testes e homologação" — RF10</li>
          <li>Validar número digitado (modo inverso) — RF11</li>
        </ul>
      </div>
      <p class="mt-8 text-sm"><strong class="text-leaf">Processado localmente</strong>
        <span class="text-muted">— nada saiu do seu navegador.</span></p>
    `;
  }
}

customElements.define('tool-cpf', ToolCpf);
