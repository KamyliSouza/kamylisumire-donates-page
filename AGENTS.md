# Regras de manutenção

Este arquivo descreve **apenas o estado vigente** do projeto: invariantes que não
podem ser quebradas e o motivo de cada uma. Histórico de implementação fica no
[`CHANGELOG.md`](CHANGELOG.md) e no Git; não o reintroduza aqui como regra.

Ao mudar um comportamento descrito neste arquivo, atualize a regra no mesmo patch
(sem criar uma seção "Vxx.x"), e registre a mudança no `CHANGELOG.md`.

## Sumário

1. [Princípios](#1-princípios)
2. [Rotina de alteração](#2-rotina-de-alteração)
3. [Páginas](#3-páginas)
4. [Componentes globais](#4-componentes-globais)
5. [Conteúdo editorial](#5-conteúdo-editorial)
6. [Frontend e API](#6-frontend-e-api)
7. [Worker](#7-worker)
8. [Segurança](#8-segurança)
9. [Privacidade e conformidade](#9-privacidade-e-conformidade)
10. [Acessibilidade, contraste e preferências](#10-acessibilidade-contraste-e-preferências)
11. [SEO e publicação](#11-seo-e-publicação)
12. [CI e testes](#12-ci-e-testes)

---

## 1. Princípios

1. Sem framework, bundler ou etapa de build. HTML/CSS/JavaScript vanilla; conteúdo editorial em JSON.
2. Alterações localizadas: não amplie escopo sem necessidade.
3. A Home continua funcional com Worker, Streamlabs ou Twitch fora do ar. A falha da API
   pode afetar a aba Twitch e o status ao vivo, mas deve manter o Hero padrão e não pode
   bloquear a página nem a aba YouTube.
4. Navbar e Footer são componentes compartilhados: não duplique manualmente nas páginas.
5. Preserve acessibilidade, responsividade e preferências de performance.
6. Mudanças em Worker, OAuth, KV, CORS ou endpoints são mudanças deliberadas de backend e
   não acompanham ajustes visuais incidentais.
7. Helpers de edição (Kamyli Editor) são privados e não pertencem ao repositório público.
   Contratos de JSON usados por eles devem permanecer estáveis (ver [seção 5](#5-conteúdo-editorial)).

## 2. Rotina de alteração

### Antes de abrir um PR

Rode os comandos da CI (lista canônica em [`docs/VALIDACAO.md`](docs/VALIDACAO.md)):

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -r -n1 node --check
node --check workers.js
node --check .github/scripts/sync-jogos.mjs
node --check .github/scripts/sync-agenda.mjs
node --check .github/scripts/agenda-week.mjs
node --test .github/tests/*.test.mjs
git diff --check
```

Não versione `__pycache__`, `.pyc`, `.pyo` nem resíduos temporários de migração ou hotfix.

### Cache-busting de scripts e estilos

Sem bundler, cada `<script src>` / `<link>` local carrega `?v=` manualmente.

- Todo arquivo de `js/core/` e todo `js/pages/**` carregado por uma página deve ter `?v=`.
- Ao editar um arquivo, incremente o `?v=` dele em **todas** as páginas que o carregam.
- Os números não precisam coincidir entre arquivos; podem divergir por design.
- Exceção conhecida: `js/core/config.js` ainda não tem `?v=`. Corrija quando o arquivo for
  tocado, não em PRs não relacionados.
- Alterar `preferences.js`, `settings.js`, `footer.js`, `content.js`, `navbar.js` ou
  `reading.css` exige atualizar o `?v=` em todas as páginas públicas **e** os pins
  correspondentes do validador.

### Preload de scripts

A CSP fica em `<meta>`, e com ela o Chromium não descobre antes da hora os
`<script src>` do fim do body. Por isso cada página tem `<link rel="preload" as="script">`
para exatamente os seus scripts locais, **na mesma ordem**. Ao adicionar, remover ou
renomear um script de página, atualize os preloads
(`.github/tests/script-preload.test.mjs` confere). Não use `defer`/`async` para resolver
isso: a ordem de execução e o loader dependem de scripts clássicos.

### Hashes de CSP

Blocos `<script>`/`<style>` inline usam hash SHA-256 e o validador recalcula os hashes
reais. Qualquer mudança (inclusive de espaço em branco) em um bloco inline exige atualizar
a meta CSP da página. O bootstrap inline do `<head>` é **idêntico em todas as páginas**
(e nos artigos do Blog): ao editá-lo, recalcule o hash e atualize a CSP de todas.

### Fallbacks espelhados

`defaults.navbar` e `defaults.blogConfig` em `js/core/content.js` são fallbacks de
contingência e devem permanecer semanticamente idênticos a `data/content/navbar.json` e
`data/blog/config.json`; alterar o JSON exige atualizar o fallback no mesmo patch (a CI
rejeita divergência). O mesmo vale para os textos de `interface.json` →
`configuracoes.leitura*` e `motivosBlur.reading`. O fallback estático de
`doacoes/index.html` deve repetir `data/content/doacoes.json`.

### Assets

Gráficos públicos (avatar, favicon, fundo, preview social) ficam em
`https://assets.kamylisumire.com`; não mantenha duplicatas no repositório. Nunito e sua
licença permanecem locais em `assets/fonts/`.

---

## 3. Páginas

### Home

Contém sete cards nativos: Hero, Lives, Agenda, Blog, Regras, Créditos e CTA de apoio.

- `data/content/home-cards.json` controla ordem, visibilidade, tamanho e variante e pode
  adicionar cards `personalizado`. Os sete nativos devem existir **exatamente uma vez** (com
  `id` igual ao `tipo`) e podem ser ocultados ou reordenados. O conteúdo de cada nativo
  continua em seu arquivo editorial; este JSON não duplica textos.
- O contrato de cards **não aceita** HTML/SVG bruto, CSS arbitrário, cores livres nem assets.
  Para ampliar o visual, crie uma variante documentada no [Design System](DESIGN-SYSTEM.md).
- A Home carrega `js/core/api.js` somente para as integrações públicas da Twitch (aba
  Twitch de Lives e status ao vivo do Hero). **Não** carrega `ranking.js`.
- O CTA principal do Hero é `#heroAgendaButton` (`heroAgenda`: texto "Agenda", ícone `calendar`, leva a `/agenda/`);
  o Apoiar fica na Navbar e no CTA `#homeDonationButton` (mesmo coração do botão Apoiar da Navbar); o CTA
  "Gostou das lives?" usa o rótulo `Apoiar`.
- **Link dos botões (V48.5.4):** `buttons.json` aceita um campo opcional `url` **só** em `heroAgenda`, `heroLive` e
  `homeDonation` (`URL_KEYS` em `buttons.js`, `BUTTON_URL_KEYS` no validador, e a lista do helper devem ficar
  iguais). Formatos aceitos: `/caminho/` do site (resolvido por `KAMYLI_SITE_PATH`) ou `http(s)://`; `javascript:`,
  `//host`, `data:` etc. são ignorados e vale o `href` do HTML. Link externo ganha `target="_blank"` e
  `rel="noopener noreferrer"`; interno não. `buttons.js` guarda o link em `data-button-url`; o status ao vivo do Hero
  (`twitch-live.js`) marca `data-live-override` ao trocar o `href` de `#heroLiveAnchor` para a Twitch e, fora do ar,
  volta para `data-button-url`. Não ponha `url` em botões cujo `href` é definido por script (`livesChannel`,
  `notFoundHome`, `donation*`).
- A Twitch padrão do Hero (`#heroLivePreview`, `#heroLiveWatchButton` e o recurso do `twitch-live.js`) vem de
  `lives.json` → `twitchCanalUrl`, a mesma fonte do botão de canal da seção de lives; quando há live, vale o link
  devolvido pelo Worker.
- `#livesTrack` e `#agendaGrid` aceitam click + arrasta com mouse/caneta; touch, teclado,
  setas, links e scroll-snap devem continuar funcionando. Implementação isolada em
  `js/pages/home/home-interactions.js` e `css/components/home-interactions.css`.
- Hash e performance: não remova `runAfterSiteReveal`, o tratamento de `hashchange`, o
  scrollspy nem `startSectionStabilization`. Links `/#secao` aguardam `kamyli:site-revealed`
  antes do scroll; a estabilização pós-scroll absorve mudanças de altura de conteúdo
  assíncrono (não a troque por `setTimeout` fixo) e deve ser cancelada assim que o usuário
  rolar. Observers de conteúdo/botões filtram mutações relevantes e `applyNavbarOrder()`
  permanece idempotente. Agenda e assets decorativos não voltam ao caminho crítico do loader.

### Blog

`/blog/` é estático e textual, e é rota pública **permanente**: fica acessível, na Navbar e como
card da Home mesmo sem posts publicados (a Home mostra o estado vazio, a menos que o card `blog`
esteja oculto em `home-cards.json`; hoje ele está oculto e `posts.json` está vazio). Rota
acessível não significa indexável: sem post publicado a página é `noindex, follow` e fica fora do
sitemap (ver [SEO](#11-seo-e-publicação)).

- Configuração: `data/blog/config.json`; índice: `data/blog/posts.json`; fonte:
  `data/blog/posts/<slug>.md`. Cada post publicado precisa de `blog/<slug>/index.html`.
- Não carregue API/Worker no Blog.
- A busca da listagem usa só `title`, `summary` e `tags`; não crie campos novos para ela.

### Galeria de Artes

`/artes/` é estática/editorial e **não depende do Worker/KV**.

- Estrutura: `artes/index.html`, `css/pages/artes.css`, `js/pages/artes/artes.js`,
  `data/content/artes.json`; Navbar/Footer compartilhados.
- Cada obra tem `preview` (alimenta a grade) e `imagem` (carregada só no lightbox), ambas
  HTTPS. A grade nunca baixa a imagem full automaticamente.
- Campos de cada item: `id`, `titulo`, `artista`, `imagem`, `alt`, `data`, `categoria`,
  `tags` e, opcionalmente, `creditoUrl`, `largura`, `altura`. IDs são únicos em kebab-case.
  Ajustes puramente visuais **não** criam, removem nem renomeiam campos: a compatibilidade
  com Helpers depende disso.
- Os cards da grade mostram **somente título e artista**; categoria, data, tags e crédito
  pertencem ao dialog.
- Imagens usam `loading=lazy` e o estado de carregamento reutiliza `.site-loader-logo`.
  Imagens HTTPS editoriais usam `referrerPolicy = "no-referrer"` na grade, no dialog e no
  preload; mudanças no fluxo de mídia externa exigem revisão da Política de Privacidade.
- Callbacks de imagem full devem ser invalidados quando o dialog fecha ou outro item o
  assume; callbacks obsoletos não alteram a obra atual.
- O seletor **Buscar em** é um drop-down próprio (teclado, foco, ARIA) usando só tokens do
  Design System, sem asset gráfico local.

### Jogos das Lives

`/jogos/` é alimentada por `data/content/jogos.json`, gerado por
`.github/scripts/sync-jogos.mjs`. O fluxo completo (Trello, Steam, cache, disjuntor) está em
[`docs/AGENDA-E-JOGOS.md`](docs/AGENDA-E-JOGOS.md). Invariantes:

- O navegador do visitante não consulta o Trello nem a Steam.
- A descrição completa de cards do Trello e demais metadados nunca vão para `jogos.json`.
- Reviews, notas, playlists, episódios e links pessoais ficam somente em `data/content/jogos-editorial.json`, associados por `gameId` (ID original de 24 caracteres do cartão). Esse arquivo é manual, independente do sincronizador e nunca deve ser sobrescrito por `sync-jogos.mjs`.
- `/jogos/` combina `jogos.json` e `jogos-editorial.json` no navegador. Se o JSON editorial estiver ausente ou inválido, a lista de jogos continua disponível sem as fichas.
- A página apresenta playlists e VODs por links externos; não incorpora players, iframe ou chat e não usa YouTube Data API.
- Interface de `/jogos/` (`jogos.js` + `jogos.css`):
  - **Cartão:** `article.jogo-card` contém `div.jogo-card-media`, `div.jogo-card-shade`, `div.jogo-card-content`
    (com o `<h2>` do jogo, o status e o selo "Ficha editorial") e, por último, `button.jogo-card-open`, uma
    camada transparente sobre o cartão inteiro (`z-index: 4`). O título precisa continuar sendo um `<h2>` real
    e **não** pode ficar dentro do botão (filhos de `<button>` perdem a semântica). O link da Steam é irmão do
    botão (`z-index: 5`), nunca filho: não aninhe controles interativos.
  - **Modos:** `Pôsteres` (padrão) e `Compacto` alternam `.is-compact` na grade; o estado vai em `aria-pressed`
    e a escolha é lembrada em `kamyli:ui-view-jogos` (`poster`/`compact`) via `KAMYLI_VIEW_MODE` (ver "Preferência de
    visualização"). A leitura acontece em `init()`, antes do primeiro render, para não piscar em Pôsteres.
  - **Popup:** `<dialog id="jogoDialog">` nativo (`showModal()`), foco inicial no botão de fechar, `Esc`, botão
    ×, clique no fundo (só quando o clique começa e termina no fundo) e retorno do foco ao cartão de origem.
    Review, spoilers e todo texto editorial entram **somente** por `textContent`/`createElement`; nunca
    `innerHTML`. Com o popup aberto, a página atrás não rola (`html:has(.jogo-dialog[open])`).
  - **Organização do popup:** coluna lateral fixa (`.jogo-dialog-aside`) com a capa e as **ações externas**
    (`#jogoDialogActions`: Steam, "Playlist completa", "Última transmissão"); coluna principal com cabeçalho
    (título e status), "Minha experiência" (nota em destaque + recomendação + review; spoilers em `<details>`),
    "Transmissões" (resumo primeira/última/total derivado dos episódios + lista numerada, recolhida acima de
    seis itens) e "Links adicionais". Não crie campos novos no JSON para isso: tudo vem de `episodes`,
    `playlistUrl`, `rating` e `recommendation`. No celular (≤ 760 px) a capa encolhe para 96 px ao lado do título e
    as ações ocupam a largura toda. Ao abrir, o painel volta ao topo (`scrollTop = 0`).
  - **Ficha ausente:** jogo sem entrada em `jogos-editorial.json` não mostra seções vazias; só título, status,
    Steam e, se não houver nada, a linha `#jogoDialogEmpty`. O selo "Ficha editorial" usa
    `hasEditorialContent()` (review, nota, recomendação, playlist, episódios ou links).
  - **Links externos:** HTTPS; playlist e vídeos só em `youtube.com`/`www.youtube.com` (playlist exige
    `/playlist?list=`; vídeo é montado como `watch?v=<videoId>`); Steam só em `store.steampowered.com`; todos
    com `target="_blank"` e `rel="noopener noreferrer"`.
- Correspondência por nome continua exata e inequívoca; `SteamAppID:` é override
  autoritativo. Não reintroduza SteamGridDB, scraping da loja ou chaves da Steam no frontend.
- Capas limitadas ao asset vertical original da Steam; sem asset oficial, preserve o
  placeholder local. `steamAppId` e `steamUrl` pertencem ao jogo e não dependem de haver capa.
  `icon` (do `community_icon`) serve à Agenda e não substitui a Library Capsule.
- Todo acesso à Steam passa por `.github/scripts/steam-client.mjs` (User-Agent identificado,
  intervalo mínimo, repetição com espera crescente, disjuntor). Ao interromper, o sync segue
  com cache e último estado publicado; falhas temporárias nunca apagam capa, ícone,
  `steamAppId` nem candidatas. `IStoreBrowseService/GetItems` não é documentado pela Valve:
  mantenha uma única função que o chama (`ensureSteamItems`), em lote e só para apps sem
  cache válido.
- A paginação vem de `data/content/jogos-config.json` → `jogosPorPagina` (1 a 60; fallback 15).
  Não reintroduza um `PAGE_SIZE` fixo.
- Toda mudança em `jogos.js` preserva o sinal `KAMYLI_PAGE_CONTENT_READY` /
  `kamyli:loader-ready` após `init()`, inclusive quando a carga falha de forma tratada.
- Os links da Steam exigem HTTPS em `store.steampowered.com`.

### Agenda

`data/agenda.json` é o contrato público/local consumido pela Home, pela página `/agenda/` e
pelos Helpers: exatamente sete dias, de domingo a sábado. Pode ser gerado por
`.github/scripts/sync-agenda.mjs` a partir de um quadro Trello dedicado (formato em
[`docs/AGENDA-E-JOGOS.md`](docs/AGENDA-E-JOGOS.md)). O navegador nunca consulta o Trello.

- **Semana publicada:** decidida por `.github/scripts/agenda-week.mjs`, nunca só pelo texto do
  Trello: (1) `Semana:` do quadro, se atual ou futura; (2) `Data:` dos cards, se atual ou
  futura; (3) a semana atual em `America/Sao_Paulo`. Semana passada nunca é publicada.
  **Não** reintroduza regra que dependa apenas de `Semana:`/`Data:` mantidos à mão (foi isso
  que prendia as datas numa semana antiga). Mantenha `agenda-week.mjs` sem rede e sem
  variáveis de ambiente, coberto por `agenda-week.test.mjs`.
- **Compatibilidade:** o campo aditivo `lives` guarda todos os eventos do dia; `temLive`,
  `horario`, `titulo`, `descricao` e `plataformas` continuam obrigatórios no dia e espelham
  `lives[0]`. O frontend continua aceitando arquivos legados sem `lives`. Horário vazio
  aparece como "A definir". `icon` só reutiliza o ícone `steam-original` do catálogo de
  Jogos e é carregado com `referrerpolicy="no-referrer"`. A Home preserva o ícone enquanto o
  título legado for igual ao de `lives[0]` e o omite se o título for alterado.
- O sync **não** consulta a Steam nem mantém segundo cache de assets. Se o Trello falhar ou o
  quadro for inválido, ele falha antes do commit e preserva o último `agenda.json` válido.
- **Aviso legal da Steam:** na Home, `.agenda-steam-notice` fica logo após a observação da
  Agenda, usando `<details>`/`<summary>` com `Dados e ícones da Steam · Aviso legal` sempre
  visível e o texto completo expansível. Deve cobrir "apresentação conforme disponível/sem
  garantias" e "independência/não afiliação", sem depender só do aviso de `/jogos/`.
- **Destaque do dia (Home):** `home.js` marca o card de hoje com `.is-today`, `aria-current="date"`
  e " (hoje)" para leitores de tela. O dia é calculado **no aparelho do visitante** com a data
  local (nunca `toISOString()`, que usa UTC e erra o dia à noite no Brasil) e recalculado na virada
  da meia-noite e em `visibilitychange`. O carrossel rola sozinho até o card de hoje **apenas na
  abertura**, só na horizontal, e para ao primeiro `pointerdown`/`wheel`/`touchstart`/`keydown` ou
  após ~3,5 s. O realce não usa borda (para não competir com a borda das lives) e tem regra
  própria para `forced-colors`. Coberto por `agenda-today.test.mjs`.
- `.agenda-card-content` só entra na ordem de foco quando `scrollHeight > clientHeight`;
  preserve o recálculo após renderização, resize e carregamento de fontes.
- **Página `/agenda/`:** `agenda/index.html` + `css/pages/agenda.css` +
  `js/pages/agenda/agenda-model.js` (regras puras: sete dias, lives, escolha de arte) e
  `agenda.js` (DOM). Consome só `/data/agenda.json` e `/data/content/jogos-artwork.json`;
  nunca Trello nem Steam Web API, e nunca monta URL de imagem a partir do App ID. Arte de
  card (`header`, `main-capsule`, `library-hero`) e fundo panorâmico (`library-hero`,
  `library-hero-2x`) são tipos distintos: não promova um a outro nem aceite hosts fora dos
  de imagem da Steam. Textos entram por `textContent`. O item Agenda da Navbar aponta para
  `/agenda/` (em `navbar.json` e no fallback de `content.js`); a Home mantém a sua seção
  `#agenda`.
- **Modo compacto da `/agenda/`:** alternador `#agendaViewStandard`/`#agendaViewCompact` (`.agenda-view-switch`,
  `aria-pressed`) no cabeçalho do painel. `agenda.js` guarda a semana em `state.week` e redesenha os dias com
  `renderDay(day, compact)`: no compacto o cartão **mantém** `.agenda-day-art`, mas só como uma **faixa à direita**
  (largura `--row-art-w`, a coluna do selo mais 18 px, com `mask-image` que a dissolve na superfície) e **não cria**
  as descrições; a grade recebe `.is-compact` (uma linha por dia; `display: contents` em `.agenda-day-top`; no
  celular o jogo desce para a 2ª linha e termina antes da faixa). Como o texto nunca fica sobre a arte, as linhas
  **não passam pela análise de contraste** (`onLoad: null`) e usam os tokens do card sem arte; a capa também não é
  esticada (a faixa é menor que o card padrão). Se mudar a largura da faixa, mantenha o texto fora dela. O
  alternador usa os tokens do painel (`--ag-pill-*` e `--ag-chip-*`), não os do site, porque o painel tem tema próprio.
- **Preferência de visualização (V48.5.2):** `js/core/view-mode.js` expõe `window.KAMYLI_VIEW_MODE.get(página)` e
  `.set(página, modo)`. Chaves de `localStorage`: `kamyli:ui-view-agenda` (`standard`|`compact`) e
  `kamyli:ui-view-jogos` (`poster`|`compact`). Valor inválido ou storage bloqueado → modo padrão, sem erro; as
  páginas guardam o modo em memória, então o clique funciona mesmo sem storage. Só a ação do visitante grava
  (nunca `init()`). Nova página com visualização alternável: acrescente-a em `PAGES` e em `validate_view_mode()`,
  mantenha o carregamento do módulo antes do script da página (e o preload em sincronia) e atualize a seção 6 da
  Política de Privacidade. Não leve isso para `preferences.js` sem subir o cache-buster dele em **todas** as páginas
  (o validador e o `reading-mode.test.mjs` exigem a versão exata).
- Contraste na `/agenda/`: o contraste de textos sobre as artes é adaptado em JavaScript sem
  modificar a imagem; falhas de CORS mantêm o contraste padrão.
- Favicon: `js/core/favicon.js` reutiliza `logo.webp` como máscara na cor `--primary-color` do
  tema ativo e atualiza quando o tema muda; se a imagem, o Canvas ou a exportação falharem, os
  favicons originais (`favicon.webp`/`favicon.png`) continuam como fallback. Coberto por
  `favicon.test.mjs`.

### Doações

`/doacoes/` contém LivePix, Pixie e ranking.

- Somente `/doacoes/` carrega `js/pages/doacoes/ranking.js`. `js/core/api.js` é compartilhado
  com a aba Twitch da Home.
- Campos multilinha de `doacoes.json` (`subtitulo`, `livepix.descricao`, `pixie.descricao`,
  `aviso.texto`) usam `\n` para quebra de linha. O frontend usa `textContent` (nunca
  `innerHTML` nem `<br>`) e `white-space: pre-line` em `css/pages/doacoes.css`.
- `ranking.js` renderiza a aba ativa quando cache/API concluem; durante `loading`, trocar de
  aba mantém a mensagem de carregamento e não simula ranking vazio.

### Lives (componente da Home)

Mesmo carrossel visual, duas fontes: **Twitch** (aba primária, automática) e **YouTube**
(manual/local). `data/content/lives.json` mantém os vídeos do YouTube (`videoId`, `title`,
`date`) e declara `defaultPlatform: "twitch"` e `twitchCanalUrl`.

- YouTube continua sem iframe/player, `YT.Player`, `iframe_api`, playlists automáticas, YouTube
  Data API ou chave Google. Dados da Twitch são normalizados pelo Worker e **não** são
  copiados para o JSON.
- Não existe página independente `/live/` nem player/chat incorporado de Twitch ou YouTube.
  A reprodução acontece nos serviços oficiais por links externos; não recrie embeds ou a rota
  sem uma nova revisão documentada de requisitos, termos e privacidade.
- Invariantes da integração Twitch estão em [Worker › Twitch](#twitch).
- O Hero só mostra `Sobre | Ao vivo` quando `live === true`; offline, erro ou snapshot vencido
  mantêm o Hero padrão. Thumbnails da Twitch aceitam somente HTTPS.

### Privacidade, Uso de IA e 404

- `/privacidade/` e `/uso-de-ia/` são públicas e permanecem acessíveis pelo footer global.
- `404.html` permanece `noindex`.

---

## 4. Componentes globais

### Navbar

`data/content/navbar.json` (`version: 2`) é a fonte única dos nove itens clicáveis. As chaves
são estáveis e não podem ser renomeadas: `inicio`, `lives`, `agenda`, `artes`, `blog`, `jogos`,
`regras`, `creditos`, `apoio`; cada uma tem `texto`, `icone` e `url`. Apoiar **não** depende
de `buttons.json`.

- `ordem` é uma lista sem duplicatas com a sequência visual dos nove itens. O runtime completa
  uma ordem ausente/incompleta com o padrão, mas o JSON versionado deve listar todos uma vez.
- `apoioFixoNoFim` (booleano; ausente = `true`):
  - `true`: Apoiar fica no wrapper dedicado `.site-nav-support-wrap`, à direita, separado pelo
    divisor, fora da ordem;
  - `false`: o **mesmo nó** é movido para `.site-nav-links` e obedece `ordem`.
  Não duplique o link Apoiar no DOM; o wrapper/divisor permanecem no DOM e usam `hidden` quando
  o CTA está no fluxo reordenável. Valor não booleano é rejeitado pelo validador.
- A Navbar marca a página ativa antes de `navbar.json` terminar de carregar. Preserve o
  realinhamento do item `.is-active` após `kamyli:global-ui-ready`, com comportamento `auto`
  (sem animação), senão o scroll horizontal fica calculado para a ordem antiga.
- Alterações em `js/core/navbar.js` exigem atualizar o `?v=` em todas as páginas.
- Links externos seguem o fluxo global de confirmação (`external-links.js`) por delegação de
  eventos. Não implemente confirmadores concorrentes por página.

### Navbar mobile (até 767 px)

Estado vigente; desktop/tablet largo preservam a Navbar tradicional.

- **Topo:** `Logo | título contextual | Apoiar`, com divisórias. O título fica alinhado à esquerda
  entre as divisórias, usa `--primary-color`, trunca com segurança e troca com animação
  vertical (desativada por `prefers-reduced-motion`). `sessionStorage` só transporta o rótulo
  anterior durante navegação iniciada pela Navbar. Com `apoioFixoNoFim: true`, Apoiar fica no
  topo; com `false`, entra no menu conforme `ordem`.
- **Menu = drawer lateral esquerdo** (`.site-nav-mobile-panel`, `role="dialog"`,
  `aria-label="Navegação principal"`), dentro de `.site-nav-mobile-layer`, **fora** de
  `.site-nav` (senão `backdrop-filter` vira containing block de `position: fixed` no
  Chromium/Brave). Ao voltar ao desktop os mesmos nós retornam à Navbar.
  - Largura `clamp(248px, 74vw, 288px)`; começa abaixo da Navbar; links agrupados no topo;
    **sem cabeçalho e sem botão ×**.
  - Os links reais de `.site-nav-links` são reparentados (não há links duplicados como fonte
    editorial); só o CTA do rodapé é clonado de Apoiar e ressincronizado após
    `kamyli:global-ui-ready`. A lista rola sozinha; Apoiar fica fixo no rodapé.
  - Geometria: os links são filhos diretos (`.site-nav-links > .site-nav-link`), em Flex
    (`justify-content: flex-start`), com 100% da largura útil e recuo lateral de 8 px, o mesmo
    do rodapé. `[data-nav-label]` usa `flex: 1 1 auto`. **Não** use `.site-nav-item` (não
    existe) nem Grid fixa de 24 px para ícones ocultos.
  - Visual: sem borda/cartão; normal transparente, ativo/foco/hover em `--primary-soft`.
    Fallbacks de ícone são nós próprios (`[data-mobile-nav-fallback]`) e nunca substituem o
    slot editorial `[data-nav-icon]`.
  - Comportamento: `inert`/`aria-hidden` fechado; focus trap por Tab aberto; foco inicial no
    primeiro link; fecha por swipe à esquerda, backdrop, `Escape` e Voltar do navegador/Android.
    A abertura cria uma entrada temporária no History API, consumida ao fechar. A faixa de 24 px
    da borda esquerda abre por swipe; o gesto diferencia eixo horizontal/vertical e não bloqueia
    o scroll vertical.
- **Redes** é um popup compacto no canto inferior direito (não vira drawer). Aberto, mantém a
  superfície `--card-bg` e indica o estado por borda/halo primário (não use `--primary-soft`
  como única superfície). Fecha já no `pointerdown` fora do popup, para não ficar aberto
  durante o scroll.
- **Coordenação:** `window.KamyliMobileOverlay` (`js/core/mobile-overlay.js`) é o único
  coordenador de `menu`, `socials` e `settings`: exclusão mútua, `popstate`, `Escape`,
  restauração de foco e fila de abertura durante fechamento. Componentes não manipulam o
  estado um do outro nem criam históricos independentes; alternar reutiliza a mesma entrada
  temporária via `replaceState`. Estados no History API são por documento e descartados em
  reload, navegação, `pagehide` e BFCache; a Home preserva `history.state` ao trocar só o hash.
- Em campos de texto, os FABs somem enquanto o teclado virtual ocupa parte relevante da viewport.
- **Loader:** `.site-nav-mobile-layer` replica explicitamente a ocultação de
  `site-loading-pending`, `site-loading-visible`, `site-navigation-loading` e `site-page-leaving`
  (gatilho, drawer, backdrop e faixa de swipe ficam invisíveis e não interativos).
- Não restaure a faixa horizontal rolável da Navbar no mobile.

### Redes sociais globais

`data/content/redes.json` é a **fonte única**; frontend em `js/core/socials.js` +
`css/core/socials.css`, carregado por todas as páginas públicas. Não recoloque links
hardcoded no Hero/Navbar.

- Desktop/tablet (≥ 768 px): dock vertical fixo à esquerda. Mobile: cápsula expansível
  `@ Redes`, sem ícone de compartilhamento.
- URLs HTTPS; ícones da allowlist de `button-icons.js`; sem HTML/SVG/CSS arbitrário no JSON.
- `z-index` abaixo da Navbar e dos listboxes; respeitar teclado, safe area e
  `prefers-reduced-motion`.
- No gatilho mobile, efeitos de `:hover` ficam restritos a `(hover: hover) and (pointer: fine)`;
  touch não pode depender de hover persistente para representar o estado aberto.
- Controlado por botão + `aria-expanded`/`inert`, com animação curta.

### Configurações (engrenagem na barra superior)

- O botão é só um ícone de engrenagem (`#siteSettingsToggle`, `data-button-key="settingsOpen"`,
  `text` vazio + `ariaLabel` em `buttons.json`), no slot `#site-nav-settings-slot` dentro de
  `.site-nav-actions`, **antes** do slot opcional de Apoiar. Nunca o coloque em
  `.site-nav-support-wrap` (pode ficar `hidden`).
- `js/core/settings.js` monta botão e painel (`#siteSettingsPopover`). O painel é anexado a
  `<body>` (não à navbar nem ao rodapé), é `position: fixed`, **opaco** (`--card-bg` composto
  sobre `--bg-color`) e sem `backdrop-filter`, porque flutua sobre texto. No celular é
  centralizado; no desktop alinha à borda direita do conteúdo da navbar.
- Mobile: é o overlay `settings` do `KamyliMobileOverlay`. Desktop: independente (Esc, clique
  fora, ×; o foco volta à engrenagem).
- Ordem dos scripts nas páginas: `preferences.js` → `mobile-overlay.js` → `navbar.js` →
  `settings.js`. `footer.js` não conhece as Configurações.
- O preenchimento da engrenagem significa **painel aberto** (`[aria-expanded="true"]`) e mais
  nada. Foco de teclado = só contorno; hover só em `(hover: hover) and (pointer: fine)` e só no
  contorno.
- Ids: `siteSettings*`, `siteThemeStatus`, `siteReadingStatus`, `siteReadingSizeLabel`,
  `siteReadingSizeStatus`, `siteBlurStatus`. Textos em `interface.json` → `configuracoes`,
  aplicados por `applySettings()` em `content.js`.
- Cobertura: `settings-placement.test.mjs` e `validate_settings_placement()`.

### Modo leitura

- Preferência **explícita** do visitante: `kamyli:ui-reading` = `on`/`off` e
  `kamyli:ui-reading-size` = `normal`/`large`/`xlarge`. Nunca ligue automaticamente por
  User-Agent, mídia ou performance.
- Estado em `html[data-reading]` e `html[data-reading-size]`, aplicado pelo bootstrap inline
  do `<head>` (sem flash) e por `preferences.js` (`KAMYLI_UI_PREFS.setReading/setReadingSize`).
- Ligar a leitura força `blur = off` com motivo `reading`, mas preserva `blurPreference`;
  desligar restaura o blur anterior.
- Todo o visual fica em `css/core/reading.css`, carregado **por último** em todas as páginas
  (inclusive artigos). Sem `!important`, sem `backdrop-filter` diferente de `none`, sem
  transparência nas superfícies, sem cores fora dos tokens do arquivo. O
  `reading-mode.test.mjs` exige AAA para o texto principal e AA para os demais, nos dois temas.
- Estilo de link de texto (cor + sublinhado) usa sempre `a:not(.button)`: botões `.button` em
  seções de texto mantêm as próprias cores. Validador e teste falham se uma regra `... a`
  perder o `:not(.button)`.
- Atalhos nas páginas: `<button type="button" data-reading-toggle aria-pressed="false">`;
  `preferences.js` cuida do clique por delegação e do `aria-pressed`. Sem `style=` nem `on*=`.

### Loader

- O bootstrap inline de todas as páginas arma `KAMYLI_LOADER_FAILSAFE_TIMER` por 6 s antes de
  `loader.js`. Se o fluxo principal não assumir o reveal, o fail-safe remove os estados
  bloqueantes e restaura `site-ready`. `loader.js` cancela o timer só quando o reveal normal
  assume; se `KAMYLI_LOADER_FAILSAFE_FIRED` já estiver ativo, o loader tardio não reabre o overlay.
- Dois modos em `loader.js`: **initial** (primeira visita/reload: exibição mínima de 320 ms, espera
  máxima de 2,5 s, saída de 320 ms) e **navigation** (ponte curta entre páginas internas: mínimo de
  240 ms, espera máxima de 1,8 s, entrada de 220 ms, saída de 240 ms). O loader entra sobre a página
  atual, a troca de documento acontece já coberta e o destino usa o tempo mínimo reduzido.
- O reveal da página **sobrepõe** o fim da saída do loader (320 ms no modo initial, 240 ms em
  navigation): `site-revealing` começa antes de o loader terminar de sumir e `site-ready` é aplicado
  depois do estado de reveal (~420 ms). O loader **não é removido**: fica invisível e reutilizável
  para a próxima navegação.
- O fundo AVIF é preparado de forma **oportunista** (preload/decode, com timeout de 1,4 s) e **não
  segura o reveal**: o conteúdo nunca espera rede externa nem decodificação da arte de fundo.
- Mudar o bootstrap inline exige atualizar o hash CSP em todas as páginas e manter
  `loader-failsafe.test.mjs` passando.

### Rodapé, preferências e performance

Preserve: tema automático/claro/escuro; blur automático/ligado/desligado;
`prefers-reduced-motion`; `prefers-reduced-transparency`; Save-Data; perfil adaptativo por
memória/CPU; e o modo leitura explícito, que sobrepõe o blur. Não substitua por detecção de
user-agent.

---

## 5. Conteúdo editorial

Edite textos nos JSON correspondentes em vez de hardcode sempre que o campo já for editorial.
Formato de cada arquivo: [`data/content/README.md`](data/content/README.md) e
[`data/blog/README.md`](data/blog/README.md).

Arquivos principais: `hero.json`, `artes.json`, `lives.json`, `regras.json`, `creditos.json`,
`home-doacoes.json`, `home-cards.json`, `doacoes.json`, `ranking.json`, `footer.json`,
`navbar.json`, `redes.json`, `buttons.json`, `interface.json`, `seo.json`, `jogos-config.json`,
`jogos-editorial.json`,
`data/blog/config.json`, `data/blog/posts.json`, `data/blog/posts/<slug>.md` e
`data/agenda.json`. `jogos.json`, `jogos-artwork.json` e `jogos-artwork-cache.json` são
gerados pelo sync de Jogos: não edite à mão.

Regras comuns:

- Ícones: somente nomes da allowlist de `js/core/button-icons.js`.
- URLs: caminho interno iniciado por `/` ou HTTP(S); atribuição a `href` passa por
  `KamyliSanitize.safeHttpUrl()`.
- Nenhum JSON aceita HTML, SVG bruto, CSS, cores livres ou caminhos de assets.
- `redes.json`: `id` único em kebab-case, `url` HTTPS, `visivel` booleano.
- Quebras de linha em campos multilinha: `\n`.

---

## 6. Frontend e API

- `js/core/config.js` é **apenas** configuração compartilhada; não o use para carregar CSS/JS de
  páginas nem hotfixes. Produção: `useCustomDomain: true`,
  `customDomainUrl: "https://api.kamylisumire.com"`, `fallbackToWorkersDev: true`.
- `api.kamylisumire.com` é o endpoint primário. `workers.dev` é **contingência de transporte**:
  só é tentado após falha de rede, timeout ou interrupção do stream; nunca como repetição de
  HTTP 4xx/5xx nem de JSON inválido.
- O timeout de `KamyliAPI.getJSON()` permanece armado até `response.json()` terminar; não limpe o
  `AbortController` logo após os headers. Falhas HTTP preservam o status no erro e interrompem a
  cadeia de candidatos. Mantenha `api-client.test.mjs` ao alterar `js/core/api.js`.
- URLs editoriais/API atribuídas a `href` passam por `KamyliSanitize.safeHttpUrl()`: Créditos
  aceitam HTTP(S); Steam exige HTTPS em `store.steampowered.com`; Twitch exige HTTPS em
  `twitch.tv`/`www.twitch.tv`. Imagens remotas exigem ao menos HTTPS e as allowlists existentes.
- **Cache local do ranking:** chave `kamyli-ranking-cache-v4`, TTL de 30 min (`RANKING_CACHE_TTL_MS`
  é o limite máximo de retenção). Cache vencido é removido antes do uso e **nunca** vira
  fallback. `ranking.js` emite `kamyli:ranking-cache-updated` ao gravar/remover;
  `preferences.js` agenda a remoção em qualquer página e revalida em foco, `pageshow`,
  visibilidade e evento de storage. Navegador suspenso pode atrasar timers: ao retomar, remova
  imediatamente.
- `applyRuntimeSeo()` só aplica `data.home` quando o documento é de fato a Home; páginas sem
  entrada em `seo.json` preservam seus metadados estáticos.

---

## 7. Worker

`workers.js` é o backend de `api.kamylisumire.com`. Não há `wrangler.toml`: variáveis, secrets,
bindings e Cron são configurados no painel/CLI da Cloudflare (ver [`docs/PRODUCAO.md`](docs/PRODUCAO.md)).

### Roteamento e erros

- Roteamento explícito. Rotas: `/` (ranking), `/oauth/authorize`, `/oauth/callback`,
  `/debug/status`, `/debug/sync`, `/debug/twitch-sync`, `/debug/twitch-live-sync`,
  `/twitch/videos`, `/twitch/live`. Caminho desconhecido responde `404` **sem ler ranking/KV**;
  métodos diferentes de `GET`/`OPTIONS` respondem `405`.
- Toda exceção inesperada do roteamento vira JSON `500` com CORS e `Cache-Control: no-store`;
  não remova o `try/catch` global de `fetch()`.
- CORS: permitir `https://kamylisumire.com` e só outras origens explicitamente necessárias. Sem
  variável configurada, restringe-se aos domínios oficiais; `*` só é aceitável se definido
  explicitamente para teste. Em CORS restrito, `Vary: Origin` existe mesmo quando a origem é
  ausente ou não permitida.

### Autenticação e OAuth

- `/debug/*` aceita o token administrativo **somente** em `Authorization: Bearer <token>`. O
  fallback `?key=` fica restrito a `/oauth/authorize` (navegação simples). A comparação usa
  `crypto.subtle.timingSafeEqual`.
- `OAUTH_SETUP_TOKEN` e `OAUTH_STATE_SECRET` têm **no mínimo 32 caracteres**, são diferentes
  entre si, e valores menores falham fechado.
- O `state` OAuth é assinado por HMAC com `OAUTH_STATE_SECRET`. Cada autorização registra no KV
  um nonce `oauth:state:nonce:*` (TTL 10 min) que o callback valida e consome **antes** da troca
  do `code`. O KV é eventualmente consistente: o nonce é defesa em profundidade e não substitui
  consistência forte se o modelo de ameaça futuro exigir proteção global contra replay concorrente.
- `REDIRECT_URI=https://api.kamylisumire.com/oauth/callback`, idêntico no Cloudflare e na
  aplicação Streamlabs. Rotas administrativas e `/oauth/callback` usam os mesmos cabeçalhos de CORS
  de `handleRanking`.
- Credenciais (`STREAMLABS_CLIENT_SECRET`, `TWITCH_CLIENT_SECRET`, `OAUTH_SETUP_TOKEN`,
  `OAUTH_STATE_SECRET`, tokens OAuth) ficam fora do Git.

### Quota e cache

A otimização de quota **não pode reduzir a frequência funcional** das integrações. Preserve:

- Streamlabs na janela operacional do Cron (~10 min);
- Twitch Live na janela nominal de 10 min;
- validação do App Access Token Twitch a cada 50 min (sempre abaixo de 1 h);
- VODs Twitch: renovação após 20 h, validade/TTL máxima de 24 h;
- visitantes nunca chamam diretamente Twitch ou Streamlabs.

Ranking, `/twitch/videos` e `/twitch/live` podem usar `caches.default` com chaves canônicas sem
query string; a Cache API é otimização de leitura, não fonte autoritativa (o KV `RANKINGS` é).
Estados consolidados: `tokens:streamlabs_state`, `twitch:app_access_token_state`,
`twitch:user_state`; as chaves antigas só valem como fallback de migração (a migração de
`twitch:user_login`/`twitch:user_id` não renova o TTL legado). Evite writes idênticos no KV
(`putKVIfChanged`), sem sacrificar correção do ranking, renovação OAuth ou snapshot Twitch.

### Twitch

- O navegador consulta `/twitch/videos` (VODs) e `/twitch/live` (status). Ambos leem cache/KV e
  **nunca** chamam `api.twitch.tv` durante uma visita.
- `syncTwitchVideosIfDue()` inicia a renovação após 20 h; `twitch:videos` permanece válido por no
  máximo 24 h (TTL 86400 s) e **não pode ser servido com 24 h ou mais**. Se a renovação falhar
  depois da expiração, a aba Twitch fica indisponível (`503`, `no-store`), nunca exibe snapshot
  vencido. Falha de VOD não apaga o último snapshot válido.
- `syncTwitchLiveIfDue()` usa janela nominal de 10 min entre consultas a `helix/streams`, com
  tolerância intencional de até 2 min para latência/alinhamento do Cron. `twitch:live` tem TTL de
  30 min e não pode ser servido como válido após 20 min sem atualização.
- Snapshot e `updated_at` ficam no binding KV `RANKINGS`. `TWITCH_CLIENT_SECRET` nunca entra no
  frontend nem no Git.
- App Access Token: reutilizado enquanto válido e revalidado em `/oauth2/validate` em intervalos
  menores que 1 h; qualquer `401` do Helix invalida o token local e permite **no máximo um** retry
  imediato com token novo. `twitch:user_id`/`twitch:user_login` valem no máximo 24 h, com TTL no KV.
- Variáveis: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_CHANNEL_LOGIN` e, opcionalmente,
  `TWITCH_MAX_VIDEOS`.

### Ranking de doações

- **Identidade:** `donation.name` é um **identificador de exibição autodeclarado e não
  autenticado**, não um "nome verificado". Pessoas diferentes podem usar o mesmo texto e o ranking
  agrega textos idênticos por design. Totais internos usam objetos sem protótipo antes de usar
  identificadores como chaves.
- **Estado atômico:** `ledger:v1` é a fonte primária de `lastId`, `month`, `global` e `monthly`;
  não volte a `totals:*`/`state:*` quando o ledger existir. A migração do legado é montada em
  memória e o primeiro `ledger:v1` só é gravado depois que a consulta à Streamlabs termina com
  sucesso. Persista primeiro o ledger e depois snapshots/espelhos; se uma escrita derivada falhar,
  a execução seguinte reconstrói sem dupla contagem. `totals:global`, `totals:monthly`,
  `state:last_donation_id` e `state:current_month` ficam como espelhos de compatibilidade (não
  apague, não trate como transação). `ledger:v1` corrompido **falha fechado**, sem fallback
  silencioso ao legado.
- **Fuso:** a chave mensal usa explicitamente `America/Sao_Paulo`; não volte a
  `getUTCFullYear()`/`getUTCMonth()`. O mesmo `monthKey()` classifica o instante atual e o
  `created_at` de cada doação.
- **Paginação:** limitada a 50 páginas por sincronização; falha fechado se o cursor `before` não
  avançar; nunca persista resultado parcial.
- **Anonimização:** feita no Worker por `RANKING_PRIVATE_NAMES` (nomes separados por vírgula,
  sem distinguir maiúsculas/minúsculas, ignorando espaços nas extremidades) e, opcionalmente,
  `RANKING_PRIVACY_LABEL` (padrão `"Anônimo"`), aplicada em `handleRanking()` antes da resposta
  pública; os snapshots do KV preservam os nomes originais.
- **Testes:** `worker-ranking.test.mjs` e `worker-robustness.test.mjs` usam a implementação real de
  `workers.js` carregada só em memória; **não** adicione exports, rotas ou flags de teste ao Worker
  de produção. Antes de alterar persistência, deduplicação, paginação, privacidade ou virada
  mensal, atualize/adicione o teste correspondente.

---

## 8. Segurança

- **CSP mínima** via `<meta http-equiv="Content-Security-Policy">` em toda página HTML pública,
  validada por `validate-content.py`. Ao adicionar um host usado por `fetch`, imagens, fontes ou
  outros recursos, atualize a política deliberadamente.
  - Não adicione `frame-ancestors` (exige cabeçalho HTTP) nem `upgrade-insecure-requests` (o
    repositório deve continuar testável por HTTP local).
  - Não reintroduza `unsafe-inline`. Não use atributos `style=` nem handlers `on*=` nos HTMLs.
  - `data:` é permitido apenas em `img-src` (favicon PNG gerado em Canvas), nunca em `script-src`.
- Páginas que carregam `js/core/footer.js` carregam `js/core/sanitize.js` **antes** dele; use o
  `escapeHtml` compartilhado, sem cópias locais.
- Textos editoriais entram por `textContent`.
- Páginas HTML aninhadas resolvem assets locais a partir da localização real do documento
  (`../css`, `../js`) ou por caminho absoluto; o validador percorre todo `*.html` versionado.
- Secrets de Trello e Steam existem somente no GitHub Actions.

## 9. Privacidade e conformidade

- Identificação pública: **Kamyli Souza** (nome social); canal `contato@kamylisumire.com`. Não
  adicione nome civil, e-mail pessoal de destino, endereço, telefone ou documentos ao repositório.
- O ranking publica somente o identificador e o valor acumulado necessários à finalidade; não o
  enriqueça com outras bases nem infira identidade civil. Uma contestação plausível pode levar o
  identificador público a **Anônimo** (`RANKING_PRIVATE_NAMES`), sem alterar valor/posição e sem
  reconhecer o solicitante como titular das contribuições.
- Nunca forneça, corrija ou exclua registros internos só porque o solicitante conhece ou usa o
  mesmo identificador exibido. Pedidos formais exigem avaliação proporcional; não colete documento
  civil por padrão. Detalhes em [`docs/PRIVACIDADE-RANKING.md`](docs/PRIVACIDADE-RANKING.md).
- O aviso de privacidade do ranking permanece **próximo da funcionalidade**, não apenas na Política.
- Mudanças em integrações, armazenamento local, mídia externa ou dados públicos devem ser
  refletidas na Política de Privacidade (que fica centrada nas informações relacionadas ao
  usuário: dados tratados, finalidades, armazenamento no navegador, integrações, retenção,
  escolhas e solicitações).
- **Uso de IA:** a política proíbe o uso de conteúdos e assets próprios do site para treinamento,
  fine-tuning, desenvolvimento, avaliação ou aprimoramento de sistemas de IA. Não introduza texto
  que apresente autorização excepcional sem decisão editorial explícita. Distinga claramente
  conteúdo de terceiros e código com licença própria dos assets autorais. `robots.txt` é sinalização
  complementar para crawlers de IA conhecidos: não o descreva como bloqueio técnico absoluto.

## 10. Acessibilidade, contraste e preferências

- Todas as páginas têm `.skip-link` como primeiro controle focável após `<body>`, apontando para
  o `<main>` com `tabindex="-1"`. Não troque IDs de runtime só para padronizar o alvo.
- Grades de resultados **não** usam `aria-live`. Artes e Jogos anunciam mudanças por uma região
  `.sr-only` com `role="status"`, `aria-live="polite"` e `aria-atomic="true"`, com mensagens
  curtas e quantitativas (sem reproduzir títulos/cards).
- Diálogos modais usam `<dialog>` nativo com nome acessível (`aria-labelledby`), botão de fechar rotulado,
  foco inicial dentro do diálogo e devolução do foco ao controle que o abriu (ver o popup de Jogos).
- **Cor:** `--primary-color` é a cor de marca (títulos grandes, ícones, bordas, decoração);
  `--primary-text` é para texto normal/pequeno (no tema claro tem contraste AA; no escuro é o mesmo
  tom). Superfícies de ação preenchidas (CTAs, filtros/abas ativos, seletores) usam
  `--button-bg`, `--button-bg-hover` e `--button-text`, nunca `--primary-color` + texto branco.
  Os tokens de ação existem nos temas claro, escuro explícito e fallback `prefers-color-scheme`,
  com contraste mínimo de 4,5:1. Galeria e Blog mantêm os títulos principais em `--primary-color`.
  Cobertura: `color-contrast.test.mjs`.
- Estruturas protegidas por teste: `accessibility-semantics.test.mjs` (skip links, alvos focáveis,
  `.skip-link`/`.sr-only`, anúncios curtos).
- Blog e Galeria mantêm a mesma ordem estrutural das ferramentas: filtros/tags primeiro, busca +
  seletor depois (filtros à esquerda e busca à direita no desktop; filtros acima da busca no mobile).

## 11. SEO e publicação

Preserve: canonical, Open Graph, Twitter Cards, JSON-LD, `robots.txt`, `sitemap.xml`, `CNAME` e o
`noindex` do preview Cloudflare Pages (`_headers`).

- `/artes/` só é `index, follow` e entra no sitemap quando `artes.json` tem ao menos um item;
  vazia, fica `noindex, follow` e fora do sitemap.
- `/blog/` segue a mesma regra com `posts.json`: ao menos um post com `published: true`
  (rascunhos não contam). A rota continua **acessível** mesmo vazia.
- A CI aplica essas regras automaticamente: ao surgir o primeiro item, ela passa a exigir
  `index, follow` **e** a entrada no `sitemap.xml`, então atualize ambos no mesmo patch.
- Não troque `robots` via JavaScript: meta robots e sitemap são artefatos estáticos validados contra
  os JSONs editoriais.
- `sitemap.xml` não tem `lastmod` manual (só voltaria com fonte automatizada e confiável). A CI exige
  as rotas estáveis, cruza Blog/Galeria com o conteúdo publicado e rejeita URLs obsoletas.
- `/jogos/`, `/privacidade/` e `/uso-de-ia/` mantêm canonical + `index, follow`.

## 12. CI e testes

- Jobs versionados em `.github/workflows/` mantêm `timeout-minutes` explícito: 10 min na validação,
  20 min nos syncs editoriais.
- `actions/checkout` fica fixado no SHA completo da v4.2.2; não volte a `@v4` ou `@main` sem
  atualização revisada do pin.
- A validação tem `permissions: contents: read` e `persist-credentials: false`; os syncs têm
  `contents: write` e preservam credenciais para o `git push`.
- Validações da mesma ref cancelam execuções obsoletas; Jogos e Agenda ficam no grupo
  `editorial-sync-${{ github.ref }}` com `cancel-in-progress: false` (não se interrompe uma
  publicação em andamento), sem force push e com `git pull --rebase` antes do push.
- `node --test .github/tests/*.test.mjs` descobre os testes automaticamente: um novo `*.test.mjs`
  entra na CI sem editar o YAML.
- Todo script `.mjs` de sincronização passa por `node --check` na CI.
- Docs em `docs/` são conferidas pelo validador (arquivos obrigatórios e lista permitida):
  ao criar, renomear ou remover um arquivo de `docs/`, atualize `REQUIRED_FILES` e `ALLOWED_DOCS`
  em `.github/scripts/validate-content.py`.
