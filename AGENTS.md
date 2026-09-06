# AGENTS.md — Referência operacional para agentes de IA

Este arquivo descreve o estado atual do projeto e as invariantes que devem ser
preservadas ao editar `main` ou `site-v2`.

## Princípios

- site estático;
- HTML, CSS e JavaScript vanilla;
- sem framework;
- sem bundler;
- sem build obrigatório;
- JSON editorial local;
- CI customizada apenas para validação;
- Worker/OAuth/KV/CORS/DNS são tarefas separadas.

## Ambientes

```text
main
→ GitHub Pages
→ https://kamylisumire.com/

site-v2
→ Cloudflare Pages
→ https://site-v2.kamylisumire-site.pages.dev/
```

`donate.kamylisumire.com` é legado e deve continuar redirecionando com 301
para `https://kamylisumire.com/doacoes/`.

A migração do domínio principal está concluída.

`CNAME` deve conter somente:

```text
kamylisumire.com
```

## Estrutura esperada

```text
/
├── .github/
│   ├── scripts/validate-content.py
│   └── workflows/validate-json.yml
├── assets/
├── css/
│   ├── core/
│   ├── components/
│   └── pages/
├── data/
│   ├── agenda.json
│   └── content/
├── doacoes/index.html
├── docs/
├── js/
│   ├── core/
│   └── pages/
├── index.html
├── 404.html
├── CNAME
├── .nojekyll
├── _headers
├── robots.txt
├── sitemap.xml
└── workers.js
```

Não reintroduzir arquivos temporários de aplicação/migração já consolidados.

## Assets

Avatar atual:

```text
assets/avatar-192.webp
assets/avatar-384.webp
assets/avatar.png
```

`assets/avatar.webp` é legado removido na V40.

Background:

```text
desktop/tablet:
assets/fundo.avif → assets/fundo.webp → assets/fundo.png

mobile <= 760 px:
assets/fundo-mobile.avif → assets/fundo.webp → assets/fundo.png
```

`assets/logo.webp` deve continuar transparente porque é usado como máscara CSS.

`assets/preview.png` continua 1200 × 630 para Open Graph/Twitter.

## CSS

Fonte de verdade visual:

```text
css/core/variables.css
```

Organização:

- `variables.css` — tokens, temas e superfícies;
- `global.css` — base, botões, painéis, footer, background, loader e reveal;
- `navbar.css` — navbar e controles;
- `components/ranking.css` — ranking;
- `pages/*.css` — regras por página.

Preservar CSS modular. Não introduzir bundle/build sem solicitação explícita.

Identidade:

```text
cor primária: #B35EAF
fonte: Nunito
cards: raio 24 px
botões: raio 16 px
blur padrão: 10 px
```

## Preferências e performance

Persistência:

```text
kamyli:ui-theme
kamyli:ui-blur
```

Estados:

```text
data-blur="on|off"
data-blur-mode="auto|manual"
data-blur-preference="auto|on|off"
data-blur-reason="supported|manual|unsupported|reduced-transparency|save-data|low-memory|low-cpu"

data-performance="normal|reduced"
data-performance-reason="standard|save-data|low-memory|low-cpu"
```

O modo automático não usa User-Agent.

Ele considera:

- suporte a `backdrop-filter`;
- `prefers-reduced-transparency`;
- `Save-Data`;
- `deviceMemory <= 2` quando disponível;
- `hardwareConcurrency <= 2` quando disponível.

Não adicionar preload do background decorativo.

## Home

A Home continua independente do Worker.

Arquivos principais:

```text
js/pages/home/home.js
js/pages/home/content.js
css/pages/home.css
data/agenda.json
data/content/hero.json
data/content/home-doacoes.json
data/content/regras.json
data/content/creditos.json
```

Agenda:

- exatamente sete dias;
- IDs domingo → sábado;
- datas `AAAA-MM-DD`;
- `temLive=false` exige `horario`, `titulo` e `descricao` vazios;
- scroll-snap;
- setas, touch, wheel e teclado;
- `prefers-reduced-motion`;
- métricas reutilizadas para evitar reflow repetido;
- renderização agrupada com `DocumentFragment`.

## Doações

`/doacoes/` concentra LivePix, Pixie e ranking.

Arquivos principais:

```text
js/pages/doacoes/doacoes.js
js/pages/doacoes/content.js
js/pages/doacoes/ranking.js
js/core/api.js
css/pages/doacoes.css
css/components/ranking.css
```

Ranking:

- Top 5;
- mensal/todos os tempos;
- cache local de 30 minutos;
- fallback para cache expirado;
- tabs acessíveis por teclado;
- privacidade aplicada em `ranking.js`.

Não mover o ranking para a Home.

## API / Worker

Configuração:

```text
js/core/config.js
js/core/api.js
workers.js
```

Worker, OAuth, tokens, KV, CORS, cron e domínio da API são infraestrutura
separada. Não alterar callback OAuth, secrets ou `useCustomDomain` junto de
mudanças comuns do frontend.

## Navbar

Gerada somente por:

```text
js/core/navbar.js
```

Preservar:

- fixa;
- conteúdo centralizado;
- scroll horizontal mobile;
- Início, Agenda, Jogos, Regras, Créditos e Doações;
- logo via máscara `logo.webp`;
- tema e blur;
- scrollspy;
- rolagem suave;
- `aria-current`;
- acompanhamento automático do item ativo.

Não duplicar a navbar diretamente nos HTMLs.

## Links externos

O aviso global pertence a:

```text
js/core/external-links.js
```

Ele deve interceptar links `http/https` externos, inclusive links inseridos
depois pela leitura dos JSONs.

Exceção:

```html
data-external-warning="skip"
```

## Footer

Gerado por:

```text
js/core/footer.js
```

Conteúdo editável:

```text
data/content/footer.json
```

Créditos essenciais devem continuar com fallback.

## Loader

Home e Doações usam:

```text
js/core/loader.js
```

Fluxo atual:

```text
site-loading-pending
→ após 180 ms, se necessário: site-loading-visible
→ site-revealing
→ site-ready
```

Se o conteúdo local ficar pronto rapidamente, o loader pode nunca aparecer.

Preservar:

- favicon pulsando;
- sem texto visual;
- timeout de segurança;
- `prefers-reduced-motion`;
- não esperar API externa do ranking;
- não carregar background pesado no loader.

A 404 não usa loader.

## 404

Deve:

- permanecer `noindex`;
- funcionar no domínio principal;
- funcionar em URLs aninhadas;
- funcionar em GitHub Pages de projeto;
- carregar preferências, navbar e footer;
- não carregar `api.js`.

## SEO

Indexáveis:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
```

A 404 não entra no sitemap.

Home e Doações mantêm:

- title;
- description;
- robots;
- canonical absoluto;
- Open Graph;
- Twitter/X;
- JSON-LD.

Scrapers sociais não dependem de JavaScript. O Hero visível, `hero.json` e os
metadados sociais devem permanecer sincronizados.

Não adicionar `meta keywords`.

## Preview Cloudflare Pages

`_headers` deve continuar aplicando:

```text
X-Robots-Tag: noindex
```

aos hosts `*.pages.dev`.

## CI customizada

Arquivos:

```text
.github/scripts/validate-content.py
.github/workflows/validate-json.yml
```

A CI deve continuar verificando:

- JSONs e chaves duplicadas;
- esquema da agenda;
- Hero/SEO/preview;
- assets responsivos e AVIF/WebP;
- estados críticos V38/V39;
- `CNAME`;
- `_headers`;
- referências locais em HTML/CSS;
- robots/sitemap;
- 404 `noindex`;
- higiene V40;
- sintaxe de todos os `js/**/*.js`.

A CI valida o repositório, mas não cria bundle nem build do site.

## V41 — fontes e transições

### Nunito local

```text
assets/fonts/nunito-variable.woff2
assets/fonts/OFL.txt
```

`@font-face` fica em `css/core/variables.css`.

Não reintroduzir:

```text
fonts.googleapis.com
fonts.gstatic.com
```

Home, Doações e 404 fazem preload da fonte.

### Home → Doações

Módulo:

```text
js/core/page-transitions.js
```

Só intercepta navegação interna normal da Home para `/doacoes/`.

Não interceptar links externos, hashes, nova aba, downloads nem cliques com
modificadores.

Fluxo:

```text
site-page-leaving
→ navegação real
→ site-page-arriving
→ loader/reveal
→ site-ready
```

A animação é desativada por `prefers-reduced-motion` ou
`data-performance="reduced"`.

### CSS modular

Não usar `css/build/` nem `.github/scripts/build-css.py`.

## V42 — configurações e loader

### Navbar

A navbar não possui mais `themeToggle` ou `blurToggle`.

`Apoiar` fica em `.site-nav-support-wrap`, fora de `.site-nav-links`, para não
rolar junto com os links no mobile.

### Preferências no footer

`js/core/footer.js` renderiza o botão `Configurações` e um popover não modal.

Tema:

```text
auto | light | dark
```

Blur:

```text
auto | on | off
```

Persistência:

```text
kamyli:ui-theme
kamyli:ui-blur
```

`data-theme` continua contendo o tema resolvido (`light|dark`). A preferência
fica em `data-theme-preference` e o modo em `data-theme-mode`.

O menu fecha por botão, Escape ou clique fora e usa radios nativos para
navegação por teclado.

### Loader

Home, Doações e 404 usam o loader V42.

```text
MIN_DISPLAY_MS = 1000
```

O fundo do overlay é transparente. A marca é `assets/logo.webp` via máscara
CSS. O loader pode permanecer além de 1 segundo se o conteúdo local ainda não
estiver pronto, com timeout de segurança.

`prefers-reduced-motion` e `data-performance="reduced"` removem somente a
pulsação; não removem o tempo mínimo solicitado.

## V42.1 — loader e blur

O loader deve seguir a configuração resolvida de blur do site:

```text
data-blur="on"
→ background var(--card-bg)
→ backdrop-filter blur(var(--blur-card))

data-blur="off"
→ background var(--card-bg)
→ sem backdrop-filter
```

Não voltar a usar fundo totalmente transparente nem uma cor fixa independente
dos tokens de tema.

## V42.4 — fundo mobile

Para `max-width: 760px`, preservar:

```text
body::before
→ position: fixed
→ fundo-mobile.avif
→ center / cover
```

O `body` não deve carregar simultaneamente a mesma imagem no perfil normal.

Fallbacks:

```text
data-performance="reduced"
→ remover a camada fixa
→ usar background mobile rolável no body

data-performance-reason="save-data"
→ nenhuma imagem decorativa
```

Desktop não deve ser alterado por esta regra.

