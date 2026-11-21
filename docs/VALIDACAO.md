# Validação

Como validar uma alteração: comandos locais, o que a CI cobre, e smoke tests manuais agrupados
**por área** (não por versão). Histórico de versões fica no [`CHANGELOG.md`](../CHANGELOG.md).

## 1. Comandos locais

A CI (`.github/workflows/validate-json.yml`) executa tudo abaixo, exceto `git diff --check`, que é
uma checagem local adicional. Rode todos antes de abrir um PR.

```bash
python .github/scripts/validate-content.py                              # 1. conteúdo, arquitetura, SEO, CSP, referências
find js -type f -name '*.js' -print0 | xargs -0 -r -n1 node --check     # 2. sintaxe do frontend
node --check workers.js                                                  # 2. sintaxe do Worker
node --check .github/scripts/sync-jogos.mjs                              # 2. sintaxe dos syncs
node --check .github/scripts/sync-agenda.mjs
node --check .github/scripts/agenda-week.mjs
node --test .github/tests/*.test.mjs                                     # 3. testes automatizados
git diff --check                                                         # 4. (local) espaços em branco finais
```

Resultado esperado do validador: `Validação concluída: 0 erros, 0 aviso(s).` A CI também **rejeita
`__pycache__`/`*.pyc`/`*.pyo` versionados**.

Os workflows de sync (Agenda e Jogos) repetem o validador e as checagens de sintaxe antes de
qualquer commit.

## 2. O que a CI cobre

### Quando roda

Em `push` (`main`, `site-v2`) e `pull_request` que toquem qualquer arquivo relevante: `data/**`,
`**/*.html`, `assets/**`, `css/**`, `js/**`, `workers.js`, `robots.txt`, `sitemap.xml`, `CNAME`,
`_headers`, a documentação (`README.md`, `AGENTS.md`, `DESIGN-SYSTEM.md`, `CHANGELOG.md`, `docs/**`),
validador, testes, scripts e workflows. Validações da mesma ref cancelam execuções obsoletas.

### Validador estrutural (`validate-content.py`)

- JSON editorial válido, sem chaves duplicadas, com schemas e allowlists (Navbar, Home, Redes,
  Artes, Lives, Agenda, Jogos, Blog, Doações, `interface.json` e fallbacks espelhados);
- arquivos obrigatórios presentes (inclui a documentação de `docs/`) e **nenhum arquivo extra em
  `docs/`** além dos permitidos; resíduos de saneamento proibidos ausentes;
- toda página HTML: CSP mínima com hashes de blocos inline recalculados, sem `style=`/`on*=`,
  `sanitize.js` antes de `footer.js`, preload de scripts, referências locais resolvidas a partir do
  diretório real do documento, SEO básico (canonical, Open Graph, JSON-LD);
- `sitemap.xml`/`robots.txt`/meta robots coerentes com o conteúdo: Home, Agenda, Jogos, Doações,
  Privacidade e Uso de IA sempre `index, follow`; Galeria e Blog só indexáveis e listados quando há
  conteúdo público;
- invariantes do Worker (comparação timing-safe, segredos mínimos, semântica de identidade do ranking
  etc.), da Navbar mobile, do modo leitura, das Configurações e da governança de privacidade.

### Testes automatizados (`.github/tests/*.test.mjs`)

`node:test` puro, sem pacotes. Um novo `*.test.mjs` é descoberto automaticamente.

| Arquivo | Cobre |
| --- | --- |
| `worker-ranking` | virada mensal em `America/Sao_Paulo`, parsing de `created_at`, Top 5, anonimização, deduplicação por último ID, `ledger:v1` (migração, prioridade, falha fechada, reparo de espelhos), paginação |
| `worker-robustness` | `500` JSON com CORS, `Vary: Origin`, limite de 50 páginas, expiração dos VODs (21 h público, 24 h vencido) |
| `worker-auth` | `/debug/*` só com Bearer, `?key=` só em `/oauth/authorize`, token administrativo < 32 caracteres falha fechado |
| `api-client` | fallback `workers.dev` só em falha de transporte/timeout, timeout durante `response.json()` |
| `frontend-safety-retention` | `safeHttpUrl`, validação de `href` (Créditos/Steam/Twitch), TTL de 30 min do cache do ranking |
| `agenda-week` | decisão da semana publicada pela Agenda (fuso de São Paulo, `Semana:`/`Data:`) |
| `agenda-page` | modelo da `/agenda/` (sete dias, contrato inválido falha, período da semana, artes) |
| `agenda-today` | destaque do dia atual e rolagem inicial na Home; tema da página `/agenda/` |
| `steam-client` | User-Agent, intervalo mínimo, repetição, disjuntor (429/403/falhas) |
| `loader-failsafe` | bootstrap idêntico + hash CSP, fail-safe de 6 s |
| `reading-mode` | `reading.css` por último, bootstrap, contraste AA/AAA, preferências, atalhos |
| `settings-placement` | engrenagem na barra, painel em `<body>`, integração com overlays mobile |
| `color-contrast` | tokens de ação WCAG AA, uso semântico de `--primary-text`/`--button-*` |
| `accessibility-semantics` | skip links, alvos focáveis, anúncios de resultados |
| `favicon` | favicon adaptativo, fallback, CSP de imagem |
| `script-preload` | preloads em sincronia com os scripts de cada página |
| `workflow-hardening` | timeouts, `checkout` por SHA, concorrência, permissões |

## 3. Limites da validação estática

A CI **não prova** a disponibilidade do Cloudflare Worker, Streamlabs, Twitch, Trello, Steam ou KV, nem o
comportamento temporal real (janelas de 10 min/20 h/24 h) nem a aparência em navegadores reais. Esses
pontos exigem os smoke tests abaixo. A Home deve continuar funcionando mesmo que todos os endpoints da
API estejam indisponíveis.

## 4. Smoke tests manuais

Em cada item, repita em tema claro/escuro, com blur ligado/desligado e em viewport desktop (≥ 1440 px),
tablet (~760 px) e móvel (~390 px) quando a área for visual.

### 4.1 Sempre (qualquer alteração de frontend)

1. o console não mostra violação de CSP nas páginas públicas;
2. Navbar e Footer compartilhados aparecem e o item da página atual está ativo;
3. o loader aparece e some sem travar; a página funciona com a API fora do ar;
4. não há scroll horizontal indesejado nem loop contínuo de mutações no console.

### 4.2 Loader e reveal

1. o loader translúcido usa os tokens do site (`--card-bg`, `--blur-card`); com `data-blur="off"` não há
   `backdrop-filter`;
2. o reveal da página **sobrepõe** o fim da saída do loader e o fundo decorativo **não** segura o
   conteúdo (o loader não espera a decodificação da arte de fundo);
3. abrir `/#creditos`, `/#agenda` e `/#regras` em nova navegação chega à seção correta depois do reveal;
4. se `loader.js` não rodar, o fail-safe libera a interface após 6 s;
5. blur desligado, Save-Data e performance reduzida não antecipam o fundo.

Limitação aceita: em alguns navegadores pode haver um curto intervalo até a composição final do blur
dos painéis depois do reveal.

### 4.3 Navbar e Home

1. editar texto, ícone e URL de um item interno em `navbar.json` e confirmar a atualização sem mexer em
   HTML; um item externo (por exemplo **Jogos**) abre em nova aba com o aviso global de link externo;
2. `ordem`: reordenar e confirmar a nova ordem visual; **Apoiar** continua com o estilo primário;
3. `apoioFixoNoFim`: com `true`, mover `apoio` para o meio de `ordem` e confirmar que o CTA continua
   por último à direita; com `false`, ele ocupa a posição declarada; sem a chave, o fallback mantém
   Apoiar no fim; valor não booleano deve ser rejeitado pelo validador;
4. bloquear `navbar.json` e `data/blog/config.json` e confirmar que os fallbacks mantêm a mesma ordem e
   os mesmos textos (Jogos → `/jogos/`; busca do Blog "Buscar publicações...");
5. links `/#lives`, `/#agenda`, `/#regras`, `/#creditos` mantêm a navegação suave da Home;
6. **Cards da Home** (`home-cards.json`): reordenar Hero/Lives/Agenda e conferir ordem visual/DOM sem
   quebrar IDs ou scrollspy; ocultar e reexibir um nativo; alternar `grande`/`compacto` (duas colunas no
   desktop, uma no mobile); testar `padrao`/`suave`/`destaque`; criar card `personalizado` com e sem CTA
   (CTA externo abre nova aba com `noopener noreferrer`); o validador deve rejeitar ID duplicado, tipo
   nativo ausente/duplicado, ícone inválido, URL `//host`, HTML/SVG bruto e mais de 24 cards;
7. com `posts.json` vazio e o card `blog` visível, a Home mostra o estado vazio;
8. Home: o card do dia atual na Agenda é destacado e o carrossel rola até ele só na abertura.

### 4.4 Navegação mobile (≤ 767 px)

1. topo `Logo | título atual | Apoiar` (com `apoioFixoNoFim: true`); `Menu` flutuante à esquerda e
   `@ Redes` à direita, respeitando safe area, sem scroll horizontal da Navbar;
2. o título troca com animação vertical ao mudar de seção/página (sem animação com movimento reduzido);
3. **Menu** abre um drawer pela esquerda, abaixo da Navbar, com links agrupados no topo sem borda individual,
   item atual destacado, `Apoiar` fixo no rodapé e **sem cabeçalho/×**; a lista rola sem mover `Apoiar`; o
   scroll da página fica bloqueado enquanto aberto; `Tab` fica dentro do drawer;
4. fecha por swipe à esquerda, toque no backdrop, `Escape` e Voltar do navegador/Android; depois de fechar,
   Voltar volta ao comportamento normal (sem etapa fantasma); swipe a partir da borda esquerda abre;
   movimento predominantemente vertical mantém o scroll da lista;
5. Menu, Redes e Configurações são mutuamente exclusivos: tocar em um troca diretamente; Voltar fecha a
   camada ativa primeiro; `Escape` devolve o foco ao gatilho; toque fora fecha Redes e o backdrop fecha Menu;
6. Redes: popup compacto; aberto mantém fundo legível com `@` rosa; um swipe vertical fora dele fecha e o
   scroll continua; sem hover preso no Android/Brave;
7. Redes começa fechado na Home inclusive após reload/retorno pelo histórico; trocar o hash na Home não
   remove o estado enquanto um overlay está ativo;
8. com teclado virtual aberto em um input, os gatilhos somem e voltam ao fechar;
9. durante o loader e as transições de página, Menu, drawer, backdrop e faixa de swipe não aparecem nem
   recebem toque;
10. com `apoioFixoNoFim: false`, Apoiar entra no Menu na posição de `ordem`;
11. acima de 767 px a Navbar tradicional e o dock social de desktop permanecem inalterados.

### 4.5 Configurações e modo leitura

1. a engrenagem fica na barra, antes de Apoiar; o preenchimento significa só "painel aberto";
2. o painel é opaco, abre alinhado à borda direita (centralizado no celular) e fecha por Esc, clique fora e ×;
3. ligar o modo leitura: superfícies opacas, sem blur e sem arte de fundo, links sublinhados, texto no
   tamanho escolhido; o blur manual volta ao desligar a leitura e as opções de blur ficam desabilitadas
   enquanto ela está ligada;
4. a preferência persiste entre páginas sem flash e nunca liga sozinha.

### 4.6 Galeria de Artes e Blog

1. `/artes/`: masonry com imagens verticais/horizontais sem corte; logo pulsante enquanto uma imagem carrega;
   erro de uma imagem não bloqueia as demais; a grade mostra só título e artista; o dialog mostra categoria,
   data, tags e crédito sem baixar a imagem full antes de abrir; funciona com Worker/API indisponíveis;
2. **Buscar em**: selecionar `Artista` e pesquisar um nome que também apareça em título/tag considera só o
   artista; prefixos `artista:`, `titulo:`, `categoria:`, `tag:` têm precedência; no Blog, `Título`, `Resumo`,
   `Tags` e `titulo:`, `resumo:`, `tag:`; a busca ignora maiúsculas e acentos;
3. drop-down: aparência coerente nos temas, teclado (`ArrowUp`/`ArrowDown`, `Home`/`End`, `Enter`/`Space`,
   `Escape`, `Tab`), clique externo, `aria-expanded`/`aria-selected` corretos, menu acima da grade/lista e sem
   corte pelo painel;
4. com blur ligado o listbox aberto é movido para `document.body` e o fundo atrás dele fica desfocado, inclusive
   fora do painel; rolar/redimensionar mantém a ancoragem; ao fechar o **mesmo nó** volta ao wrapper; com blur
   desligado não há `backdrop-filter`, com fundo reforçado por `--card-bg`;
5. blur do painel de busca contínuo até a borda externa de 2 px, sem faixa nítida no contorno e sem recuo
   entre fundo e borda;
6. Blog (com ao menos um post publicado): tags/filtros à esquerda e busca à direita no desktop (tags acima no
   mobile), dentro de um único painel `glass-panel` equivalente ao da Galeria; título (`h1`) em
   `--primary-color`; mesma altura, radius, bordas e foco que a Galeria;
7. nenhuma dessas verificações exige alterar `data/content/` ou `data/blog/`.

### 4.7 Agenda e Jogos

1. `node --test .github/tests/agenda-week.test.mjs`; num quadro de teste com `Semana:` passada, rodar *Sync
   agenda from Trello* e confirmar no resumo a semana atual, o aviso "já passou" e `dias[0].data` igual ao
   domingo desta semana; `Semana: automática` e uma `Semana:` futura (publicada sem aviso); `Data:` no dia errado
   deve **falhar** o sync sem alterar `data/agenda.json`;
2. os três disparos de `sync-agenda.yml` existem (manual, `29 9,21 * * *`, `10 3 * * 0`); dois syncs
   disparados juntos serializam pelo grupo `editorial-sync-*`, com rebase e sem force push;
3. na Agenda da Home: com uma live curta, uma live com descrição longa e duas lives no mesmo dia, só o conteúdo
   que excede 210 px recebe foco/scroll vertical por teclado, e redimensionar recalcula;
4. `/jogos/` com `jogosPorPagina: 15`: no máximo 15 cards por página no filtro **Todos**; trocar para `3` numa
   cópia de teste altera a paginação sem mexer em `jogos.js` nem no sync; sem `jogos-config.json` o fallback é 15;
   busca e troca de categoria voltam à página 1; `0` ou valor não inteiro é rejeitado pelo validador;
5. a CI executa `node --check` em `sync-jogos.mjs` e `sync-agenda.mjs`.

### 4.8 Doações, ranking e privacidade

1. `/privacidade/` mostra **Kamyli Souza** e `contato@kamylisumire.com`, sem e-mail de destino nem dados civis;
   chama `donation.name` de identificador de exibição autodeclarado e não autenticado;
2. `/doacoes/` tem o aviso junto ao ranking (identificador não verificado, valor acumulado, exibição como
   **Anônimo**, contestação de personificação); `docs/PRIVACIDADE-RANKING.md` mantém que contestação pública não
   dá acesso aos dados internos;
3. cache do ranking: uma segunda visita em até 30 min pode reutilizá-lo; com `savedAt` vencido, `preferences.js`
   remove a chave ao carregar/retomar **qualquer** página; `kamyli:ranking-cache-updated` rearma a remoção;
   `kamyli-ranking-cache-v3` é removida; não existe fallback de cache expirado;
4. identificadores muito longos (curto, com espaços e sem espaços com 150+ caracteres) não criam scroll
   horizontal: terminam em `...` visualmente, com posição e valor totalmente visíveis e o texto completo no DOM;
5. `ranking.json`/aba de ranking: durante `loading`, trocar de aba mantém a mensagem de carregamento.

### 4.9 Worker e produção

Execute depois de publicar o Worker (passo a passo em [`PRODUCAO.md`](PRODUCAO.md) e [`TWITCH.md`](TWITCH.md)):

1. `https://api.kamylisumire.com/` retorna JSON do ranking, com CORS para `https://kamylisumire.com`;
2. Streamlabs e Cloudflare usam o mesmo `https://api.kamylisumire.com/oauth/callback`;
3. `/debug/status` (Bearer) mostra `twitch.configured: true` e, para VODs, `refreshDue`, `staleAt` e `stale`;
4. `/twitch/videos`: sem autenticação e sem expor credenciais; `/debug/twitch-sync` antes de 20 h retorna
   `cache_fresh`; entre 20 h e 24 h a renovação pode ocorrer sem indisponibilizar o snapshot; com 21 h o
   snapshot ainda é público enquanto `refreshDue === true`; com 24 h é rejeitado como vencido;
5. `/twitch/live` com Cron `*/10 * * * *`: `/debug/twitch-live-sync?force=1` retorna `status: ok`; offline → `200`
   com `live: false` e o Hero padrão; online → `200` com `live: true`, título, categoria, espectadores e
   thumbnail, avatar com anel de live e Hero com `Sobre | Ao vivo` (aba `Sobre` restaura o normal); segunda
   sincronização antes de 10 min → `cache_fresh` sem chamar `helix/streams`; após 20 min sem snapshot válido →
   `503` e Hero padrão;
6. a thumbnail da live/VOD recebe nova revisão quando `checkedAt`/`updatedAt` muda, sem aumentar as consultas
   ao Helix; o endpoint público não dispara consultas a `api.twitch.tv`;
7. uma sincronização do ranking sem novas doações não regrava snapshots idênticos no KV; a primeira
   sincronização bem-sucedida após migrar cria `ledger:v1`, e `totals:*`/`state:*` permanecem só como espelhos.
