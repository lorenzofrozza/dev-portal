/**
 * tool-cpf — Gerador e validador de CPF/CNPJ fictícios (ciclo 2).
 * Requisitos: RF06–RF11 em docs/REQUISITOS.md. Layout: docs/assets/dev_mobile_cpf.png.
 * Segue o padrão de tool-json.js: custom element em light DOM, processamento
 * 100% em memória, nota de privacidade no rodapé, nenhuma requisição de rede.
 *
 * Os números saem do algoritmo de dígitos verificadores (módulo 11) da Receita
 * Federal: são válidos no formato, mas fictícios — por isso o aviso fica sempre
 * visível (RF10).
 */

const MAX_HISTORICO = 10;

const PESOS_CPF_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CPF_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Dígito verificador módulo 11: resto < 2 → 0, senão 11 − resto. */
function dv(digitos, pesos) {
  const resto = pesos.reduce((soma, peso, i) => soma + digitos[i] * peso, 0) % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function completarCpf(base9) {
  const d1 = dv(base9, PESOS_CPF_1);
  return [...base9, d1, dv([...base9, d1], PESOS_CPF_2)];
}

function completarCnpj(base12) {
  const d1 = dv(base12, PESOS_CNPJ_1);
  return [...base12, d1, dv([...base12, d1], PESOS_CNPJ_2)];
}

/**
 * Dígitos de crypto.getRandomValues (API nativa, sem rede). Bytes 250–255 são
 * descartados para que byte % 10 não favoreça os dígitos 0–5.
 */
function digitosAleatorios(n) {
  const saida = [];
  const byte = new Uint8Array(1);
  while (saida.length < n) {
    crypto.getRandomValues(byte);
    if (byte[0] < 250) saida.push(byte[0] % 10);
  }
  return saida;
}

/** RF06 — CPF com DV válido. Sequências repetidas (111.111.111-11) são recusadas por validadores reais. */
export function gerarCpf() {
  let base;
  do base = digitosAleatorios(9); while (base.every((d) => d === base[0]));
  return completarCpf(base).join('');
}

/** RF07 — CNPJ com DV válido; filial fixa 0001 (matriz), o formato mais comum em testes. */
export function gerarCnpj() {
  return completarCnpj([...digitosAleatorios(8), 0, 0, 0, 1]).join('');
}

/** RF08 — aplica ou remove a máscara; os dígitos guardados nunca mudam. */
export function formatar(digitos, comPontuacao) {
  if (!comPontuacao) return digitos;
  return digitos.length === 11
    ? digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/** RF11 — confere os dígitos verificadores de um CPF ou CNPJ digitado. */
export function validar(texto) {
  const entrada = texto.trim();
  if (!entrada) return { ok: false, msg: 'Digite um CPF ou CNPJ para validar.' };
  if (/[a-z]/i.test(entrada)) {
    return { ok: false, msg: 'Contém letras — o CNPJ alfanumérico (novo formato da Receita) ainda não é suportado.' };
  }

  const digitos = entrada.replace(/\D/g, '');
  const tipo = digitos.length === 11 ? 'CPF' : digitos.length === 14 ? 'CNPJ' : null;
  if (!tipo) {
    return { ok: false, msg: `Tem ${digitos.length} dígito(s) — CPF tem 11 e CNPJ tem 14.` };
  }

  const nums = [...digitos].map(Number);
  if (nums.every((d) => d === nums[0])) {
    return { ok: false, tipo, msg: `✗ ${tipo} inválido — todos os dígitos são iguais.` };
  }

  const esperado = (tipo === 'CPF' ? completarCpf(nums.slice(0, 9)) : completarCnpj(nums.slice(0, 12))).join('');
  if (esperado === digitos) return { ok: true, tipo, msg: `✓ ${tipo} válido — dígitos verificadores conferem.` };
  return { ok: false, tipo, msg: `✗ ${tipo} inválido — os dígitos verificadores deveriam ser ${esperado.slice(-2)}.` };
}

/**
 * Alternativa para quando a Clipboard API é negada (WebViews, navegadores
 * embutidos, Safari antigo): copia por um textarea temporário. Local, sem rede.
 */
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

/*
 * Estado da sessão: fica no escopo do módulo para sobreviver à troca de
 * ferramenta (o elemento é recriado a cada rota), mas só em memória — some
 * ao recarregar a página (RF09; regra 5 de docs/REGRAS.md).
 */
const sessao = {
  tipo: 'CPF',
  comPontuacao: true,
  atual: null,      // { tipo, digitos }
  historico: [],    // anteriores ao atual, mais recente primeiro
};

const CLASSE_FOCO = 'focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2';

class ToolCpf extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1 class="text-3xl font-extrabold text-ink">Gerador CPF/CNPJ</h1>
      <p class="mt-1 text-muted">Gere e valide números fictícios para testes e homologação — direto no seu navegador.</p>

      <div class="mt-6 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="cpf-gerar-titulo">
          <h2 id="cpf-gerar-titulo" class="text-lg font-bold text-ink">Gerar</h2>

          <div role="group" aria-label="Tipo de documento" class="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-mist p-1">
            <button type="button" data-tipo="CPF" class="tipo-btn rounded-xl px-4 py-2.5 font-bold ${CLASSE_FOCO}">CPF</button>
            <button type="button" data-tipo="CNPJ" class="tipo-btn rounded-xl px-4 py-2.5 font-bold ${CLASSE_FOCO}">CNPJ</button>
          </div>

          <fieldset class="mt-5">
            <legend class="font-bold text-ink">Com pontuação?</legend>
            <div class="mt-2 flex gap-6">
              <label class="flex items-center gap-2 text-ink">
                <input type="radio" name="cpf-pontuacao" value="sim" class="h-4 w-4 accent-navy"> Sim
              </label>
              <label class="flex items-center gap-2 text-ink">
                <input type="radio" name="cpf-pontuacao" value="nao" class="h-4 w-4 accent-navy"> Não
              </label>
            </div>
          </fieldset>

          <div class="mt-5 rounded-2xl border-2 border-line bg-white p-5">
            <p id="cpf-rotulo" class="text-sm text-muted"></p>
            <output id="cpf-numero" aria-live="polite" aria-labelledby="cpf-rotulo"
              class="mt-2 block break-all font-mono text-2xl text-ink sm:text-3xl lg:text-2xl xl:text-3xl"></output>
            <p class="mt-4 inline-block rounded-xl bg-leaf-soft px-3 py-1.5 text-sm font-bold text-leaf">fictício — para testes e homologação</p>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <button type="button" id="cpf-gerar" class="rounded-xl bg-navy px-6 py-2.5 font-bold text-white hover:bg-navy-deep ${CLASSE_FOCO}">Gerar novo</button>
            <button type="button" id="cpf-copiar" class="rounded-xl border-2 border-navy px-6 py-2.5 font-bold text-navy hover:bg-mist ${CLASSE_FOCO}">Copiar</button>
          </div>

          <h3 class="mt-8 font-bold text-ink">Histórico (nesta sessão)</h3>
          <ul id="cpf-historico" class="mt-2 flex flex-col gap-2"></ul>
          <p id="cpf-historico-vazio" class="mt-2 text-sm text-muted">Os números anteriores aparecem aqui (até ${MAX_HISTORICO}).</p>
          <p class="mt-2 text-sm text-muted">Guardado só na memória desta aba — some ao recarregar a página.</p>
        </section>

        <section aria-labelledby="cpf-validar-titulo">
          <h2 id="cpf-validar-titulo" class="text-lg font-bold text-ink">Validar</h2>
          <p class="mt-1 text-sm text-muted">Confira os dígitos verificadores de um CPF ou CNPJ, com ou sem pontuação.</p>
          <label for="cpf-entrada" class="mt-4 block font-bold text-ink">CPF ou CNPJ</label>
          <div class="mt-2 flex flex-wrap gap-3">
            <input id="cpf-entrada" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="24"
              class="min-w-0 flex-1 rounded-xl border-2 border-line bg-white px-4 py-2.5 font-mono text-ink
                     focus-visible:outline-2 focus-visible:outline-navy">
            <button type="button" id="cpf-validar" class="rounded-xl border-2 border-navy px-6 py-2.5 font-bold text-navy hover:bg-mist ${CLASSE_FOCO}">Validar</button>
          </div>
          <p id="cpf-resultado" role="status" class="mt-3 hidden rounded-xl px-4 py-2 text-sm font-bold"></p>
        </section>
      </div>

      <p class="mt-8 text-sm"><strong class="text-leaf">Processado localmente</strong>
        <span class="text-muted">— nada saiu do seu navegador.</span></p>
    `;

    this.$rotulo = this.querySelector('#cpf-rotulo');
    this.$numero = this.querySelector('#cpf-numero');
    this.$historico = this.querySelector('#cpf-historico');
    this.$vazio = this.querySelector('#cpf-historico-vazio');
    this.$entrada = this.querySelector('#cpf-entrada');
    this.$resultado = this.querySelector('#cpf-resultado');

    this.querySelectorAll('.tipo-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (btn.dataset.tipo === sessao.tipo) return;
        sessao.tipo = btn.dataset.tipo;
        this.gerar();
      })
    );
    this.querySelectorAll('input[name="cpf-pontuacao"]').forEach((radio) => {
      radio.checked = (radio.value === 'sim') === sessao.comPontuacao;
      radio.addEventListener('change', () => {
        sessao.comPontuacao = radio.value === 'sim';
        this.render();
      });
    });
    this.querySelector('#cpf-gerar').addEventListener('click', () => this.gerar());
    this.querySelector('#cpf-copiar').addEventListener('click', (e) =>
      this.copiar(e.currentTarget, sessao.atual.digitos)
    );
    this.$historico.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-digitos]');
      if (btn) this.copiar(btn, btn.dataset.digitos);
    });

    // Sem <form>: nada aqui pode virar um submit com o que o usuário digitou.
    this.querySelector('#cpf-validar').addEventListener('click', () => this.validarEntrada());
    this.$entrada.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.validarEntrada();
    });

    if (sessao.atual) this.render();
    else this.gerar();
  }

  gerar() {
    if (sessao.atual) {
      sessao.historico.unshift(sessao.atual);
      sessao.historico.length = Math.min(sessao.historico.length, MAX_HISTORICO);
    }
    sessao.atual = { tipo: sessao.tipo, digitos: sessao.tipo === 'CPF' ? gerarCpf() : gerarCnpj() };
    this.render();
  }

  render() {
    this.querySelectorAll('.tipo-btn').forEach((btn) => {
      const ativo = btn.dataset.tipo === sessao.tipo;
      btn.setAttribute('aria-pressed', String(ativo));
      btn.classList.toggle('bg-navy', ativo);
      btn.classList.toggle('text-white', ativo);
      btn.classList.toggle('text-muted', !ativo);
      btn.classList.toggle('hover:bg-white', !ativo);
    });

    this.$rotulo.textContent = `${sessao.atual.tipo} gerado`;
    this.$numero.textContent = formatar(sessao.atual.digitos, sessao.comPontuacao);

    this.$historico.replaceChildren(
      ...sessao.historico.map(({ tipo, digitos }) => {
        const texto = formatar(digitos, sessao.comPontuacao);
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-2';

        const info = document.createElement('span');
        info.className = 'flex min-w-0 items-center gap-3';
        const tag = document.createElement('span');
        tag.className = 'shrink-0 rounded-md bg-mist px-2 py-0.5 text-xs font-bold text-navy';
        tag.textContent = tipo;
        const num = document.createElement('span');
        num.className = 'break-all font-mono text-ink';
        num.textContent = texto;
        info.append(tag, num);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.digitos = digitos;
        btn.className = `shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-navy hover:bg-mist ${CLASSE_FOCO}`;
        btn.textContent = 'Copiar';
        btn.setAttribute('aria-label', `Copiar ${tipo} ${texto}`);

        li.append(info, btn);
        return li;
      })
    );
    this.$vazio.classList.toggle('hidden', sessao.historico.length > 0);
  }

  /** RF09 — copia no formato que está na tela (com ou sem pontuação). */
  async copiar(btn, digitos) {
    const original = (btn.dataset.rotulo ??= btn.textContent); // cliques seguidos não "travam" o rótulo
    const texto = formatar(digitos, sessao.comPontuacao);
    let ok = true;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      ok = copiarLegado(texto);
    }
    btn.textContent = ok ? 'Copiado ✓' : 'Não copiou';
    setTimeout(() => (btn.textContent = original), 1500);
  }

  validarEntrada() {
    const { ok, msg } = validar(this.$entrada.value);
    this.$resultado.textContent = msg;
    this.$resultado.classList.remove('hidden');
    this.$resultado.classList.toggle('bg-leaf-soft', ok);
    this.$resultado.classList.toggle('text-leaf', ok);
    this.$resultado.classList.toggle('bg-red-soft', !ok);
    this.$resultado.classList.toggle('text-red-deep', !ok);
  }
}

customElements.define('tool-cpf', ToolCpf);
