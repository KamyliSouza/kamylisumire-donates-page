# Arquitetura

O site é estático e não possui build. Este documento descreve **como as peças se
encaixam**; regras de manutenção estão em [`AGENTS.md`](../AGENTS.md), configuração e
deploy em [`PRODUCAO.md`](PRODUCAO.md).

## 1. Visão geral

```text
Visitante (navegador)
├─ Páginas estáticas (GitHub Pages, branch main)
│  ├─ /            Home ........ data/content/*.json, data/agenda.json
│  │                             └─ Lives: Twitch ─► /twitch/videos ─► snapshot KV
│  │                                       YouTube ─► lives.json (local)
│  │                             └─ Hero:  /twitch/live ─► snapshot KV
│  ├─ /agenda/    Agenda ...... data/agenda.json + jogos-artwork.json
│  ├─ /jogos/     Jogos ....... jogos.json + jogos-config.json
│  ├─ /artes/     Galeria ..... artes.json + imagens HTTPS externas
│  ├─ /blog/      Blog ........ data/blog/*
│  ├─ /doacoes/   Doações ..... doacoes.json + ranking ─► API
│  └─ /privacidade/, /uso-de-ia/, 404 (HTML estático)
└─ API pública: https://api.kamylisumire.com  (Cloudflare Worker + KV)
   ├─ Streamlabs (OAuth + doações)
   └─ Twitch (Helix: VODs e status ao vivo)

GitHub Actions (fora do navegador)
├─ validate-json.yml ... validação, sintaxe e testes
├─ sync-agenda.yml ..... Trello ─► data/agenda.json
└─ sync-jogos.yml ...... Trello + Steam ─► data/content/jogos*.json
```

Princípios de disponibilidade:

- O backend **não** determina a disponibilidade geral da Home: se a API falhar, apenas a aba Twitch e
  o status ao vivo ficam indisponíveis; Hero padrão, Agenda, Regras, Créditos, Blog e a aba YouTube
  continuam funcionando.
- Galeria, Blog, Agenda, Jogos, Privacidade e Uso de IA **não executam o Worker nem leem KV**.
- Trello e Steam só são consultados pelos syncs no GitHub Actions.

## 2. JavaScript

### `js/core/` — infraestrutura global

| Arquivo | Responsabilidade |
| --- | --- |
| `config.js` | Configuração compartilhada (API, caminho GitHub Pages `KAMYLI_SITE_PATH`). Não carrega módulos de páginas. |
| `preferences.js` | Tema, blur, perfil adaptativo, modo leitura e remoção programada do cache do ranking. |
| `content.js` | Carrega JSONs editoriais, aplica textos/SEO runtime e mantém os fallbacks espelhados. |
| `button-icons.js` | Biblioteca allowlisted de ícones (`KamyliButtonIcons`). Único ponto de entrada de ícones para JSON. |
| `buttons.js` | Aplica texto/ícone aos elementos `[data-button-key]` a partir de `buttons.json`. |
| `sanitize.js` | `escapeHtml` e `safeHttpUrl` compartilhados. Deve carregar antes de `footer.js`. |
| `navbar.js` / `footer.js` | Navbar e Footer compartilhados. |
| `mobile-overlay.js` | Coordenador único dos overlays mobile (`menu`, `socials`, `settings`). |
| `socials.js` | Dock/cápsula de redes sociais (lê `redes.json`). |
| `settings.js` | Botão de engrenagem e painel de Configurações (montado em `<body>`). |
| `external-links.js` | Confirmação global de navegação externa, por delegação de eventos. |
| `page-transitions.js` / `loader.js` | Transição entre páginas e loader (com fail-safe de 6 s). |
| `horizontal-scroll.js` | Faixas horizontais compartilhadas: click + arrasta com mouse/caneta, touch nativo. |
| `favicon.js` | Favicon adaptativo ao tema, com fallback para os arquivos originais. |
| `api.js` | Cliente do Worker (`KamyliAPI`), com timeout e fallback de transporte. Usado por Doações e pela Twitch da Home. |

### `js/pages/<página>/`

| Pasta | Conteúdo |
| --- | --- |
| `home/` | `content.js` (conteúdo e composição de cards), `home.js` (Agenda da Home), `lives.js`, `twitch-live.js`, `carousel.js`, `home-interactions.js` (coração dos CTAs e click + arrasta) |
| `agenda/` | `agenda-model.js` (regras puras, testável em Node) e `agenda.js` (DOM) |
| `artes/` | `artes.js` (grade, busca, lightbox) |
| `blog/` | `blog.js` (listagem e busca) |
| `jogos/` | `jogos.js` (catálogo, filtros, paginação) |
| `doacoes/` | `content.js`, `doacoes.js`, `ranking.js` (apenas aqui) |

## 3. Páginas e fluxos de dados

### Home

Majoritariamente local. Importa `api.js` apenas para a Twitch (aba Lives e Hero); isso não é requisito
para os demais cards.

**Composição.** `data/content/home-cards.json` (`version: 1`, até 24 cards) descreve a composição.
`js/pages/home/content.js` carrega esse contrato com os demais JSONs, renderiza primeiro os componentes
nativos e só então aplica ordem, visibilidade, tamanho e variante. Os nativos são **movidos** no DOM
(não clonados), preservando IDs e integrações. Cards `personalizado` são construídos com DOM seguro e
`textContent`, com ícones da allowlist. Os sete tipos nativos (`hero`, `lives`, `agenda`, `blog`,
`regras`, `creditos`, `apoio`) são obrigatórios exatamente uma vez e usam ID igual ao tipo; aceitam só
`visivel`, `tamanho` e `variante`. Não existe campo editorial para HTML, SVG, imagem, CSS ou cor.
`home-cards.json` é apresentação, não uma segunda fonte de verdade do conteúdo.

**Lives.** O mesmo componente tem duas abas:

1. **Twitch (padrão):** últimas VODs servidas pelo Worker a partir do KV;
2. **YouTube:** lista manual de `data/content/lives.json` (sem player, iframe ou YouTube Data API).

**Hero ao vivo.** O Hero consulta `/twitch/live`. Online, mostra `Sobre | Ao vivo`, anel no avatar e
selo `AO VIVO` acoplado à borda; offline, erro ou snapshot vencido mantêm o Hero padrão.

**Página independente de transmissão.** Não há rota `/live/` nem player/chat incorporados no site. O visitante assiste aos vídeos e às transmissões abrindo os links oficiais da Twitch ou do YouTube apresentados pela Home. A API da Twitch continua sendo usada somente no servidor para os snapshots públicos e, pela Home, para a lista de VODs e o status do Hero.

**Navegação por hash.** `/#secao` aguarda `kamyli:site-revealed`, anima até a seção e estabiliza a
posição durante mudanças posteriores de layout (`navbar.js`). `content.js` e `buttons.js` observam
montagem tardia (Navbar, Footer e diálogo externo são criados por módulos separados), mas só
reaplicam conteúdo quando os mounts relevantes aparecem.

### Agenda e Jogos

Alimentadas pelos syncs do Trello (ver [`AGENDA-E-JOGOS.md`](AGENDA-E-JOGOS.md)).

- `/agenda/` combina `data/agenda.json` com `data/content/jogos-artwork.json` em `agenda-model.js` e
  desenha em `agenda.js`. A Home mostra a mesma agenda no carrossel `#agenda`.
- `/jogos/` lê `jogos.json` e `jogos-config.json` (paginação).
- Os ícones da Steam na Agenda reutilizam o que o sync de Jogos já resolveu; a Agenda não consulta a Steam.

### Galeria de Artes

`artes.json` + imagens HTTPS direto do host configurado. A grade usa só `preview`; a `imagem` full é
requisitada sob demanda ao abrir a obra. A grade mostra título e artista; o resto está no dialog.

A busca é inteiramente no navegador, com escopo explícito por campo — **Todos, Artista, Título,
Categoria, Tags** — e prefixos no texto (`artista:`/`artist:`, `titulo:`, `categoria:`, `tag:`/`tags:`)
que têm precedência sobre o seletor. O Blog segue a mesma convenção com **Todos, Título, Resumo, Tags**
e `titulo:`, `resumo:`, `tag:`/`tags:`. A comparação ignora maiúsculas e acentos. A funcionalidade usa só
metadados existentes e não altera contratos JSON/Markdown.

### Blog

Estático e textual. Fonte em Markdown (`data/blog/posts/<slug>.md`), índice leve em `posts.json`,
configuração em `config.json` e HTML estático por post em `blog/<slug>/index.html` (gerado pelo Helper).
Veja [`data/blog/README.md`](../data/blog/README.md).

### Doações

LivePix, Pixie e ranking. O ranking tem cache local no navegador de no máximo **30 minutos**;
`preferences.js` agenda a remoção e a repete em `pageshow`, foco/visibilidade e mudanças de storage.
Cache vencido nunca é fallback: sem cache fresco e com falha remota, a interface informa
indisponibilidade. Ordem dos endpoints: `api.kamylisumire.com` e, só se houver falha de transporte,
`workers.dev`.

## 4. Navegação global

**Navbar editorial.** `data/content/navbar.json` (`version: 2`) é a fonte única dos nove itens
(`inicio`, `lives`, `agenda`, `artes`, `blog`, `jogos`, `regras`, `creditos`, `apoio`), cada um com
`texto`, `icone` e `url`; `ordem` define a sequência e `apoioFixoNoFim` escolhe onde Apoiar fica. O
runtime mantém **um único nó** `apoio` e o move entre `.site-nav-support-wrap` (modo fixo) e
`.site-nav-links` (modo livre). A URL é validada/normalizada antes de ser aplicada e o ícone vem só da
allowlist.

**Mobile.** Até 767 px, `navbar.js` não duplica links: os mesmos nós editoriais de `.site-nav-links` são
reparentados para um drawer (`.site-nav-mobile-panel`) dentro de `.site-nav-mobile-layer`, **irmã** de
`.site-nav` (para escapar do containing block criado por `backdrop-filter`). `content.js` consulta
`#site-navbar` como raiz para que `navbar.json` continue alcançando esses nós. Apenas o CTA fixo do rodapé
é clonado e ressincronizado após `kamyli:global-ui-ready`. Como a camada está fora de `.site-nav`, sua
visibilidade durante o loader é controlada por seletores em `html.site-loading-*`.

**Overlays.** `mobile-overlay.js` registra providers por nome (`menu`, `socials`, `settings`) e centraliza
exclusão mútua, History API, `popstate`, `Escape`, estado raiz e detecção conservadora de teclado virtual.
`navbar.js`, `socials.js` e `settings.js` expõem só operações locais de abrir/fechar/focar. A troca entre
overlays usa `replaceState` na entrada temporária existente; entradas são associadas a um identificador por
documento e descartadas em inicialização, `pagehide` e restauração BFCache.

**Configurações.** `settings.js` monta a engrenagem no slot `#site-nav-settings-slot` e o painel em
`<body>`; depende de `preferences.js`, `mobile-overlay.js` e `navbar.js`.

## 5. Backend (Cloudflare Worker)

`workers.js` é isolado da Home e é a origem de `api.kamylisumire.com`.

| Rota | Acesso | Função |
| --- | --- | --- |
| `/` | público | Ranking (mensal e geral) |
| `/twitch/videos` | público | Snapshot das últimas VODs |
| `/twitch/live` | público | Status ao vivo |
| `/oauth/authorize` | Bearer ou `?key=` | Início do OAuth Streamlabs (cria `state` v2 assinado + nonce no KV) |
| `/oauth/callback` | Streamlabs | Valida e consome o `state` antes de trocar o `code` |
| `/debug/status` | Bearer | Diagnóstico |
| `/debug/sync` | Bearer | Sincronização manual do ranking |
| `/debug/twitch-sync` | Bearer | Inicializa/sincroniza VODs (renovável após 20 h) |
| `/debug/twitch-live-sync` | Bearer | Sincroniza status ao vivo (`?force=1` opcional) |

Comportamento geral:

- Roteamento explícito: caminho desconhecido → `404` sem tocar KV; método ≠ `GET`/`OPTIONS` → `405`.
- Ranking, `/twitch/videos` e `/twitch/live` usam Cache API (chaves canônicas sem query) antes do KV;
  o KV (`RANKINGS`) é a fonte persistente. `/twitch/live` usa Cache API por 60 s.
- `scheduled()` (Cron a cada 10 min) roda o ranking e as rotinas Twitch. A consulta real a `helix/streams`
  só ocorre aqui (e no debug), em janela nominal de 10 min com tolerância de até 2 min.
- Estados internos consolidados: `tokens:streamlabs_state`, `twitch:app_access_token_state`,
  `twitch:user_state`; chaves antigas são aceitas só como migração automática, sem reautorizar OAuth.
- O ranking usa `ledger:v1` como fonte primária e mantém `totals:*`/`state:*` como espelhos.
- O App Access Token da Twitch é validado em `/oauth2/validate` e `user_id`/login têm retenção máxima
  de 24 h no KV.

Variáveis e segredos: [`PRODUCAO.md`](PRODUCAO.md). Invariantes: seção "Worker" de
[`AGENTS.md`](../AGENTS.md).

## 6. Segurança no frontend

Toda página HTML versionada usa CSP mínima via `<meta http-equiv="Content-Security-Policy">`, compatível
com hospedagem estática: restringe scripts, estilos, conexões, objetos, formulários e frames carregados pela
própria página, com hashes SHA-256 para blocos inline (sem `unsafe-inline`). `frame-ancestors` não faz parte
da CSP porque só funciona como cabeçalho HTTP; proteção contra embedding deve ser configurada no host que
controla os response headers. `upgrade-insecure-requests` é omitido de propósito para manter o repositório
testável por HTTP local (produção já é HTTPS).

Textos editoriais entram por `textContent` e URLs vindas de JSON/API passam por
`KamyliSanitize.safeHttpUrl()`.

## 7. Publicação e assets

| Item | Onde |
| --- | --- |
| Produção | branch `main` → GitHub Pages (`CNAME` = `kamylisumire.com`) |
| Preview | branch `site-v2` → Cloudflare Pages; `_headers` aplica `X-Robots-Tag: noindex` a `pages.dev` |
| API | Custom Domain do Worker em `api.kamylisumire.com` |
| Gráficos | `assets.kamylisumire.com` (avatar, favicon, fundo, preview social) |
| Fonte | Nunito local em `assets/fonts/` |
