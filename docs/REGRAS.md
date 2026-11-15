# Regras do projeto — .DEV

A tese do TCC depende destas regras: se o portal funciona sem internet, é porque nada depende de enviar dados para fora.

## Regras invioláveis

1. **Nenhum dado do usuário em requisição de rede. Nunca.** Nenhum `fetch`, `XMLHttpRequest`, `sendBeacon`, WebSocket ou form submit carregando conteúdo digitado pelo usuário. As únicas requisições permitidas são as do Service Worker buscando os arquivos estáticos do próprio portal.
2. **Nenhum recurso de terceiros em runtime.** Proibido CDN (Tailwind CDN, jsDelivr, unpkg…), Google Fonts, analytics, pixels. Tudo auto-hospedado. Fontes: pilha do sistema (`system-ui`). O Tailwind entra **compilado no build** (`npm run css`), nunca via CDN.
3. **Offline-first.** Todo arquivo novo do portal deve ser adicionado à lista `ASSETS` do `sw.js` e a constante `VERSION` incrementada — senão a funcionalidade quebra offline.
4. **Caminhos relativos em tudo** (`./…`), porque o deploy é no GitHub Pages sob `/nome-do-repo/`. Nada de caminhos absolutos começando com `/`.
5. **Dados do usuário ficam no dispositivo.** Conteúdo processado vive em memória. Histórico de ferramenta (ex.: CPFs gerados) é por sessão, em memória. `localStorage` apenas para preferências de interface (tema, opções), nunca para conteúdo colado pelo usuário.
6. **Dados gerados são fictícios.** CPF/CNPJ saem de algoritmo de dígito verificador e toda tela de geração exibe o aviso "fictício — para testes e homologação".

## Definição de pronto

Cada ferramenta só está pronta quando:

1. Passa nos casos de teste do `VALIDACAO.md` (incluindo entradas inválidas).
2. A aba Network do DevTools mostra **zero requisições** durante o uso (protocolo no `VALIDACAO.md`).
3. Funciona offline (DevTools → Network → Offline → recarregar e usar).
4. É usável a 360px de largura e com teclado (foco visível, `label` nos campos).
5. `sw.js` está atualizado (ASSETS + VERSION) e `npm run css` foi rodado.
6. A interface está em pt-BR, com a nota de privacidade no rodapé da ferramenta ("Processado localmente — nada saiu do seu navegador").

## Convenções

- Commits pequenos e descritivos em pt-BR, um assunto por commit (ex.: `feat: valida JSON apontando linha e coluna do erro`).
- JavaScript moderno (ES2022+), sem transpilação; só APIs suportadas nos navegadores atuais. Atenção às particularidades do Safari/iOS em PWA (limites de cache).
- Nenhuma dependência de runtime. Dependências de build (devDependencies) limitadas ao Tailwind.
- Acessibilidade mínima: contraste AA sobre os tokens existentes, `:focus-visible` visível, botões como `<button>`.
- Escopo fechado em 4 ferramentas; ideias extras vão para o backlog do `REQUISITOS.md`.
- Toda escolha técnica não óbvia é registrada em `DECISOES.md` (vira material do artigo).
