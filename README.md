# Kamyli Sumire — Site

Site estático e modular da Kamyli Sumire.

## Páginas

```text
/          Home
/doacoes/  Doações + ranking
```

Preview:

```text
https://site-v2.kamylisumire-site.pages.dev
```

## Stack

- HTML;
- CSS;
- JavaScript vanilla;
- JSON para conteúdo editorial;
- GitHub Pages / Cloudflare Pages;
- Worker existente somente para API/ranking.

## Conteúdo

```text
data/agenda.json
data/content/
```

## Estrutura

```text
css/core/        compartilhado
css/components/  componentes
css/pages/       páginas
js/core/         módulos compartilhados
js/pages/        lógica por página
data/            conteúdo editável
assets/          identidade visual
```

## Desenvolvimento local

Sirva a raiz por HTTP, pois os JSONs usam `fetch`.

```bash
python -m http.server 8000
```

Abra:

```text
http://localhost:8000/
http://localhost:8000/doacoes/
```

## Documentação

- `AGENTS.md` → arquitetura/invariantes;
- `DESIGN-SYSTEM.md` → identidade visual;
- `README-MIGRACAO.md` → migração;
- `CHANGELOG.md` → histórico consolidado.

Mudanças em Worker, OAuth, KV, DNS e domínios devem ser tratadas separadamente.
