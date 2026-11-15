# Arquitetura — .DEV

Diagrama: `docs/assets/figura1_arquitetura.png` (o mesmo apresentado na proposta e no Seminário de Andamento).

## Visão geral

O servidor (GitHub Pages) tem um único papel: entregar os arquivos estáticos da aplicação no primeiro acesso. A partir daí:

1. O **Service Worker** (`sw.js`) intercepta todas as requisições e responde do **cache local** (estratégia cache-first com lista explícita `ASSETS` e versionamento manual `VERSION`). O portal passa a operar sem rede.
2. A **casca** (`index.html` + `src/js/app.js`) renderiza a sidebar a partir do registro `TOOLS` e resolve a rota por hash (`#/json` …).
3. Cada **ferramenta** é um custom element em light DOM (`src/js/components/tool-<id>.js`), carregado por `import()` dinâmico na primeira abertura — o estilo micro-frontend defendido no TCC: componentes isolados, adicionar um não toca nos outros.
4. Os **dados do usuário** são processados em memória pelo próprio componente (JSON.parse, aritmética de DV, RegExp, LCS). Não existe caminho de rede para eles — é a seta cortada do diagrama.

## Decisões registradas (defendidas no artigo)

| Decisão | Motivo |
|---|---|
| Sem framework JS | Menos dependências; auditabilidade total do que sai pela rede; Web Components são padrão nativo |
| Light DOM (sem Shadow DOM) | Compatibilidade direta com as classes utilitárias do Tailwind; encapsulamento visual não é crítico aqui |
| Tailwind compilado no build | Velocidade de desenvolvimento sem violar a regra "nada de CDN em runtime" |
| Hash routing (não History API) | Zero configuração de servidor; funciona em GitHub Pages e offline sem fallback de rotas |
| Cache-first com lista explícita | Comportamento offline determinístico e auditável; a lista ASSETS documenta exatamente o que o portal é |
| Fontes do sistema | Nenhuma requisição a Google Fonts; carga menor |
| Histórico por sessão em memória | Coerência com a tese: nem no armazenamento local persiste conteúdo gerado sem necessidade |

## Estrutura de pastas

```
dev-portal/
├── index.html              ← casca (topbar, sidebar, área da ferramenta)
├── sw.js                   ← Service Worker (ASSETS + VERSION)
├── manifest.webmanifest    ← manifest PWA
├── package.json            ← scripts: css, watch, serve, test (única devDependency: Tailwind)
├── assets/
│   ├── styles.css          ← GERADO por `npm run css` — não editar à mão
│   └── icon-*.png          ← ícones PWA
├── src/
│   ├── styles/main.css     ← entrada do Tailwind + tokens @theme
│   └── js/
│       ├── app.js          ← registro TOOLS, roteador, sidebar, registro do SW
│       └── components/
│           ├── tool-json.js   ← ciclo 1 (padrão de referência)
│           ├── tool-cpf.js    ← ciclo 2
│           ├── tool-regex.js  ← ciclo 3
│           └── tool-diff.js   ← ciclo 4
├── tests/                  ← testes automatizados da lógica (`npm test`, node:test, sem dependências)
└── docs/                   ← requisitos, plano, validação, decisões, assets do TCC
```

## Ao adicionar uma ferramenta nova (ou qualquer arquivo)

1. Criar `src/js/components/tool-<id>.js` definindo o custom element `tool-<id>`.
2. Adicionar a entrada no array `TOOLS` de `app.js`.
3. **Adicionar o arquivo em `ASSETS` no `sw.js` e incrementar `VERSION`** — sem isso quebra offline.
4. `npm run css` (o Tailwind escaneia os fontes e gera as classes novas).
5. Conferir a definição de pronto do `docs/REGRAS.md`.
