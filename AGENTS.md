# AGENTS.md — Referência operacional para agentes de IA

Este arquivo descreve o estado atual da branch `site-v2` e as regras que devem ser preservadas por qualquer agente que edite o projeto.

## Objetivo

O projeto é um site estático, modular e sem framework.

URLs-alvo:

- `https://kamylisumire.com/` → Home;
- `https://kamylisumire.com/doacoes/` → Doações;
- `https://donate.kamylisumire.com` → futuramente 301 para `/doacoes/`.

Branches:

- `main` → produção;
- `site-v2` → desenvolvimento/preview.

Não introduza framework, bundler ou build obrigatório sem solicitação explícita.

## Estrutura atual

```text
/
├── .github/workflows/validate-json.yml
├── assets/
│   ├── avatar.png
│   ├── favicon.png
│   ├── fundo.png
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
- `preferences.js` → tema e blur;
- `navbar.js` → navbar;
- `external-links.js` → confirmação global de links externos;
- `footer.js` → footer;
- `loader.js` → preloader das páginas principais.

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
- favicon como máscara em `--primary-color`;
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

- usa favicon pulsando;
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
