# Kamyli Sumire — site oficial

Site público de `kamylisumire.com`, desenvolvido sem framework e sem etapa de build.

## Arquitetura

- **Frontend:** HTML, CSS e JavaScript vanilla.
- **Conteúdo editorial:** JSON versionado em `data/`.
- **Home:** totalmente estática/local; não depende do Worker.
- **Doações:** página independente em `/doacoes/`.
- **Ranking:** única funcionalidade pública que consome backend.
- **Backend:** Cloudflare Worker em `workers.js`, exposto em `https://api.kamylisumire.com`.
- **Fallback da API:** `workers.dev` mantido temporariamente para contingência.
- **Produção:** GitHub Pages pela branch `main`.
- **Preview:** Cloudflare Pages, protegido contra indexação.
- **Assets gráficos públicos:** `assets.kamylisumire.com`.
- **Fonte Nunito:** mantida localmente em `assets/fonts/`.

Não há React, Vue, bundler, npm, geração estática ou compilação.

## Conteúdo editável

Os textos e listas ficam em `data/content/*.json`.
A agenda semanal fica em `data/agenda.json`.

As Lives são cadastradas manualmente em `data/content/lives.json` com
`videoId`, `title` e `date`. A Home monta thumbnail oficial e link direto
para o YouTube. Não existe iframe, player incorporado, playlist automática,
YouTube Data API ou chave Google.

## Estrutura principal

```text
.github/                 CI e validação
assets/fonts/            Nunito local e licença
css/core/                base visual
css/components/          componentes reutilizáveis/isolados
css/pages/               estilos por página
data/                    conteúdo editorial
docs/                    documentação atual
doacoes/                 página de apoio/ranking
js/core/                 infraestrutura compartilhada
js/pages/home/           lógica da Home
js/pages/doacoes/        lógica de Doações
workers.js               backend do ranking
```

## API de produção

O frontend de `/doacoes/` usa `https://api.kamylisumire.com` como endpoint
primário.

Durante a estabilização da V44.4, `workers.dev` permanece como fallback.
A Home continua totalmente independente dessa camada.

OAuth, client secret, tokens e credenciais não pertencem ao repositório
público. A configuração sensível permanece no Cloudflare Worker.

## Desenvolvimento

Como o projeto não possui build, sirva a raiz por HTTP para testes locais.

```bash
python -m http.server 8000
```

Antes de publicar:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

## Documentação atual

- `AGENTS.md` — regras de manutenção e invariantes.
- `DESIGN-SYSTEM.md` — sistema visual.
- `docs/ARQUITETURA.md` — componentes e fluxos.
- `docs/PRODUCAO.md` — publicação, preview e backend.
- `docs/VALIDACAO.md` — matriz de validação.
- `docs/SANEAMENTO-V44.md` — histórico consolidado do saneamento.
- `CHANGELOG.md` — histórico resumido.
