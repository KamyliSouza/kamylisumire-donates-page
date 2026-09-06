# AGENTS.md — Referência operacional para agentes de IA

Este arquivo descreve o estado atual do projeto em produção e as regras que devem ser preservadas por qualquer agente que edite `main` ou `site-v2`.

## Objetivo

O projeto é um site estático, modular e sem framework.

URLs-alvo:

- `https://kamylisumire.com/` → Home;
- `https://kamylisumire.com/doacoes/` → Doações;
- `https://donate.kamylisumire.com` → 301 permanente para `https://kamylisumire.com/doacoes/`.

Branches:

- `main` → produção no GitHub Pages;
- `site-v2` → desenvolvimento/preview no Cloudflare Pages.

Não introduza framework, bundler ou build obrigatório sem solicitação explícita.

## Estado de produção

A migração para o domínio principal está concluída.

```text
kamylisumire.com          → produção
donate.kamylisumire.com  → 301 para /doacoes/
site-v2...pages.dev       → preview noindex
```

O arquivo `CNAME` da `main` deve conter somente:

```text
kamylisumire.com
```

Não tratar a migração do domínio principal como tarefa pendente.

## Estrutura atual

```text
/
├── .github/workflows/validate-json.yml
├── assets/
│   ├── avatar-192.webp
│   ├── avatar-384.webp
│   ├── avatar.webp
│   ├── avatar.png
│   ├── favicon.webp
│   ├── favicon.png
│   ├── fundo.avif
│   ├── fundo-mobile.avif
│   ├── fundo.webp
│   ├── fundo.png
│   ├── logo.webp
│   └── preview.png
├── css/
│   ├── core/
│   │   ├── variables.css
│   │   ├── global.css
│   │   └── navbar.css
│   ├── components/ranking.css
│   └── pages/
│       ├── 404.css
│       ├── home.css
│       └── doacoes.css
├── data/
│   ├── agenda.json
│   └── content/
│       ├── README.md
│       ├── hero.json
│       ├── home-doacoes.json
│       ├── regras.json
│       ├── creditos.json
│       ├── doacoes.json
│       ├── ranking.json
│       └── footer.json
├── doacoes/index.html
├── js/
│   ├── core/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── content.js
│   │   ├── preferences.js
│   │   ├── navbar.js
│   │   ├── external-links.js
│   │   ├── footer.js
│   │   └── loader.js
│   └── pages/
│       ├── home/
│       │   ├── home.js
│       │   └── content.js
│       └── doacoes/
│           ├── doacoes.js
│           ├── content.js
│           └── ranking.js
├── 404.html
├── index.html
├── CNAME
├── .nojekyll
└── workers.js
```

## Responsabilidades

### Core

- `variables.css` → tokens, claro/escuro e superfícies;
- `global.css` → base, botões, painéis, footer e loader;
- `navbar.css` → navegação e controles;
- `config.js` → caminhos/configuração;
- `api.js` → backend;
- `content.js` → JSON editorial;
- `preferences.js` → tema e blur adaptativo com override manual;
- `navbar.js` → navbar;
- `external-links.js` → confirmação global de links externos;
- `footer.js` → footer;
- `loader.js` → preloader das páginas principais e coordenação da entrada suave pós-loader.

### Home

A Home usa `home.js`, `home.css`, `data/agenda.json` e `data/content/*`.

Ela não depende do Worker para funcionar e não deve carregar `api.js` sem necessidade real.

### Doações

`/doacoes/` concentra LivePix, Pixie e ranking.

Somente páginas que precisam do backend devem carregar `api.js`.

## Conteúdo editável

Agenda:

```text
data/agenda.json
```

Textos:

```text
data/content/
```

Use:

```js
KamyliContent.getJSON("/data/content/arquivo.json")
```

Não mover para JSON:

- endpoint do Worker;
- OAuth/secrets;
- rotas técnicas;
- chaves de cache;
- lógica JavaScript.

Os JSONs são validados por `.github/workflows/validate-json.yml`.

## Agenda

`js/pages/home/home.js` controla o carrossel.

Regras atuais:

- sete dias;
- scroll-snap;
- setas sobrepostas;
- animação suave;
- touch/trackpad/teclado;
- cards crescem com o conteúdo;
- status no canto superior direito;
- data e hora juntas.

A agenda continua local e não deve ser movida para o Worker sem autorização explícita.

## Regras e Créditos

Arquivos:

```text
data/content/regras.json
data/content/creditos.json
```

Até cinco itens: crescimento normal.

Mais de cinco: scroll interno automático.

## Design e preferências

Fonte de verdade:

```text
css/core/variables.css
```

Identidade:

```text
#B35EAF
Nunito
24px cards
16px botões
10px blur padrão
```

Preferências:

```text
kamyli:ui-theme
kamyli:ui-blur
```

Blur:

- ausência de `kamyli:ui-blur` → modo automático;
- `kamyli:ui-blur=on` → override manual ligado;
- `kamyli:ui-blur=off` → override manual desligado;
- o automático não usa sniffing de User-Agent;
- verifica suporte a `backdrop-filter`, `prefers-reduced-transparency`, `saveData`, memória e quantidade de threads quando essas APIs existem;
- thresholds atuais: `deviceMemory <= 2` e `hardwareConcurrency <= 2`;
- preferência manual prevalece sobre heurísticas, exceto quando o navegador não suporta o filtro.

O estado aplicado é exposto em:

```text
data-blur="on|off"
data-blur-mode="auto|manual"
data-blur-preference="auto|on|off"
data-blur-reason="supported|manual|unsupported|reduced-transparency|save-data|low-memory|low-cpu"
```

Não trocar esse mecanismo por detecção de Android/iPhone ou largura de tela.

Performance adaptativa:

```text
data-performance="normal|reduced"
data-performance-reason="standard|save-data|low-memory|low-cpu"
```

Regras:

- `Save-Data` pode omitir somente a imagem decorativa do fundo;
- `deviceMemory <= 2` ou `hardwareConcurrency <= 2` → `background-attachment: scroll`;
- o perfil de performance é independente de `kamyli:ui-blur`;
- o background deve manter ordem `fundo.avif → fundo.webp → fundo.png`;
- não adicionar preload ao fundo decorativo;
- o loader não deve carregar `fundo.avif`, `fundo.webp` ou `fundo.png`.

Não criar paletas independentes por página.

## Navbar

Gerada somente por `js/core/navbar.js`.

Estado atual:

- fixa;
- centralizada no desktop;
- scroll horizontal no mobile;
- links diretos: Início, Agenda, Jogos, Regras, Créditos, Doações;
- scrollspy;
- rolagem animada para seções;
- `logo.webp` como máscara em `--primary-color`;
- toggle de tema;
- toggle de blur com gota SVG.

Não duplicar navbar em HTMLs.

## Links externos

O aviso de redirecionamento é global e pertence a:

```text
js/core/external-links.js
```

Ele intercepta qualquer link `http/https` cujo `origin` seja diferente do site atual, inclusive links inseridos dinamicamente por JSON.

Isso inclui, por exemplo:

- Trello;
- redes sociais;
- LivePix;
- Pixie;
- Créditos;
- GitHub;
- links do Footer.

Links internos não exibem aviso.

Para uma exceção intencional futura, usar:

```html
data-external-warning="skip"
```

Não reimplementar o modal em páginas ou componentes individuais.

## Footer

Gerado por `js/core/footer.js`.

Conteúdo editável em `data/content/footer.json`.

Créditos obrigatórios com fallback:

- fundo → `@h0wl_oficial`;
- avatar → `@maililac`.

## Loader

Home e Doações usam `js/core/loader.js`.

O loader:

- usa `favicon.webp` pulsando;
- não mostra texto visual;
- respeita `prefers-reduced-motion`;
- possui timeout;
- não espera a API externa do ranking.

A 404 não precisa usar loader.

## 404

A 404 deve:

- carregar preferências, navbar e footer;
- não carregar `api.js`;
- usar `noindex`;
- funcionar em URLs aninhadas;
- funcionar em GitHub Pages de projeto.


## Preview social

Home e Doações possuem metadados estáticos Open Graph e Twitter/X no `<head>`.

### Home

A preview deve espelhar os textos do Hero:

```text
Oiê! Eu sou a Kamyli ✨

Faço lives de joguinhos enquanto troco uma ideia com você.
Por aqui você encontra minha agenda, minhas redes e todas as
formas de acompanhar o conteúdo.
```

Imagem:

```text
https://kamylisumire.com/assets/preview.png
```

### Doações

Manter os textos históricos da preview da branch `main`:

```text
Apoie a Kamyli Sumire ✨
Escolha entre LivePix ou Pixie para apoiar as lives!
```

### Importante

Scrapers sociais normalmente não executam JavaScript.

Por isso os textos da preview da Home são duplicados estaticamente no
`index.html`, mesmo que o Hero também exista em `data/content/hero.json`.

Ao alterar o título ou descrição do Hero, atualizar também os metadados
Open Graph/Twitter da Home.


## SEO e indexação

Arquivos de raiz:

```text
robots.txt
sitemap.xml
CNAME
```

URLs indexáveis atuais:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
```

A 404 deve permanecer `noindex` e não deve entrar no sitemap.

Home e Doações devem manter:

- `title` específico;
- `meta description`;
- `meta robots`;
- canonical absoluto;
- Open Graph/Twitter;
- JSON-LD coerente com o conteúdo visível.

A Home usa `WebSite` + `Person`.

Doações usa `WebPage`.

Não adicionar `meta keywords`; ela não faz parte da estratégia.

Quando uma nova página pública for criada, avaliar se deve entrar no
`sitemap.xml`.


## Proteção SEO dos previews Cloudflare Pages

A raiz do projeto contém:

```text
_headers
```

Esse arquivo adiciona:

```text
X-Robots-Tag: noindex
```

aos hosts:

```text
https://:project.pages.dev/*
https://:version.:project.pages.dev/*
```

Objetivo:

- impedir indexação do domínio padrão `*.pages.dev`;
- impedir indexação de deployments/aliases de preview;
- evitar conteúdo duplicado com `https://kamylisumire.com`.

O GitHub Pages não interpreta `_headers` como configuração especial, então
essa proteção não adiciona `noindex` ao domínio principal.

Não colocar os domínios `pages.dev` em:

- `sitemap.xml`;
- canonical;
- Search Console como URLs de produção.

## Validação automática V33

O workflow `.github/workflows/validate-json.yml` executa:

```text
.github/scripts/validate-content.py
```

Ele valida:

- todos os JSONs sem chaves duplicadas;
- esquema semântico da agenda;
- datas em `AAAA-MM-DD`;
- sete dias/IDs esperados;
- coerência de `temLive`;
- Hero sincronizado com fallback HTML, SEO e social preview;
- `CNAME = kamylisumire.com`;
- presença de `_headers` com `noindex` para previews.

Não enfraquecer essas checagens sem motivo explícito.

## Acessibilidade da navegação e ranking

A navbar deve manter `aria-current` no destino ativo:

- `page` em `/doacoes/`;
- `location` na seção ativa da Home.

A 404 não deve marcar Início como página/seção atual.

As abas do ranking usam o padrão ARIA de tabs:

- `role=tablist`;
- `role=tab`;
- `aria-selected`;
- `aria-controls`;
- `role=tabpanel`;
- roving `tabindex`;
- ArrowLeft/ArrowRight/ArrowUp/ArrowDown/Home/End.


## Assets e performance (V34)

Assets preferenciais:

```text
assets/avatar-192.webp
assets/avatar-384.webp
assets/favicon.webp
assets/fundo.avif
assets/fundo-mobile.avif
assets/fundo.webp
assets/logo.webp
```

Fallbacks PNG permanecem no repositório para compatibilidade.

Regras:

- Home e Doações usam `srcset` com `avatar-192.webp` e `avatar-384.webp`, mantendo `avatar.png` como fallback;
- background usa `image-set()` com `fundo.webp` e `fundo.png`;
- navbar usa `logo.webp` como máscara em `--primary-color`;
- loader usa `favicon.webp` como máscara;
- `preview.png` continua dedicado à social preview;
- não reintroduzir preload do background decorativo sem medição que justifique.

O loader não deve esperar `window.load`; deve liberar após DOM + conteúdo
local necessário estarem prontos, mantendo timeout de segurança.

## API / Worker — invariantes críticos

`workers.js` é infraestrutura.

Não fazer sem autorização explícita:

- recriar Worker;
- recriar KV `RANKINGS`;
- alterar OAuth;
- alterar `REDIRECT_URI`;
- desativar `workers.dev`;
- alterar CORS;
- expor secrets;
- hardcodar endpoint em páginas.

Backend deve ser acessado por `KamyliAPI`.

Migração futura para `https://api.kamylisumire.com` deve usar o mesmo Worker e ser uma tarefa separada.

## Caminhos

Para links gerados por JavaScript:

```js
KAMYLI_SITE_PATH("/rota/")
```

Isso preserva domínio customizado, Cloudflare Pages e GitHub Pages de projeto.

## Responsividade

Desktop:

```css
width: min(1120px, calc(100% - 32px));
```

Mobile:

```css
width: min(100% - 24px, 1120px);
```

`/doacoes/` segue a mesma largura-base da Home.

No mobile, o fundo usa `background-attachment: scroll` por desempenho.

## Nova página

Exemplo `/sorteio/`:

```text
sorteio/index.html
css/pages/sorteio.css
js/pages/sorteio/sorteio.js
```

Carregue apenas o core necessário.

Se não usa backend, não carregue `api.js`.

## Regra final

Prefira mudanças pequenas, modulares, testáveis e reversíveis.

Qualquer alteração em Worker, OAuth, KV, DNS, domínio, CORS, ranking backend ou redirects deve ser tratada como infraestrutura e separada das mudanças de frontend.


## Entrada suave pós-loader

Home e Doações utilizam os estados globais:

```text
site-loading
site-revealing
site-ready
```

A entrada deve continuar mínima e aplicada apenas a:

```text
.site-nav
body > main
.site-footer
```

Não criar cascatas longas ou animação card-a-card sem solicitação explícita.

O reveal deve sempre respeitar `prefers-reduced-motion: reduce`.
A página 404 não usa loader e não depende desses estados.


## V38 — caminho crítico e fundo mobile

O estado visual inicial de tema/blur/performance é aplicado por um bootstrap
inline no `<head>`. O arquivo completo:

```text
js/core/preferences.js
```

deve permanecer no final do `body`, antes de `navbar.js`, para não bloquear a
descoberta do CSS e para garantir que `KAMYLI_UI_PREFS` exista quando a navbar
for inicializada.

Background:

```text
desktop/tablet → fundo.avif
mobile <=760px → fundo-mobile.avif
fallback       → fundo.webp → fundo.png
Save-Data      → sem imagem decorativa
```

Não adicionar preload para nenhum fundo.


## V39 — loader atrasado e carrossel sem reflow repetido

O carregamento inicial usa:

```text
site-loading-pending
→ (180 ms, se necessário) site-loading-visible
→ site-revealing
→ site-ready
```

Se conteúdo local, footer e agenda ficarem prontos antes do atraso, o loader
visual não deve aparecer. Não remover esse fast-path.

A agenda deve agrupar leituras de layout em `measureCarousel()` e reutilizar
`agendaMetrics` durante a animação. Evitar `scrollWidth`, `clientWidth`,
`getBoundingClientRect()` ou `getComputedStyle()` dentro do loop de scroll.

Avatares visíveis usam `avatar-192.webp` / `avatar-384.webp` via `srcset`;
`avatar.png` permanece como fallback.


## CI V39.1

A validação de assets deve considerar obrigatórios:

```text
avatar-192.webp
avatar-384.webp
favicon.webp
fundo.webp
logo.webp
fundo.avif
fundo-mobile.avif
```

`avatar.webp` pode permanecer como asset legado, mas não é a fonte principal
dos componentes visíveis da Home/Doações e não deve ser requisito da V39.

O workflow também deve executar:

```bash
node --check js/core/loader.js
node --check js/pages/home/home.js
```

`assets/fundo.avif` já existe na `main` e é o AVIF desktop de produção. Não
tratá-lo como arquivo pendente a ser adicionado.


## V40 — CSS modular + bundles de produção

Os módulos continuam sendo a fonte de verdade:

```text
css/core/
css/components/
css/pages/
```

Os arquivos abaixo são gerados e não devem ser editados manualmente:

```text
css/build/home.css
css/build/doacoes.css
css/build/404.css
```

Para reconstruir:

```bash
python .github/scripts/build-css.py
```

Para apenas validar:

```bash
python .github/scripts/build-css.py --check
```

Ordem dos bundles:

```text
Home
variables → global → navbar → home

Doações
variables → global → navbar → doacoes → ranking

404
variables → global → navbar → 404
```

As páginas de produção devem carregar somente um stylesheet local. Google
Fonts continua separado até uma versão específica de tipografia.

Nunca corrigir um bug editando `css/build/*.css`; corrigir o módulo fonte,
reconstruir e fazer commit do bundle atualizado.
