# Kamyli Sumire — Site

Site estático e modular da Kamyli Sumire.

## Produção

```text
https://kamylisumire.com/          Home
https://kamylisumire.com/doacoes/  Doações + ranking
```

O endereço legado `https://donate.kamylisumire.com` redireciona
permanentemente para `/doacoes/`.

## Ambientes

```text
main     → produção / GitHub Pages
site-v2  → desenvolvimento e preview / Cloudflare Pages
```

Preview técnico:

```text
https://site-v2.kamylisumire-site.pages.dev/
```

Os previews `*.pages.dev` permanecem com `X-Robots-Tag: noindex` por meio de
`_headers`.

A migração para o domínio principal está concluída.

## Stack

- HTML;
- CSS modular;
- JavaScript vanilla;
- JSON para conteúdo editorial;
- GitHub Pages em produção;
- Cloudflare Pages para preview;
- Cloudflare Worker somente para API/ranking;
- GitHub Actions para validação customizada.

Não há framework, bundler ou build obrigatório.

## Estrutura

```text
.github/
  scripts/validate-content.py
  workflows/validate-json.yml
assets/
css/core/
css/components/
css/pages/
data/agenda.json
data/content/
doacoes/
docs/
js/core/
js/pages/
```

Arquivos operacionais da raiz:

```text
index.html
404.html
CNAME
.nojekyll
_headers
robots.txt
sitemap.xml
workers.js
README.md
AGENTS.md
DESIGN-SYSTEM.md
CHANGELOG.md
```

## Desenvolvimento local

Os JSONs usam `fetch`, então sirva a raiz por HTTP:

```bash
python -m http.server 8000
```

Abra:

```text
http://localhost:8000/
http://localhost:8000/doacoes/
```

## CI customizada

O workflow:

```text
.github/workflows/validate-json.yml
```

executa:

```text
python .github/scripts/validate-content.py
```

e verifica a sintaxe de todos os arquivos:

```text
js/**/*.js
```

A validação cobre:

- JSON sem chaves duplicadas;
- esquema da agenda;
- Hero, fallback HTML, SEO e preview social;
- WebP/AVIF e fallbacks;
- estados de performance/loader da V39;
- `CNAME` e `_headers`;
- referências locais de HTML/CSS;
- `robots.txt`, `sitemap.xml` e 404 `noindex`;
- ausência de resíduos históricos consolidados na V40.

A CI é uma proteção de qualidade; o site continua sendo publicado como
arquivos estáticos pelo GitHub Pages, sem build do projeto.

## Conteúdo editável

Agenda:

```text
data/agenda.json
```

Textos:

```text
data/content/
```

## Assets

Avatar:

```text
avatar-192.webp
avatar-384.webp
avatar.png        fallback
```

Background:

```text
desktop/tablet:
fundo.avif → fundo.webp → fundo.png

mobile até 760 px:
fundo-mobile.avif → fundo.webp → fundo.png
```

`avatar.webp` legado foi removido na V40.

## API

A Home continua sem depender do Worker.

Somente `/doacoes/` usa `js/core/api.js` para o ranking. Worker, OAuth, KV,
CORS e domínio da API continuam sendo infraestrutura separada.

## Documentação

- `AGENTS.md` — arquitetura e invariantes;
- `DESIGN-SYSTEM.md` — identidade visual;
- `CHANGELOG.md` — histórico consolidado;
- `docs/PRODUCAO.md` — ambientes, publicação e SEO;
- `docs/V40-AUDITORIA.md` — saneamento/auditoria da V40.

## V41 — fontes locais e transição Home → Doações

A Nunito deixa de depender de `fonts.googleapis.com` e `fonts.gstatic.com`.

Produção usa:

```text
assets/fonts/nunito-variable.woff2
assets/fonts/OFL.txt
```

O `@font-face` fica em `css/core/variables.css`, evitando outro stylesheet
bloqueante.

Home, Doações e 404 fazem preload do mesmo WOFF2 local.

A V41 também adiciona `js/core/page-transitions.js`.

Fluxo:

```text
Home
→ saída curta para a esquerda (~180 ms)
→ /doacoes/
→ entrada curta pela direita
```

O fast-path normal do loader continua imediato. Uma chegada marcada da Home
para Doações executa somente o reveal de entrada quando o loader não precisa
aparecer.

`prefers-reduced-motion: reduce` e `data-performance="reduced"` desativam a
transição.

A arquitetura final volta aos CSS modulares; `css/build/` não faz parte do
estado consolidado.

## V42 — configurações no rodapé e loader estético

A navbar deixa de exibir os toggles de tema/blur. No lugar deles, o botão
`Apoiar` fica fora da área rolável e permanece fixo à direita da navbar.

As preferências visuais passam para um menu no rodapé:

```text
Aparência: Automático | Claro | Escuro
Blur:      Automático | Ligado | Desligado
```

`Automático` no tema acompanha `prefers-color-scheme` em tempo real.

O blur automático preserva as heurísticas de suporte, redução de transparência,
Save-Data, memória e CPU.

Home, Doações e 404 passam pelo loader por no mínimo 1 segundo. O overlay é
transparente e `assets/logo.webp` pulsa no centro. Reduced motion e perfil de
performance reduzida mantêm o segundo de espera, mas removem a pulsação.
