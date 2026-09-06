# Produção e ambientes

## Estado atual

A migração para o domínio principal está concluída.

```text
https://kamylisumire.com/          produção
https://kamylisumire.com/doacoes/  produção
https://donate.kamylisumire.com/   redirect 301 para /doacoes/
```

Preview:

```text
https://site-v2.kamylisumire-site.pages.dev/
```

## Hospedagem

```text
main     → GitHub Pages
site-v2  → Cloudflare Pages
```

Não há framework, bundler ou build obrigatório.

A CI customizada apenas audita o conteúdo/código antes ou depois dos commits;
ela não gera os arquivos usados pelo GitHub Pages.

## HTTPS

Produção deve permanecer em HTTPS.

## SEO

Indexáveis:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
```

A 404 permanece `noindex`.

`robots.txt` deve apontar para:

```text
https://kamylisumire.com/sitemap.xml
```

O sitemap deve conter somente as URLs públicas/canônicas.

## Preview

`_headers` protege os hosts `*.pages.dev` com:

```text
X-Robots-Tag: noindex
```

O GitHub Pages não usa `_headers` como header de produção; o arquivo existe
para o preview do Cloudflare Pages.

## Conteúdo

```text
data/agenda.json
data/content/
```

## API

O ranking de Doações usa:

```text
js/core/config.js
js/core/api.js
workers.js
```

Endpoint, OAuth, KV, CORS e domínio customizado da API devem ser tratados
separadamente.

## CI

```text
.github/workflows/validate-json.yml
→ .github/scripts/validate-content.py
→ node --check em js/**/*.js
```

## Checklist de publicação

1. CI verde;
2. Home abre sem erro;
3. Doações abre sem erro;
4. agenda carrega;
5. Regras/Créditos carregam;
6. navbar e scrollspy funcionam;
7. tema/blur funcionam;
8. links externos exibem aviso;
9. ranking mantém fallback se a API falhar;
10. 404 continua `noindex`;
11. canonical/robots/sitemap permanecem coerentes.

## V41 — caminho crítico

Nunito é servida pelo próprio domínio.

Não há mais dependência de:

```text
fonts.googleapis.com
fonts.gstatic.com
```

Home, Doações e 404 fazem preload do WOFF2.

A CI valida fonte/licença, ausência de Google Fonts, CSS modular e transições.

A transição Home → Doações não altera Worker, OAuth, KV, CORS, DNS ou ranking.

## V42 — preferências e loader

A preferência de tema agora aceita `auto`, `light` e `dark`; o blur aceita
`auto`, `on` e `off`.

A CI valida os três estados, o botão Apoiar fixo à direita, o menu no rodapé e
o loader transparente de no mínimo 1 segundo.

A mudança é somente de frontend e não altera Worker, API, OAuth, KV, CORS ou
DNS.
