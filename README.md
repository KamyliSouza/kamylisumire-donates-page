# Kamyli Sumire — site oficial

Código-fonte de [kamylisumire.com](https://kamylisumire.com): site estático em
HTML, CSS e JavaScript vanilla, **sem framework, sem bundler e sem etapa de build**.
O conteúdo editorial vive em JSON versionado e a única parte dinâmica é um
Cloudflare Worker (`workers.js`) que serve o ranking de doações e os snapshots da
Twitch.

## Páginas

| Rota | O que é | Fonte do conteúdo |
| --- | --- | --- |
| `/` | Home: Hero, Lives, Agenda, Blog, Regras, Créditos e apoio | `data/content/*.json`, `data/agenda.json` |
| `/agenda/` | Agenda semanal completa, com artes da Steam (modos Padrão e Compacto, lembrados no navegador) | `data/agenda.json`, `data/content/jogos-artwork.json` |
| `/jogos/` | Catálogo de jogos das lives (modos Pôsteres e Compacto, lembrados no navegador; o popup de cada jogo mostra review, nota, playlist, transmissões e links) | `data/content/jogos.json` (gerado pelo sync) + `data/content/jogos-editorial.json` (manual) |
| `/artes/` | Galeria de artes (masonry + lightbox) | `data/content/artes.json` |
| `/blog/` | Blog estático | `data/blog/` |
| `/doacoes/` | LivePix, Pixie e ranking de apoiadores | `data/content/doacoes.json` + API |
| `/privacidade/` e `/uso-de-ia/` | Política de Privacidade e política de Uso de IA | HTML estático |

## Como funciona

- **Frontend:** páginas estáticas publicadas pelo GitHub Pages (branch `main`). Navbar,
  Footer, Redes e Configurações são componentes compartilhados em `js/core/`.
- **Conteúdo:** textos e listas ficam em JSON; editar conteúdo não exige mexer em HTML.
- **Backend público:** Worker em `https://api.kamylisumire.com` (ranking via Streamlabs,
  VODs e status ao vivo da Twitch). O navegador nunca consulta Twitch ou Streamlabs
  diretamente. Se a API cair, a Home continua funcionando.
- **Sincronizações editoriais:** GitHub Actions leem o Trello (Agenda e Jogos) e a Steam
  e gravam os JSONs no repositório. O navegador do visitante não chama essas APIs.
- **Preview:** branch `site-v2` no Cloudflare Pages, protegido contra indexação.
- **Assets gráficos:** `assets.kamylisumire.com`. Só a fonte Nunito é local.

O site não possui uma página independente `/live/` nem incorpora players ou chats da Twitch/YouTube.
As transmissões recentes e o status ao vivo continuam disponíveis na Home, com links para as
plataformas oficiais.

Detalhes em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Estrutura do repositório

```text
index.html, 404.html      Home e página de erro
agenda/ artes/ blog/ doacoes/ jogos/ privacidade/ uso-de-ia/
                          uma pasta por página, cada uma com index.html
css/core/                 tokens, base, Navbar, Redes, modo leitura
css/components/           componentes reutilizáveis
css/pages/                estilos por página
js/core/                  infraestrutura compartilhada
js/pages/<página>/        lógica de cada página
data/content/             conteúdo editorial (JSON)
data/blog/                configuração, índice e fontes Markdown do Blog
data/agenda.json          agenda semanal (gerada pelo sync do Trello)
assets/fonts/             Nunito local + licença
workers.js                Cloudflare Worker (backend)
.github/workflows/        validação e syncs editoriais
.github/scripts/          validador e scripts de sincronização
.github/tests/            testes automatizados (node:test)
docs/                     documentação técnica
```

## Desenvolvimento

Não há build: sirva a raiz por HTTP.

```bash
python -m http.server 8000
```

Validação completa (os mesmos passos de `.github/workflows/validate-json.yml`, mais `git diff --check`):

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -r -n1 node --check
node --check workers.js
node --check .github/scripts/sync-jogos.mjs
node --check .github/scripts/sync-agenda.mjs
node --check .github/scripts/agenda-week.mjs
node --test .github/tests/*.test.mjs
git diff --check
```

Os testes usam apenas o runner nativo do Node; não há `package.json` nem dependências
para instalar. Mais detalhes em [`docs/VALIDACAO.md`](docs/VALIDACAO.md).

## Editando conteúdo

| Quero mudar… | Onde |
| --- | --- |
| Navbar (texto, ícone, URL, ordem) | `data/content/navbar.json` |
| Ordem e visibilidade dos cards da Home | `data/content/home-cards.json` |
| Redes sociais | `data/content/redes.json` |
| Lives do YouTube | `data/content/lives.json` |
| Artes da galeria | `data/content/artes.json` |
| Posts do Blog | `data/blog/` (ver [`data/blog/README.md`](data/blog/README.md)) |
| Agenda e Jogos | Trello + sync (ver [`docs/AGENDA-E-JOGOS.md`](docs/AGENDA-E-JOGOS.md)) |
| Quantidade de jogos por página | `data/content/jogos-config.json` |
| Review, nota, playlist, transmissões e links de cada jogo | `data/content/jogos-editorial.json` (por `gameId` do cartão Trello; ver [`docs/AGENDA-E-JOGOS.md`](docs/AGENDA-E-JOGOS.md)) |

O formato de cada arquivo está em [`data/content/README.md`](data/content/README.md).
Ícones usam apenas nomes da biblioteca `js/core/button-icons.js`; nenhum JSON aceita
HTML, SVG bruto ou CSS.

## Documentação

| Arquivo | Para quê |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Regras de manutenção e invariantes (leia antes de alterar código) |
| [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) | Sistema visual |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de versões |
| [`docs/README.md`](docs/README.md) | Índice da documentação técnica |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Componentes e fluxos |
| [`docs/PRODUCAO.md`](docs/PRODUCAO.md) | Publicação, Worker e configuração |
| [`docs/TWITCH.md`](docs/TWITCH.md) | Integração Twitch (implantação e operação) |
| [`docs/AGENDA-E-JOGOS.md`](docs/AGENDA-E-JOGOS.md) | Trello, Steam e syncs |
| [`docs/VALIDACAO.md`](docs/VALIDACAO.md) | CI, testes e smoke tests |
| [`docs/PRIVACIDADE-RANKING.md`](docs/PRIVACIDADE-RANKING.md) | Governança de privacidade do ranking |

## Segurança, privacidade e direitos

- Segredos (OAuth, tokens, chaves de API) nunca entram no repositório; ficam no
  Cloudflare Worker e nos *secrets* do GitHub Actions.
- Privacidade: [`/privacidade/`](https://kamylisumire.com/privacidade/). Contato:
  `contato@kamylisumire.com`.
- Os conteúdos e assets autorais não podem ser usados para treinar, avaliar ou aprimorar
  sistemas de IA: [`/uso-de-ia/`](https://kamylisumire.com/uso-de-ia/).
- © Kamyli Sumire, todos os direitos reservados (conforme o rodapé do site).
