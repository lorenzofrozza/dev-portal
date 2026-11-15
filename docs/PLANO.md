# Plano de desenvolvimento — .DEV

Metodologia: desenvolvimento incremental — uma ferramenta por ciclo, sempre com versão utilizável ao fim de cada ciclo. Datas ancoradas no cronograma aprovado na proposta (AP1) e apresentado no Seminário de Andamento (05/09).

## Ciclos

| Ciclo | Período alvo | Entrega | Critério de saída |
|---|---|---|---|
| 0 | ✅ pronto (este kit) | Casca + roteador + Service Worker + Tailwind + `tool-json` funcional | Portal abre, navega, instala e funciona offline |
| 1 | out/2026 (sem. 1–2) | `tool-json` completo (RF01–RF05) + repositório no GitHub + Pages no ar | Definição de pronto (REGRAS.md) |
| 2 | out/2026 (sem. 3–4) | `tool-cpf` (RF06–RF11) | DoD |
| 3 | nov/2026 (sem. 1–2) | `tool-regex` (RF12–RF16) | DoD |
| 4 | nov/2026 (sem. 2–3) | `tool-diff` (RF17–RF20) | DoD |
| 5 | nov/2026 (sem. 3–4) | **Validação** (protocolo completo do VALIDACAO.md): inspeção de rede documentada com capturas, teste offline multi-navegador, SUS com 3–5+ devs (meta ≥ 70) | Evidências coletadas e salvas em docs/validacao-resultados/ |
| 6 | dez/2026 | Artigo final + apresentação (as evidências dos ciclos viram as seções de resultados) | Entrega AP2 |

## Ordem dentro de cada ciclo (repetir)

1. Reler os RF da ferramenta em REQUISITOS.md.
2. Implementar o componente seguindo o padrão de `tool-json.js`.
3. Escrever/rodar os casos de teste do VALIDACAO.md (incluindo entradas inválidas).
4. Atualizar `sw.js` (ASSETS + VERSION) e rodar `npm run css`.
5. Verificar offline + Network limpo + mobile 360px.
6. Commit descritivo; push (Pages atualiza sozinho).
7. Registrar qualquer decisão não óbvia em DECISOES.md — vira material do artigo.

## Riscos e mitigações (do Seminário)

- **Safari/iOS impõe limites próprios a PWA** → testar cedo no Safari; o plano de testes cobre os principais navegadores.
- **Prazo × escopo** → escopo travado em 4 ferramentas; qualquer ideia nova vai para o backlog de REQUISITOS.md.
- **Provar a privacidade, não prometer** → a validação técnica é um ciclo próprio (5), não uma tarefa de última hora.
