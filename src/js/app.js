/**
 * .DEV — casca do portal: registro de ferramentas, roteador por hash,
 * montagem da navegação e registro do Service Worker.
 *
 * Regra do projeto (docs/REGRAS.md): nenhum dado do usuário sai do navegador.
 * Este arquivo não faz — e nenhum outro deve fazer — requisições com
 * conteúdo digitado pelo usuário.
 */

const TOOLS = [
  { id: 'json',  tag: 'tool-json',  nome: 'Formatador JSON',   icone: '{ }' },
  { id: 'cpf',   tag: 'tool-cpf',   nome: 'Gerador CPF/CNPJ',  icone: 'ID'  },
  { id: 'regex', tag: 'tool-regex', nome: 'Testador de Regex', icone: '.*'  },
  { id: 'diff',  tag: 'tool-diff',  nome: 'Diff de Código',    icone: '<>'  },
];

const EM_BREVE = ['Codificador Base64', 'Gerador de Hash', 'Conversor JSON ↔ CSV'];

const navTools  = document.getElementById('nav-tools');
const navMobile = document.getElementById('nav-mobile');
const navSoon   = document.getElementById('nav-soon');
const root      = document.getElementById('tool-root');

/* ---------- navegação ---------- */

function montarNavegacao() {
  for (const t of TOOLS) {
    const a = document.createElement('a');
    a.href = `#/${t.id}`;
    a.dataset.tool = t.id;
    a.className =
      'nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold ' +
      'text-ink hover:bg-mist focus-visible:outline-2 focus-visible:outline-navy no-underline';
    a.innerHTML =
      `<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mist font-bold text-navy text-sm" aria-hidden="true">${t.icone}</span>` +
      `<span>${t.nome}</span>`;
    navTools.appendChild(a);

    const b = a.cloneNode(true);
    b.className =
      'nav-item shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-ink no-underline';
    b.innerHTML = t.nome;
    b.dataset.tool = t.id;
    navMobile.appendChild(b);
  }
  for (const nome of EM_BREVE) {
    const li = document.createElement('li');
    li.textContent = nome;
    navSoon.appendChild(li);
  }
}

function marcarAtiva(id) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    const ativa = el.dataset.tool === id;
    el.classList.toggle('bg-navy', ativa);
    el.classList.toggle('text-white', ativa);
    el.setAttribute('aria-current', ativa ? 'page' : 'false');
    const icone = el.querySelector('span[aria-hidden]');
    if (icone) icone.classList.toggle('bg-white/15', ativa);
  });
}

/* ---------- roteador ---------- */

const carregadas = new Set();

async function rota() {
  const id = (location.hash.replace(/^#\/?/, '') || 'json').split('/')[0];
  const tool = TOOLS.find((t) => t.id === id) ?? TOOLS[0];

  // Micro-frontend: o componente só é baixado/avaliado na primeira abertura.
  if (!carregadas.has(tool.id)) {
    await import(`./components/tool-${tool.id}.js`);
    carregadas.add(tool.id);
  }

  root.replaceChildren(document.createElement(tool.tag));
  marcarAtiva(tool.id);
  document.title = `${tool.nome} · .DEV`;
}

/* ---------- service worker ---------- */

async function registrarSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    // O selo só aparece quando o cache offline está de fato ativo.
    const badge = document.getElementById('offline-badge');
    badge.classList.remove('hidden');
    badge.classList.add('flex');
    reg.update();
  } catch (e) {
    console.warn('[.DEV] Service Worker não registrado (file:// ?):', e.message);
  }
}

montarNavegacao();
rota();
window.addEventListener('hashchange', rota);
registrarSW();
