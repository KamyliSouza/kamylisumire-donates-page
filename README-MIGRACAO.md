# Kamyli Sumire — estrutura modular (site-v2)

Esta versão reorganiza o projeto para permitir novas páginas e miniaplicações sem acoplar a lógica entre elas.

## Estrutura

```text
/
├── index.html
├── 404.html
├── CNAME
├── .nojekyll
├── workers.js
├── avatar.png          # manter o arquivo atual do repositório
├── favicon.png         # manter o arquivo atual do repositório
├── fundo.png           # manter o arquivo atual do repositório
├── preview.png         # manter o arquivo atual do repositório
│
├── doacoes/
│   └── index.html
│
├── css/
│   ├── core/
│   │   ├── variables.css
│   │   ├── global.css
│   │   └── navbar.css
│   ├── components/
│   │   └── ranking.css
│   └── pages/
│       ├── home.css
│       └── doacoes.css
│
├── js/
│   ├── core/
│   │   ├── config.js
│   │   ├── api.js
│   │   └── navbar.js
│   └── pages/
│       ├── home/
│       │   └── home.js
│       └── doacoes/
│           ├── doacoes.js
│           └── ranking.js
│
└── data/
    └── agenda.json
```

## Princípio da modularidade

- `css/core/` e `js/core/` são compartilhados por todo o site.
- `css/pages/` e `js/pages/` pertencem somente à página/aplicação correspondente.
- `css/components/` contém componentes reutilizáveis, como o ranking.
- `js/core/api.js` é a única camada que decide qual URL da API usar e como fazer fallback.

## API atual

`js/core/config.js` continua com `useCustomDomain: false`, portanto a página de doações continua usando exatamente:

`https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev`

Quando `api.kamylisumire.com` estiver pronto, altere apenas `useCustomDomain` para `true`. O endereço `workers.dev` permanece como fallback.

## Como adicionar uma nova aplicação

Exemplo: `/sorteio/`

Crie:

```text
sorteio/index.html
css/pages/sorteio.css
js/pages/sorteio/sorteio.js
```

No HTML da aplicação carregue primeiro os módulos compartilhados:

```html
<link rel="stylesheet" href="../css/core/variables.css">
<link rel="stylesheet" href="../css/core/global.css">
<link rel="stylesheet" href="../css/core/navbar.css">
<link rel="stylesheet" href="../css/pages/sorteio.css">

<script src="../js/core/config.js"></script>
<script src="../js/core/api.js"></script>
<script src="../js/core/navbar.js"></script>
<script src="../js/pages/sorteio/sorteio.js"></script>
```

Se precisar da API:

```js
const dados = await KamyliAPI.getJSON("/sorteio");
```

Assim a aplicação continua integrada à navbar, identidade visual e API, mas seu CSS e JavaScript ficam isolados.

## Agenda

Edite somente `data/agenda.json`.

## Arquivos antigos que podem ser removidos da raiz da branch

- `style.css`
- `script.js`
- `ranking.css`
- `ranking.js`

## Preview Cloudflare Pages

- Production branch: `main`
- Preview branch: `site-v2`
- Framework: `None`
- Build command: `exit 0`
- Root directory: vazio
- Output directory: `.`


## Padronização visual

A identidade visual modular é baseada na branch `main`.

Consulte:

```text
DESIGN-SYSTEM.md
```

A fonte de verdade de cores, superfícies, sombras e raios é:

```text
css/core/variables.css
```

Evite redefinir cores globais em CSS de página. A Home pode ter um layout mais amplo, enquanto `/doacoes/` preserva propositalmente a aparência compacta e familiar do site original.
