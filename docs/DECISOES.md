# Registro de decisões técnicas

Formato: data — decisão — alternativas consideradas — motivo. Este arquivo alimenta o artigo final (seção de desenvolvimento). Registrar aqui toda escolha não óbvia feita durante os ciclos.

- 2026-10-02 — **Tailwind v4 compilado no build** em vez de CSS puro com tokens — alternativas: CSS puro (zero dependências), Tailwind via CDN (descartado: viola a regra de runtime sem terceiros) — motivo: velocidade de desenvolvimento nos ciclos; a dependência é só de build (devDependency), o artefato final continua estático e auto-hospedado.
- 2026-10-02 — **Light DOM nos custom elements** — alternativa: Shadow DOM com CSS próprio por componente — motivo: classes utilitárias do Tailwind não atravessam shadow root; o encapsulamento visual não é requisito e o isolamento lógico se mantém por convenção (um arquivo por componente).
- 2026-10-02 — **Hash routing** — alternativa: History API — motivo: funciona no GitHub Pages e offline sem configuração de fallback de rotas no servidor.
- 2026-10-02 — **Fontes do sistema** (`system-ui`) — alternativa: fonte própria auto-hospedada — motivo: zero requisições extras e carga menor; revisar no ciclo 5 se a identidade visual pedir fonte própria.
