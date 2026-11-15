# Requisitos — .DEV

Derivados do levantamento (questionário N=24, análise documental LGPD/OWASP e estudo dos correlatos 4Devs, DevToys e IT-Tools). Diagrama de caso de uso: `docs/assets/diagrama_caso_de_uso.png`.

## Requisitos não funcionais (valem para o portal inteiro)

| ID | Requisito | Verificação |
|---|---|---|
| RNF01 | **Nenhum dado inserido pelo usuário é transmitido pela rede** | Aba Network limpa durante o uso (protocolo em VALIDACAO.md) |
| RNF02 | Operação 100% offline após o primeiro acesso | DevTools → Offline → recarregar e usar todas as ferramentas |
| RNF03 | Nenhum recurso de terceiros em runtime (CDN, fontes, analytics) | Inspeção do HTML/Network; tudo servido do próprio origin |
| RNF04 | Instalável como PWA (manifest + Service Worker) | Prompt de instalação no Chrome; abre em janela própria |
| RNF05 | Responsivo a partir de 360px de largura | Teste visual nos breakpoints 360/768/1280 |
| RNF06 | Acessibilidade básica: contraste AA, foco visível, campos com label | Teclado + inspeção |
| RNF07 | Carga inicial leve (casca < ~100 KB sem imagens) | DevTools → Network size |

## RF por ferramenta

### Ciclo 1 — Formatador/Validador JSON (`tool-json`)
- RF01: Formatar JSON com indentação de 2 espaços.
- RF02: Validar e, em caso de erro, apontar **linha e coluna** aproximadas + trecho do problema.
- RF03: Minificar (remover espaços).
- RF04: Copiar a saída com um clique.
- RF05: Indicador visual de válido/inválido.

### Ciclo 2 — Gerador de dados de teste CPF/CNPJ (`tool-cpf`)
- RF06: Gerar CPF válido por algoritmo de dígitos verificadores.
- RF07: Gerar CNPJ válido por algoritmo de dígitos verificadores.
- RF08: Opção com/sem pontuação.
- RF09: Copiar com um clique; histórico da sessão (em memória, máx. 10 itens).
- RF10: Aviso permanente "fictício — para testes e homologação".
- RF11: Validar um CPF/CNPJ digitado (conferir DV) — modo inverso do gerador.

### Ciclo 3 — Testador de Regex (`tool-regex`)
- RF12: Campo de padrão com flags (g, i, m, s, u).
- RF13: Destacar todas as ocorrências no texto de teste.
- RF14: Listar grupos de captura por ocorrência.
- RF15: Mensagem clara em padrão inválido (sem quebrar a tela).
- RF16: Contador de ocorrências.

### Ciclo 4 — Diff de textos/código (`tool-diff`)
- RF17: Comparar dois textos lado a lado (ou empilhado no mobile).
- RF18: Destacar linhas adicionadas/removidas (diff por linha, LCS).
- RF19: Resumo (+N / −N linhas).
- RF20: Copiar o resultado em formato diff unificado.

## Backlog (trabalhos futuros — NÃO implementar antes dos ciclos 1–4)
Codificador/Decodificador Base64 · Gerador de Hash (SHA-256 via WebCrypto) · Conversor JSON↔CSV · Gerador de UUID · Conversor de timestamp · Decodificador de JWT (local) · Suporte ao CNPJ alfanumérico (novo formato da Receita, 2026).
Critério de admissão ao backlog: a ferramenta não pode depender de rede por natureza.
