# V34 — Performance com WebP

## Objetivo

Reduzir o custo da primeira carga sem alterar a identidade visual.

## Mapeamento

```text
avatar.webp  → Home e Doações
favicon.webp → favicon moderno e loader
fundo.webp   → background global e loader
logo.webp    → navbar
preview.png  → permanece para Open Graph/Twitter
```

## Fallbacks

- Avatar: `<picture>` → WebP / PNG.
- Fundo: `image-set()` → WebP / PNG, com declaração PNG anterior para browsers antigos.
- Favicon do navegador: WebP + PNG declarados.
- Navbar/loader usam máscara WebP em navegadores atuais.

## Loader

Antes:

```text
window.load + JSONs + agenda + footer
mínimo 460 ms
```

Agora:

```text
DOMContentLoaded + JSONs + agenda + footer
mínimo 280 ms
```

A API externa do ranking continua sem bloquear o loader.

## Preload

Foi removido o preload do background PNG pesado.

O favicon WebP continua preloaded porque ele aparece imediatamente no loader.

## CI

`.github/scripts/validate-content.py` agora exige:

```text
assets/avatar.webp
assets/favicon.webp
assets/fundo.webp
assets/logo.webp
```

e verifica assinatura `RIFF....WEBP`.

## Infraestrutura

Não alterado:

```text
workers.js
API
OAuth
KV
CORS
DNS
redirect donate
SEO/canonical/sitemap
```
