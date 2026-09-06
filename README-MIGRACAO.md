# README-MIGRACAO.md — Migração concluída e estado de produção

> A migração do novo site para o domínio principal foi concluída em setembro de 2026. Este arquivo permanece como registro operacional e checklist pós-migração.

## Estado atual

Produção:

```text
https://kamylisumire.com/          → Home
https://kamylisumire.com/doacoes/ → Doações + ranking
```

Hostname legado:

```text
https://donate.kamylisumire.com
301 → https://kamylisumire.com/doacoes/
```

Branches:

```text
main    → produção no GitHub Pages
site-v2 → desenvolvimento/preview no Cloudflare Pages
```

Preview técnico:

```text
https://site-v2.kamylisumire-site.pages.dev
```

Os hosts `pages.dev` devem permanecer `noindex`.

## Domínio e HTTPS

O GitHub Pages está configurado com:

```text
Custom domain: kamylisumire.com
Enforce HTTPS: habilitado
```

O arquivo da raiz deve permanecer:

```text
CNAME
→ kamylisumire.com
```

Não trocar o `CNAME` de volta para `donate.kamylisumire.com`.

## DNS de produção

O apex utiliza os endereços do GitHub Pages e o `www` aponta para:

```text
kamylisouza.github.io
```

O hostname `donate` é tratado pelo Cloudflare como redirect permanente para `/doacoes/`.

Mudanças futuras de DNS devem ser tratadas como infraestrutura e separadas de alterações de frontend.

## SEO e indexação

Produção publica:

```text
https://kamylisumire.com/robots.txt
https://kamylisumire.com/sitemap.xml
```

URLs canônicas atualmente indexáveis:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
```

A 404 permanece `noindex`.

O Google Search Console já pode usar a propriedade:

```text
kamylisumire.com
```

Fluxo de manutenção:

1. manter o sitemap acessível;
2. adicionar novas páginas públicas ao sitemap quando apropriado;
3. manter canonical sempre no domínio principal;
4. não enviar URLs `pages.dev` ao Search Console;
5. manter o redirect legado como 301.

## Proteção dos previews

O arquivo:

```text
_headers
```

aplica:

```text
X-Robots-Tag: noindex
```

nos hosts do Cloudflare Pages.

Objetivo: evitar conteúdo duplicado entre preview e produção.

## Conteúdo editável

Agenda:

```text
data/agenda.json
```

Textos:

```text
data/content/
```

A V33 adiciona validação automática de conteúdo para impedir:

- JSON inválido;
- chaves duplicadas;
- datas de agenda fora de `AAAA-MM-DD`;
- IDs/dias inconsistentes;
- campos de live inconsistentes;
- divergência entre Hero, fallback HTML, SEO e social preview;
- `CNAME` incorreto;
- ausência da proteção `_headers`.

Workflow:

```text
.github/workflows/validate-json.yml
```

Validador:

```text
.github/scripts/validate-content.py
```

## Checklist de deploy

Antes de publicar alterações em `main`:

- [ ] GitHub Actions verde;
- [ ] Home funcionando;
- [ ] Agenda carregando;
- [ ] Regras e Créditos carregando;
- [ ] `/doacoes/` funcionando;
- [ ] ranking carregando ou usando fallback de cache;
- [ ] tema/blur funcionando;
- [ ] links externos exibindo confirmação;
- [ ] footer correto;
- [ ] `robots.txt` e `sitemap.xml` acessíveis;
- [ ] preview `pages.dev` continua `noindex`.

## API / Worker

A estabilização V33 não altera:

```text
workers.js
OAuth
KV RANKINGS
CORS
REDIRECT_URI
endpoint da API
```

A possível migração futura para:

```text
https://api.kamylisumire.com
```

continua sendo uma tarefa de infraestrutura separada e deve reutilizar o mesmo Worker, mantendo `workers.dev` durante a transição.

## Próxima etapa técnica sugerida

Depois da estabilização, melhorias de performance podem ser tratadas isoladamente:

- otimização de `fundo.png`;
- otimização de avatar/favicon;
- revisão dos preloads;
- redução da espera artificial do loader.

Essas otimizações não fazem parte da V33.
