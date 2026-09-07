# V41 — Nunito local e transição Home → Doações

## Objetivo

Reduzir a cadeia crítica da fonte e adicionar movimento entre estados sem
framework, SPA ou build.

## Fonte local

Antes:

```text
HTML
→ fonts.googleapis.com
→ CSS Google Fonts
→ fonts.gstatic.com
→ WOFF2
```

V41:

```text
HTML
→ preload assets/fonts/nunito-variable.woff2
```

O `@font-face` fica em `css/core/variables.css`.

## Loader → página

A V41 amplia discretamente o reveal existente:

```text
navbar: fade + -5 px
main: fade + +10 px + escala mínima
footer: fade + +10 px
```

O fast-path da V39 continua sem atraso em visitas normais rápidas.

## Home → Doações

```text
Home
→ ~180 ms de saída
→ navegação HTML real
→ entrada direcional na Doações
```

Não é SPA.

A chegada usa `sessionStorage` por no máximo poucos segundos.

## Acessibilidade/performance

Sem animação com:

```text
prefers-reduced-motion: reduce
data-performance="reduced"
```

Links externos, hashes, nova aba e cliques com modificadores não são
interceptados.

## CSS

A V41 consolida novamente o CSS modular escolhido para GitHub Pages.

Remover:

```text
css/build/
.github/scripts/build-css.py
docs/V40-CSS-BUNDLES.md
```

## Infraestrutura não alterada

Worker, OAuth, KV, CORS, DNS, API/ranking, robots, sitemap e canonical.
