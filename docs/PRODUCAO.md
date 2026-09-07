# Produção

## Produção pública

Domínio canônico:

`https://kamylisumire.com/`

A branch de produção é `main`, publicada pelo GitHub Pages.

Arquivos que não devem ser removidos:

- `CNAME`;
- `.nojekyll`;
- `robots.txt`;
- `sitemap.xml`;
- assets/fonts locais;
- páginas HTML;
- CSS/JS utilizados;
- JSON editorial.

## Preview

A branch `site-v2` é usada como preview Cloudflare Pages.
O arquivo `_headers` deve continuar aplicando `X-Robots-Tag`/noindex aos
domínios `pages.dev`.

Não publicar canonical apontando para preview.

## Assets

Gráficos públicos usam `https://assets.kamylisumire.com`.
Antes de remover um asset remoto ou mudar seu nome, verificar Home, Doações,
404, Open Graph, Twitter Cards e JSON-LD.

## Backend do ranking

A configuração está em `js/core/config.js`.

Enquanto `useCustomDomain` estiver `false`, o frontend usa o endpoint
`workers.dev` configurado e mantém o domínio customizado preparado.

Ativar `api.kamylisumire.com` deve ser uma mudança isolada e testada.

Nunca armazenar client secret, token OAuth ou credencial em HTML/JS/JSON
público.

## Checklist antes de merge

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check
```

Depois, smoke test:

1. Home abre sem erros visíveis.
2. Hero e CTA “Gostou das lives?” exibem coração + “Apoiar”.
3. Lives carregam e abrem o vídeo correto no YouTube.
4. Lives e Agenda aceitam setas, teclado, touch e click + arrasta.
5. Agenda exibe sete dias.
6. Regras e Créditos carregam.
7. `/doacoes/` abre LivePix/Pixie.
8. Ranking carrega ou utiliza seu fallback/cache sem quebrar a página.
9. Tema/blur continuam persistindo preferências.
10. Links externos continuam passando pelo confirmador global.
11. 404 continua `noindex`.
12. canonical/OG/sitemap continuam apontando para produção.
