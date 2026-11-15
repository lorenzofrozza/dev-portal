/**
 * Testes automatizados da lógica das ferramentas (casos J, C e D de
 * docs/VALIDACAO.md + testes de propriedade). Rodar com: npm test
 *
 * Sem dependências: usa o executor de testes embutido no Node (node:test).
 * A interface (cliques, rede, offline, 360 px) é verificada no navegador —
 * resultados em docs/validacao-resultados/.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Os componentes registram custom elements ao serem importados; no Node bastam stubs.
globalThis.HTMLElement = class {};
globalThis.customElements = { define() {} };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const json = await import('../src/js/components/tool-json.js');
const cpf = await import('../src/js/components/tool-cpf.js');
const diff = await import('../src/js/components/tool-diff.js');

/* ---------- utilitários ---------- */

// Gerador pseudoaleatório com semente: falhas reproduzíveis.
function rng(semente) {
  let s = semente >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function valorAleatorio(r, prof = 0) {
  const t = Math.floor(r() * (prof > 3 ? 4 : 6));
  const textos = ['', 'a', 'olá', 'ação "aspas"', 'barra \\ e /', 'tab\tquebra\n', '😀 emoji', '\u0001', 'x'.repeat(30)];
  if (t === 0) return textos[Math.floor(r() * textos.length)];
  if (t === 1) return [0, -1, 3.14, 1e21, -0.5, 42, 1e-7][Math.floor(r() * 7)];
  if (t === 2) return [true, false, null][Math.floor(r() * 3)];
  if (t === 3) return Math.floor(r() * 1000);
  if (t === 4) return Array.from({ length: Math.floor(r() * 4) }, () => valorAleatorio(r, prof + 1));
  const o = {};
  for (let k = Math.floor(r() * 4); k > 0; k--) o[`c${Math.floor(r() * 20)}`] = valorAleatorio(r, prof + 1);
  return o;
}

/** Espaços aleatórios entre os elementos (fora dos textos). */
function espalharEspacos(texto, r) {
  let saida = '';
  let emTexto = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    saida += c;
    if (emTexto) {
      if (c === '\\') saida += texto[++i];
      else if (c === '"') emTexto = false;
    } else if (c === '"') emTexto = true;
    else if ('{[,:'.includes(c) && r() < 0.5) saida += [' ', '\n', '\t', '\r\n  '][Math.floor(r() * 4)];
  }
  return saida;
}

const parseOk = (t) => { try { JSON.parse(t); return true; } catch { return false; } };

/* ---------- tool-json ---------- */

test('J1 — JSON compacto é formatado com 2 espaços (igual ao JSON.stringify)', () => {
  const entrada = '{"nome":"Ana","idade":30,"tags":["a","b"],"vazio":{},"lista":[]}';
  assert.equal(json.reformatar(entrada, 2), JSON.stringify(JSON.parse(entrada), null, 2));
  assert.equal(json.reformatar(entrada, 0), entrada);
});

test('J2 — vírgula sobrando: inválido, aponta linha e coluna da vírgula', () => {
  const texto = '{\n  "nome": "Ana",\n  "idade": 30,\n}';
  assert.equal(parseOk(texto), false);
  const e = json.localizarErro(texto);
  assert.deepEqual(json.linhaColuna(texto, e.pos), { linha: 3, coluna: 14 });
  assert.match(e.msg, /vírgula sobrando/);
});

test('J3 — aspas simples: inválido, mensagem explica a exigência de aspas duplas', () => {
  for (const texto of ["{'nome': 'Ana'}", "{\"nome\": 'Ana'}"]) {
    const e = json.localizarErro(texto);
    assert.ok(e, texto);
    assert.match(e.msg, /aspas simples/);
  }
});

test('J5 — JSON de ~1 MB é validado e formatado rapidamente', () => {
  const r = rng(5);
  const itens = Array.from({ length: 15000 }, (_, i) => ({ id: i, nome: `Usuário ${i}`, ativo: r() < 0.5, extra: valorAleatorio(r) }));
  const texto = JSON.stringify(itens);
  assert.ok(texto.length > 1_000_000, `tamanho: ${texto.length}`);
  const t0 = performance.now();
  JSON.parse(texto);
  const saida = json.reformatar(texto, 2);
  const ms = performance.now() - t0;
  assert.equal(saida, JSON.stringify(itens, null, 2));
  assert.ok(ms < 1000, `${ms.toFixed(0)} ms`);
  // O localizador também precisa ser rápido no pior caso (erro no último caractere).
  const t1 = performance.now();
  assert.ok(json.localizarErro(texto.slice(0, -1)));
  assert.ok(performance.now() - t1 < 1000);
});

test('J6 — acentos, emoji e escapes são preservados', () => {
  const texto = '{"cidade":"Torres – RS","emoji":"🚀✨","esc":"\\u00e9 \\n \\"x\\""}';
  const saida = json.reformatar(texto, 2);
  assert.match(saida, /Torres – RS/);
  assert.match(saida, /🚀✨/);
  assert.match(saida, /\\u00e9 \\n \\"x\\"/);
  assert.deepEqual(JSON.parse(saida), JSON.parse(texto));
});

test('Formatar não altera valores: inteiros grandes, 1.0, expoentes, campos repetidos', () => {
  const texto = '{"id":12345678901234567890,"preco":1.0,"e":1E5,"a":1,"a":2}';
  assert.equal(
    json.reformatar(texto, 2),
    '{\n  "id": 12345678901234567890,\n  "preco": 1.0,\n  "e": 1E5,\n  "a": 1,\n  "a": 2\n}',
  );
});

test('Formatar = JSON.stringify em 2.000 JSONs aleatórios (com espaços variados na entrada)', () => {
  const r = rng(42);
  for (let k = 0; k < 2000; k++) {
    const v = valorAleatorio(r);
    const entrada = espalharEspacos(JSON.stringify(v), r);
    assert.equal(json.reformatar(entrada, 2), JSON.stringify(v, null, 2), entrada);
    assert.equal(json.reformatar(entrada, 0), JSON.stringify(v), entrada);
    assert.equal(json.reformatar(json.reformatar(entrada, 2), 2), json.reformatar(entrada, 2)); // idempotente
  }
});

test('RF02 — localizador concorda com JSON.parse em 20.000 entradas mutadas', () => {
  const r = rng(7);
  const pedacos = [',', ':', '{', '}', '[', ']', '"', "'", '\\', '0', '-', '.', 'e', 'x', ' ', '\n', 'true', 'nul', '//', '\u00a0', '\t'];
  let invalidos = 0;
  for (let k = 0; k < 20000; k++) {
    let t = espalharEspacos(JSON.stringify(valorAleatorio(r)), r);
    for (let m = 1 + Math.floor(r() * 2); m > 0; m--) {
      const p = Math.floor(r() * (t.length + 1));
      const op = r();
      if (op < 0.33) t = t.slice(0, p) + t.slice(p + 1);
      else if (op < 0.66) t = t.slice(0, p) + pedacos[Math.floor(r() * pedacos.length)] + t.slice(p);
      else t = t.slice(0, p) + pedacos[Math.floor(r() * pedacos.length)] + t.slice(p + 1);
    }
    const e = json.localizarErro(t);
    assert.equal(e === null, parseOk(t), `discordância em ${JSON.stringify(t)}: ${e?.msg}`);
    if (e) {
      invalidos++;
      assert.ok(e.pos >= 0 && e.pos <= t.length, `posição fora do texto: ${e.pos}`);
      assert.ok(e.msg.length > 0);
    }
  }
  assert.ok(invalidos > 10000, `poucos casos inválidos: ${invalidos}`);
});

test('RF02 — erros comuns: posição e mensagem', () => {
  const casos = [
    // [texto, linha, coluna, trecho esperado da mensagem]
    ['{"a": 1,}', 1, 8, /vírgula sobrando antes de '\}'/],
    ['[1, 2,]', 1, 6, /vírgula sobrando antes de '\]'/],
    ['{"a": 1\n "b": 2}', 2, 2, /faltou uma vírgula/],
    ['{nome: "Ana"}', 1, 2, /sem aspas — escreva "nome"/],
    ['{"a" 1}', 1, 6, /faltou ':'/],
    ['{"a": }', 1, 7, /faltou o valor/],
    ['{"a": [1, 2}', 1, 12, /não combina com o '\[' aberto na linha 1, coluna 7/],
    ['{"a": 1', 1, 8, /terminou sem fechar o '\{'/],
    ['{"a": 1}\n\n', 3, 1, null], // válido (trailing whitespace)
    ['{"a": 1}}', 1, 9, /sobrando/],
    ['{"a": 1} {"b": 2}', 1, 10, /depois do fim/],
    ['{"a": "abc\n}', 1, 7, /faltam as aspas/],
    ['{"caminho": "C:\\pasta"}', 1, 16, /barra invertida inválida/],
    ['{"a": True}', 1, 7, /'true' em minúsculas/],
    ['{"a": undefined}', 1, 7, /use null/],
    ['{"a": 007}', 1, 7, /zero à esquerda/],
    ['{"a": .5}', 1, 7, /antes do ponto/],
    ['{"a": 1.}', 1, 7, /depois do ponto/],
    ['{"a": NaN}', 1, 7, /NaN/],
    ['{"a": 0x1F}', 1, 7, /hexadecimais/],
    ['{"a": 1} // fim', 1, 10, /comentários/],
    ['{"a":\u00a01}', 1, 6, /U\+00A0/],
    ['\ufeff{"a": 1}', 1, 1, /BOM/],
    ['{"a": "😀😀", "b": x}', 1, 18, /valor desconhecido 'x'/], // coluna conta emoji como 1 caractere
    ['[1,,2]', 1, 4, /vírgula repetida/],
    ['   ', 1, 1, /antes de um valor/],
  ];
  for (const [texto, linha, coluna, msg] of casos) {
    const e = json.localizarErro(texto);
    if (msg === null) {
      assert.equal(e, null, texto);
      continue;
    }
    assert.ok(e, `deveria ser inválido: ${texto}`);
    assert.deepEqual(json.linhaColuna(texto, e.pos), { linha, coluna }, `${texto} → ${e.msg}`);
    assert.match(e.msg, msg, texto);
  }
});

test('RF02 — JSON aninhado 100.000 níveis não estoura a pilha', () => {
  const fundo = '['.repeat(100000) + ']'.repeat(99999);
  const e = json.localizarErro(fundo);
  assert.match(e.msg, /terminou sem fechar/);
});

test('RF02 — trecho do erro: linha anterior, linha do erro e marcador na coluna certa', () => {
  const texto = '{\n  "nome": "Ana",\n  "idade": 30,\n}';
  const pos = json.localizarErro(texto).pos;
  const linhas = json.trechoDoErro(texto, pos).map((l) => l.texto);
  assert.deepEqual(linhas, ['2 |   "nome": "Ana",', '3 |   "idade": 30,', '  |              ^', '4 | }']);
  // Linha longa: recorta em volta do erro e mantém o marcador alinhado.
  const longo = `{"a": "${'x'.repeat(300)}", "b": nada}`;
  const t = json.trechoDoErro(longo, json.localizarErro(longo).pos);
  const linhaErro = t[0].texto;
  const marcador = t[1].texto;
  assert.equal(linhaErro[marcador.indexOf('^')], 'n');
});

/* ---------- tool-cpf ---------- */

// Validador independente (implementação separada do algoritmo, para não testar o código com ele mesmo).
function dvIndependente(numeros, pesoInicial, pesos) {
  const p = pesos ?? numeros.map((_, i) => pesoInicial - i);
  const r = numeros.reduce((s, d, i) => s + d * p[i], 0) % 11;
  return r < 2 ? 0 : 11 - r;
}
function cpfValido(s) {
  const d = [...s].map(Number);
  return s.length === 11 && dvIndependente(d.slice(0, 9), 10) === d[9] && dvIndependente(d.slice(0, 10), 11) === d[10];
}
function cnpjValido(s) {
  const d = [...s].map(Number);
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return s.length === 14 && dvIndependente(d.slice(0, 12), 0, p1) === d[12] && dvIndependente(d.slice(0, 13), 0, [6, ...p1]) === d[13];
}

test('C1 — 50 CPFs gerados passam no validador independente', () => {
  for (let k = 0; k < 50; k++) {
    const c = cpf.gerarCpf();
    assert.ok(cpfValido(c), c);
    assert.ok(!/^(\d)\1+$/.test(c), c);
  }
});

test('C2 — 50 CNPJs gerados passam no validador independente', () => {
  for (let k = 0; k < 50; k++) assert.ok(cnpjValido(cpf.gerarCnpj()));
});

test('C3 — pontuação muda só a máscara', () => {
  const c = cpf.gerarCpf();
  const j = cpf.gerarCnpj();
  assert.match(cpf.formatar(c, true), /^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  assert.match(cpf.formatar(j, true), /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
  assert.equal(cpf.formatar(c, true).replace(/\D/g, ''), c);
  assert.equal(cpf.formatar(j, false), j);
});

test('C4 — validador: válido, DV errado e entradas inválidas', () => {
  assert.equal(cpf.validar('529.982.247-25').ok, true);
  assert.equal(cpf.validar('52998224725').ok, true);
  assert.equal(cpf.validar('11.444.777/0001-61').ok, true);
  const errado = cpf.validar('529.982.247-24');
  assert.equal(errado.ok, false);
  assert.match(errado.msg, /deveriam ser 25/);
  assert.equal(cpf.validar('111.111.111-11').ok, false);
  assert.equal(cpf.validar('').ok, false);
  assert.match(cpf.validar('123').msg, /3 dígito/);
  assert.match(cpf.validar('12.ABC.345/01DE-35').msg, /alfanumérico/);
});

test('Gerador: distribuição uniforme dos dígitos (5.000 CPFs)', () => {
  const contagem = Array(10).fill(0);
  for (let k = 0; k < 5000; k++) for (const d of cpf.gerarCpf().slice(0, 9)) contagem[d]++;
  for (const n of contagem) assert.ok(n / 45000 > 0.09 && n / 45000 < 0.11, contagem.join(','));
});

/* ---------- tool-diff ---------- */

function lcsReferencia(a, b) {
  const t = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  }
  return t[0][0];
}

/** Aplica um diff unificado (para conferir que o RF20 gera um patch correto). */
function aplicarPatch(original, patch) {
  const linhasPatch = patch.split('\n').slice(2, -1);
  const saida = [];
  let pos = 0;
  for (const l of linhasPatch) {
    const h = /^@@ -(\d+),(\d+) \+\d+,\d+ @@$/.exec(l);
    if (h) {
      const inicio = Number(h[2]) === 0 ? Number(h[1]) : Number(h[1]) - 1;
      while (pos < inicio) saida.push(original[pos++]);
    } else if (l[0] === ' ') {
      assert.equal(original[pos], l.slice(1));
      saida.push(original[pos++]);
    } else if (l[0] === '-') {
      assert.equal(original[pos], l.slice(1));
      pos++;
    } else if (l[0] === '+') saida.push(l.slice(1));
  }
  while (pos < original.length) saida.push(original[pos++]);
  return saida;
}

test('D1 — textos iguais: sem diferenças', () => {
  const t = diff.linhas('a\nb\nc');
  assert.ok(diff.diffLinhas(t, t).every((o) => o.tipo === '='));
  assert.equal(diff.diffUnificado(diff.diffLinhas(t, t)), '');
  assert.deepEqual(diff.linhas('a\r\nb\r\n'), diff.linhas('a\nb')); // quebras do Windows
});

test('D2/D3 — linha adicionada (+) e removida (−)', () => {
  const ops = diff.diffLinhas(['a', 'b', 'c'], ['a', 'x', 'b']);
  assert.deepEqual(ops.map((o) => o.tipo + o.texto), ['=a', '+x', '=b', '-c']);
});

test('D4 — mudança no meio de 500 linhas marca só a linha certa', () => {
  const a = Array.from({ length: 500 }, (_, i) => `linha ${i + 1}`);
  const b = a.slice();
  b[249] = 'linha 250 alterada';
  const t0 = performance.now();
  const ops = diff.diffLinhas(a, b);
  assert.ok(performance.now() - t0 < 50);
  assert.deepEqual(ops.filter((o) => o.tipo !== '=').map((o) => o.tipo + o.texto), ['-linha 250', '+linha 250 alterada']);
});

test('D5 — um dos lados vazio: tudo + ou tudo −', () => {
  assert.ok(diff.diffLinhas([], ['a', 'b']).every((o) => o.tipo === '+'));
  assert.ok(diff.diffLinhas(['a', 'b'], []).every((o) => o.tipo === '-'));
  assert.match(diff.diffUnificado(diff.diffLinhas([], ['a'])), /@@ -0,0 \+1,1 @@/);
});

test('Diff ótimo (LCS) e patch aplicável em 500 pares aleatórios', () => {
  const r = rng(11);
  const alfabeto = ['a', 'b', 'c', 'd', 'e', '', '  x'];
  for (let k = 0; k < 500; k++) {
    const gera = () => Array.from({ length: Math.floor(r() * 25) }, () => alfabeto[Math.floor(r() * alfabeto.length)]);
    const a = gera();
    const b = gera();
    const ops = diff.diffLinhas(a, b);
    assert.equal(ops.filter((o) => o.tipo === '=').length, lcsReferencia(a, b));
    assert.deepEqual(ops.filter((o) => o.tipo !== '+').map((o) => o.texto), a);
    assert.deepEqual(ops.filter((o) => o.tipo !== '-').map((o) => o.texto), b);
    assert.deepEqual(aplicarPatch(a, diff.diffUnificado(ops)), b);
  }
});

test('Diff acima do limite recusa em vez de travar', () => {
  const a = Array.from({ length: 4000 }, (_, i) => `a${i}`);
  const b = Array.from({ length: 4000 }, (_, i) => `b${i}`);
  assert.equal(diff.diffLinhas(a, b), null);
});
