# ALTERACOES-DESIGN.md

Pacote de padronização visual da `site-v2` baseado na identidade da branch `main`.

## Arquivos alterados

```text
css/core/variables.css
css/core/global.css
css/core/navbar.css
css/pages/home.css
css/pages/doacoes.css
css/components/ranking.css
AGENTS.md
README-MIGRACAO.md
DESIGN-SYSTEM.md
```

## Não alterado

Este pacote NÃO modifica:

```text
workers.js
js/core/config.js
js/core/api.js
js/core/navbar.js
js/pages/home/home.js
js/pages/doacoes/doacoes.js
js/pages/doacoes/ranking.js
data/agenda.json
assets/*
CNAME
```

Portanto o endpoint atual `workers.dev`, fallback, cache do ranking, agenda e lógica de API permanecem como estão na branch.

## Aplicação

Extraia este ZIP sobre a raiz da branch `site-v2`, permitindo substituir os arquivos de mesmo nome.

Depois:

```bash
git add -A
git commit -m "style: padroniza design com a branch main"
git push
```

O Cloudflare Pages deverá gerar um novo Preview Deployment automaticamente.
