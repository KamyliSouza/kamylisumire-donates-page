# ALTERACOES-UI-V25.md

## Conteúdo editorial centralizado em JSON

Nova estrutura:

```text
data/
├── agenda.json
└── content/
    ├── README.md
    ├── hero.json
    ├── home-doacoes.json
    ├── regras.json
    ├── creditos.json
    ├── doacoes.json
    ├── ranking.json
    └── footer.json
```

`agenda.json` continua separado porque representa dados estruturados da agenda.

## Loader compartilhado

Novo:

```text
js/core/content.js
```

API:

```js
KamyliContent.getJSON("/data/content/hero.json")
KamyliContent.setText("heroEyebrow", "Novo texto")
```

Ele:

- respeita `KAMYLI_SITE_PATH`;
- funciona no GitHub Pages/project path;
- usa `fetch(..., { cache: "no-cache" })`;
- possui cache em memória apenas durante a página atual;
- remove uma entrada do cache se a requisição falhar.

## Home

`js/pages/home/content.js` agora carrega:

```text
hero.json
home-doacoes.json
regras.json
creditos.json
```

Os textos atuais continuam no HTML como fallback.

## Doações

Novo:

```text
js/pages/doacoes/content.js
```

Carrega:

```text
doacoes.json
ranking.json
```

Editáveis por JSON:

- eyebrow;
- título;
- subtítulo;
- título/descrição LivePix;
- título/descrição Pixie;
- texto do aviso;
- agradecimento do ranking;
- título/descrição do ranking;
- nomes das abas.

Os SVGs, URLs de pagamento e lógica do ranking permanecem no código.

## Footer

`footer.json` passa a controlar os textos e links editoriais do footer.

Por segurança editorial, `footer.js` ainda contém fallback para:

```text
Arte do fundo por @h0wl_oficial
Avatar por @maililac
```

Esses dois créditos aparecem mesmo se `footer.json` falhar.

## Regras e Créditos

Foram movidos de:

```text
data/regras.json
data/creditos.json
```

para:

```text
data/content/regras.json
data/content/creditos.json
```

O comportamento de scroll após cinco itens continua igual.

## Infraestrutura não alterada

Não foram movidos para JSON:

```text
API
Worker
OAuth
KV
rotas
animações
cache do ranking
config.js
```

## Arquivos novos principais

```text
js/core/content.js
js/pages/doacoes/content.js

data/content/*
```

Todas as alterações visuais e funcionais da V24 foram preservadas.
