# Bateria de testes — 15/11/2026

Versão testada: Service Worker `dev-v6` (as 4 ferramentas implementadas, RF02 concluído).
Ambiente: Chrome (motor Chromium) em macOS, portal servido em `http://localhost:8080`; Node 26 para os testes automatizados.

Duas camadas:
- **Automatizada** (`npm test`): lógica das ferramentas, sem interface. Reproduzível por qualquer pessoa.
- **Na interface**: o portal real no navegador, acionado pelos mesmos controles que o usuário usa.

Ainda faltam, a cargo do autor: capturas da aba Network no site publicado, teste offline em Firefox, Chrome Android e Safari iOS, instalação como PWA e o SUS.

## 1. Testes automatizados — 22 de 22 passaram

| Teste | Resultado |
|---|---|
| J1 — JSON compacto formatado com 2 espaços | ✅ |
| J2 — vírgula sobrando → inválido, linha 3 coluna 14 (na vírgula) | ✅ |
| J3 — aspas simples → inválido, mensagem sobre aspas duplas | ✅ |
| J5 — JSON de 1,0 MB validado e formatado | ✅ ~50 ms |
| J6 — acentos, emoji e escapes preservados | ✅ |
| Formatar não altera valores (inteiro de 20 dígitos, `1.0`, `1E5`, campo repetido) | ✅ |
| Formatar = `JSON.stringify` em 2.000 JSONs aleatórios, com espaços variados | ✅ |
| RF02 — localizador concorda com `JSON.parse` em 20.000 entradas mutadas | ✅ 0 discordâncias |
| RF02 — 26 erros comuns: linha, coluna e mensagem esperadas | ✅ |
| RF02 — JSON com 100.000 níveis de aninhamento não trava | ✅ |
| RF02 — trecho do erro com `^` alinhado, inclusive em linha de 300+ caracteres | ✅ |
| C1 — 50 CPFs passam em validador independente | ✅ 50/50 |
| C2 — 50 CNPJs passam em validador independente | ✅ 50/50 |
| C3 — pontuação muda só a máscara | ✅ |
| C4 — válido, DV errado (indica o correto), repetidos, vazio, curto, alfanumérico | ✅ |
| Distribuição dos dígitos em 5.000 CPFs (cada um entre 9% e 11%) | ✅ |
| D1 — textos iguais (inclusive `\r\n` × `\n`) | ✅ |
| D2/D3 — linha adicionada e removida | ✅ |
| D4 — mudança no meio de 500 linhas marca só a linha certa | ✅ < 1 ms |
| D5 — um lado vazio, cabeçalho `@@ -0,0 +1,1 @@` | ✅ |
| Diff ótimo (igual a LCS de referência) e patch aplicável em 500 pares aleatórios | ✅ |
| Diff acima do limite recusa em vez de travar | ✅ |

## 2. Testes na interface

### tool-json
| Caso | Obtido | |
|---|---|---|
| J1 | saída com 2 espaços, "✓ JSON válido", botão Copiar visível | ✅ |
| J2 | "✗ JSON inválido — linha 3, coluna 14: vírgula sobrando antes de '}'" + trecho com `^` | ✅ |
| J3 | "linha 1, coluna 2: nome de campo com aspas simples — o JSON exige aspas duplas" | ✅ |
| J4 | "Cole um JSON na entrada para começar.", sem erro no console | ✅ |
| J5 | 1.055 KB → 90.002 linhas formatadas em 655 ms (incluindo desenhar na tela) | ✅ |
| J6 | "Torres – RS", "🚀✨" e `é` preservados | ✅ |
| Extra | inteiro `12345678901234567890` preservado (antes virava `12345678901234567000`) | ✅ |
| Extra | "Mostrar na entrada" seleciona o caractere do erro no campo | ✅ |
| Extra | HTML colado (`<img onerror>`) aparece como texto e não executa | ✅ |

### tool-cpf
| Caso | Obtido | |
|---|---|---|
| C1 | 50/50 CPFs gerados pela interface válidos | ✅ |
| C2 | 50/50 CNPJs válidos | ✅ |
| C3 | `38.607.175/0001-34` → `38607175000134`, mesmos dígitos | ✅ |
| C4 | válido → "✓ CPF válido"; DV errado → "deveriam ser 25 (529.982.247-25)" | ✅ |
| C5 | histórico parou em 10 após 100 gerações; zerou ao recarregar; `localStorage` e `sessionStorage` vazios | ✅ |

### tool-regex
| Caso | Obtido | |
|---|---|---|
| R1 | `\d+` em "a1 b22" → 2 ocorrências destacadas ("1", "22") | ✅ |
| R2 | "abc" em "ABC abc": sem `i` 1 ocorrência, com `i` 2 | ✅ |
| R3 | `(` → "Padrão inválido — há um "(" sem o ")" correspondente" | ✅ |
| R4 | `(\w+)@(\w+)` → tabela com ana/ulbra e bob/site por ocorrência | ✅ |
| R5 | `(a+)+$` → "passou de 2 s e foi interrompida"; interface respondeu 30 de 30 vezes em 3 s; busca seguinte funcionou | ✅ |
| Extra | HTML no texto de teste não executa | ✅ |

### tool-diff
| Caso | Obtido | |
|---|---|---|
| D1 | "✓ Sem diferenças — os textos são iguais." | ✅ |
| D2 | "+1 / −0 linha · 2 iguais", linha marcada com + | ✅ |
| D3 | "+0 / −1 linha · 2 iguais", linha marcada com − | ✅ |
| D4 | "+1 / −1 linhas · 499 iguais", só a linha 250 marcada, 246 e 247 linhas iguais recolhidas | ✅ |
| D5 | "+2 / −0" e "+0 / −2", sem erro | ✅ |

## 3. Privacidade e offline

| Verificação | Obtido | |
|---|---|---|
| RNF01 — requisições durante o uso das 4 ferramentas | só os próprios arquivos do portal (carregamento do componente ao abrir cada ferramenta) e o `blob:` local do worker de regex; nenhuma a outro endereço, nenhuma com conteúdo digitado | ✅ |
| RNF01 — código-fonte | nenhum `fetch` com dado do usuário, `XMLHttpRequest`, `sendBeacon`, WebSocket, `EventSource` ou `<form>`; o único `fetch` é o do Service Worker repassando arquivos do portal | ✅ |
| RNF02 — offline | servidor **desligado**, página recarregada: as 4 ferramentas funcionaram (gerar CPF, validar JSON, regex, diff) | ✅ |
| RNF03 — terceiros | nenhuma URL externa nos arquivos servidos (a única é o comentário de licença do Tailwind dentro do CSS, que não gera requisição) | ✅ |
| RNF07 — casca leve | 24 KB sem imagens (CSS: 4 KB com gzip); cada ferramenta 13–19 KB, carregada só quando aberta | ✅ |
| Console | nenhum erro durante toda a bateria | ✅ |

## 4. Responsividade e teclado (RNF05, RNF06)

| Verificação | Obtido | |
|---|---|---|
| 360 px | nenhuma das 4 ferramentas rola para o lado (inclusive com a mensagem de erro do JSON) | ✅ |
| Rótulos | todos os campos (`input`, `textarea`) das 4 ferramentas têm `label` | ✅ |
| Botões | todos os controles clicáveis são `<button>` | ✅ |
| Teclado | Tab chega a "Mostrar na entrada" com contorno de 2 px visível; Enter seleciona o erro no campo | ✅ |

| Contraste | "Em breve" da barra lateral estava em ~2,5:1 (abaixo de AA); corrigido para a cor `muted` (~5,4:1) | ✅ |

## Pendências conhecidas (não bloqueiam)
- Safari/iOS não testado neste ambiente.
