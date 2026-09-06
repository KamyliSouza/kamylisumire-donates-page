# V32 — Proteção SEO dos previews Cloudflare Pages

## Objetivo

Evitar que os ambientes técnicos do Cloudflare Pages apareçam no Google e
concorram com:

```text
https://kamylisumire.com
```

## Arquivo adicionado

```text
/_headers
```

Conteúdo:

```text
https://:project.pages.dev/*
  X-Robots-Tag: noindex

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
```

Esse formato segue a sintaxe de `_headers` do Cloudflare Pages.

## O que é protegido

Exemplos:

```text
https://kamylisumire-site.pages.dev/
https://site-v2.kamylisumire-site.pages.dev/
https://<hash>.kamylisumire-site.pages.dev/
```

## Produção

O domínio oficial continua:

```text
https://kamylisumire.com/
```

GitHub Pages não usa `_headers` para configurar cabeçalhos HTTP, portanto o
arquivo não transforma a produção em `noindex`.

## Como testar depois do deploy

No terminal:

```bash
curl -I https://site-v2.kamylisumire-site.pages.dev/
```

e:

```bash
curl -I https://kamylisumire-site.pages.dev/
```

Procure por:

```text
x-robots-tag: noindex
```

No domínio oficial:

```bash
curl -I https://kamylisumire.com/
```

não deve existir um `X-Robots-Tag: noindex` vindo dessa configuração.

## Infraestrutura

Não alterado:

```text
workers.js
API
OAuth
KV RANKINGS
CORS
DNS
redirect donate
```
