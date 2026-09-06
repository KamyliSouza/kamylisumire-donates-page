# V40 — Saneamento, documentação e auditoria

## Objetivo

Consolidar a V39.2 mantendo a arquitetura simples do GitHub Pages e mantendo a
CI customizada existente.

A V40:

- não adiciona framework;
- não adiciona bundler;
- não adiciona build;
- mantém e fortalece a CI customizada;
- não altera HTML/CSS/JS funcional.

## Forma de aplicação

Esta V40 é distribuída como arquivos finais no mesmo layout do repositório.

Não existe `V40-APLICAR.py`.

O ZIP deve ser extraído sobre uma cópia/repositório V39.2, permitindo
substituição dos arquivos com o mesmo caminho.

Como um ZIP não remove arquivos existentes, os resíduos listados em
`V40-REMOVER.txt` precisam ser apagados manualmente depois da sobreposição.

## Arquivos removidos

Remover se existirem:

```text
ARQUIVOS-MANTER.txt
LIMPEZA-V28.txt
README-MIGRACAO.md
V33-APLICACAO.txt
V34-APLICACAO.txt
V35-APLICACAO.txt
V39-APLICACAO.txt
V39-1-APLICACAO.txt
V39-2-APLICACAO.txt

assets/avatar.webp
```

A CI NÃO deve ser removida.

## Arquivos preservados

```text
.github/scripts/validate-content.py
.github/workflows/validate-json.yml
.nojekyll
_headers
CNAME
robots.txt
sitemap.xml
workers.js
```

Também permanecem todos os módulos CSS, JavaScript e JSON funcionais.

## Funcionalidade preservada

- Home;
- Doações;
- agenda/carrossel;
- Regras/Créditos;
- navbar/scrollspy;
- tema;
- blur adaptativo;
- performance adaptativa;
- loader atrasado;
- aviso global de links externos;
- footer;
- ranking/cache/fallback;
- 404;
- SEO/social preview;
- Worker/API.

## CI V40

A validação customizada passa a cobrir:

- JSON sem chaves duplicadas;
- agenda;
- Hero/SEO;
- WebP/AVIF;
- fallbacks;
- `CNAME`;
- `_headers`;
- robots/sitemap;
- 404 `noindex`;
- referências locais de HTML/CSS;
- ausência de resíduos históricos;
- ausência de `assets/avatar.webp`;
- sintaxe de todo `js/**/*.js`.

## Resultado

A V40 consolida a linha V39.2 em:

```text
arquivos estáticos
+ GitHub Pages
+ preview Cloudflare Pages
+ CI customizada de validação
```

Sem pipeline de build.
