# Kamyli Sumire — Site

Site estático e modular da Kamyli Sumire.

## Produção

```text
https://kamylisumire.com/
```

Páginas públicas:

```text
/          Home
/doacoes/  Doações + ranking
```

O endereço legado:

```text
https://donate.kamylisumire.com
```

redireciona permanentemente para `/doacoes/`.

## Ambientes

```text
main    → produção / GitHub Pages
site-v2 → preview / Cloudflare Pages
```

Preview técnico:

```text
https://site-v2.kamylisumire-site.pages.dev
```

Os ambientes `pages.dev` não devem ser indexados.

## Stack

- HTML;
- CSS;
- JavaScript vanilla;
- JSON para conteúdo editorial;
- GitHub Pages em produção;
- Cloudflare Pages para preview;
- Worker existente somente para API/ranking.

Não há framework ou build obrigatório.

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

## Validação automática

O workflow:

```text
.github/workflows/validate-json.yml
```

executa:

```text
.github/scripts/validate-content.py
```

para validar JSONs, agenda, sincronização Hero/SEO/preview e arquivos de produção.

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
- `README-MIGRACAO.md` → estado de produção e registro da migração;
- `CHANGELOG.md` → histórico consolidado;
- `docs/` → notas técnicas por versão.

Mudanças em Worker, OAuth, KV, DNS e domínios devem ser tratadas separadamente das alterações de frontend.


## Assets otimizados

A interface prefere `avatar.webp`, `favicon.webp`, `fundo.webp` e `logo.webp`,
com os PNGs históricos preservados como fallback quando aplicável.

## Blur adaptativo

Sem preferência manual salva, o site decide automaticamente se deve usar `backdrop-filter`. A heurística considera suporte do navegador, redução de transparência, economia de dados e sinais opcionais de capacidade de hardware.

```text
kamyli:ui-blur ausente → auto
kamyli:ui-blur=on      → ligado manualmente
kamyli:ui-blur=off     → desligado manualmente
```

A implementação não usa User-Agent para classificar celulares ou navegadores.
