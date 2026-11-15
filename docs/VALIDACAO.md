# Validação — .DEV

Três frentes, conforme a proposta: verificação técnica de privacidade, verificação funcional e avaliação de usabilidade. As evidências coletadas aqui são as seções de resultados do artigo final.

## 1. Verificação técnica de privacidade (RNF01–RNF03)

**Protocolo de inspeção de rede** (repetir por ferramenta, documentar com captura de tela):
1. Abrir o portal, DevTools → aba Network, marcar "Preserve log", limpar.
2. Usar a ferramenta com dados marcadores fáceis de rastrear (ex.: colar um JSON contendo `"MARCADOR_PRIVACIDADE_123"`).
3. Conferir que **nenhuma requisição** ocorreu durante o uso — e, no primeiro acesso, que as únicas requisições são dos arquivos estáticos do próprio origin (filtrar por domínio).
4. Buscar o marcador no log de rede (Ctrl+F na aba Network) → zero ocorrências.
5. Capturar a tela da aba Network vazia/limpa como evidência.

**Protocolo offline:**
1. Acessar o portal uma vez online; fechar a aba.
2. DevTools → Network → Offline (ou modo avião real).
3. Reabrir o portal pela URL, navegar pelas 4 ferramentas e usá-las.
4. Critério: tudo funciona; evidência em captura/vídeo curto.
5. Repetir em: Chrome desktop, Firefox desktop, Chrome Android, Safari iOS (anotar limitações do Safari, se houver).

**Instalabilidade (RNF04):** instalar via prompt do Chrome; abrir a janela instalada offline.

## 2. Verificação funcional — casos de teste por ferramenta

### tool-json
| Caso | Entrada | Esperado |
|---|---|---|
| J1 | JSON válido compacto | formatado com 2 espaços |
| J2 | JSON com vírgula sobrando | inválido + linha/coluna apontadas |
| J3 | aspas simples | inválido (JSON exige aspas duplas) |
| J4 | vazio | mensagem amigável, sem erro no console |
| J5 | JSON de ~1 MB | formata sem travar a aba |
| J6 | unicode/acentos/emoji | preservados na saída |

### tool-cpf
| Caso | Esperado |
|---|---|
| C1 | 50 CPFs gerados seguidos → todos passam no validador de DV independente |
| C2 | 50 CNPJs idem |
| C3 | alternar pontuação muda só a máscara |
| C4 | validar CPF digitado válido → "válido"; com DV errado → "inválido" |
| C5 | histórico não ultrapassa 10 itens e zera ao recarregar (sessão) |

### tool-regex
| Caso | Entrada | Esperado |
|---|---|---|
| R1 | `\d+` sobre "a1 b22" | 2 ocorrências destacadas |
| R2 | flag `i` | muda o resultado conforme esperado |
| R3 | `(` sozinho | mensagem de padrão inválido, tela íntegra |
| R4 | grupos `(\w+)@(\w+)` | grupos listados por ocorrência |
| R5 | padrão catastrófico em texto grande | interface segue responsiva (limitar texto ou avisar) |

### tool-diff
| Caso | Esperado |
|---|---|
| D1 | textos iguais → "sem diferenças" |
| D2 | linha adicionada → marcada como + |
| D3 | linha removida → marcada como − |
| D4 | mudança no meio de arquivo de 500 linhas → só as linhas certas marcadas |
| D5 | um dos lados vazio → tudo +/− sem erro |

## 3. Avaliação de usabilidade — SUS

- Participantes: 3–5+ desenvolvedores/QA (reaproveitar respondentes da pesquisa de setembro).
- Tarefas dirigidas: (1) formatar um JSON inválido e corrigi-lo; (2) gerar e copiar um CNPJ sem pontuação; (3) testar uma regex com grupo; (4) comparar duas versões de um trecho de código; (5) instalar o portal e repetir a tarefa 1 offline.
- Ao final, aplicar o **SUS** (10 itens, escala 1–5, alternando itens positivos/negativos — usar a tradução pt-BR padrão). Cálculo: itens ímpares (nota−1), itens pares (5−nota), somar e ×2,5.
- **Meta: escore médio ≥ 70** (acima da média de referência de 68).
- Registrar também observações qualitativas (onde travaram, o que elogiaram).

## Onde guardar evidências
`docs/validacao-resultados/` — capturas da aba Network, vídeo/gif do offline, planilha dos casos de teste com pass/fail, respostas SUS e cálculo.
