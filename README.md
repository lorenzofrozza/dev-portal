# .DEV — Portal de Ferramentas para Desenvolvedores

Ferramentas do dia a dia de desenvolvimento (JSON, CPF/CNPJ de teste, regex, diff) com **processamento 100% no navegador**: nenhum dado inserido é transmitido pela rede, e o portal funciona offline após o primeiro acesso.

**Acesse:** https://lorenzofrozza.github.io/dev-portal/

Projeto de Desenvolvimento de Software — Análise e Desenvolvimento de Sistemas, ULBRA Torres, 2026/2.

> Regras do projeto em `docs/REGRAS.md`. Documentação em `docs/` (requisitos, arquitetura, plano de ciclos, protocolo de validação).

## Rodar localmente

```bash
npm install        # uma vez (só devDependencies: Tailwind)
npm run css        # compila src/styles/main.css → assets/styles.css
npm run serve      # http://localhost:8080  (o Service Worker exige http://, não file://)
npm test           # testes automatizados da lógica das ferramentas (Node 20+)
```

Durante o desenvolvimento: `npm run watch` em um terminal e `npm run serve` em outro.

## Testar o offline (a prova da tese)

1. Abra http://localhost:8080 uma vez e aguarde o selo **"Offline pronto"**.
2. DevTools → Network → **Offline** (ou modo avião).
3. Recarregue e use as ferramentas — tudo deve funcionar.

## Deploy — GitHub Pages

1. Crie o repositório e envie o código (inclua `assets/styles.css` compilado).
2. Settings → Pages → Source: branch `main`, pasta `/ (root)`.
3. Pronto: HTTPS automático (requisito do Service Worker) e todos os caminhos do projeto são relativos, então funciona sob `/nome-do-repo/`.

## Estrutura

Ver `docs/ARQUITETURA.md`. Resumo: casca (`index.html` + `src/js/app.js`), uma ferramenta por arquivo em `src/js/components/`, Service Worker cache-first (`sw.js`), Tailwind v4 compilado no build.
