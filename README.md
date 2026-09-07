# Kamyli Sumire — site oficial

Site público de `kamylisumire.com`, desenvolvido sem framework e sem etapa de build.

## Arquitetura

- **Frontend:** HTML, CSS e JavaScript vanilla.
- **Conteúdo editorial:** JSON versionado em `data/`.
- **Home:** totalmente estática/local; não depende do Worker.
- **Doações:** página independente em `/doacoes/`.
- **Ranking:** única funcionalidade pública que consome backend.
- **Backend:** Cloudflare Worker em `workers.js`, com integração Streamlabs e persistência em KV.
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

## Desenvolvimento

Como o projeto não possui build, sirva a raiz por HTTP para testes locais.
Exemplo:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000/`.

Antes de publicar:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

A mesma validação é executada pela CI.

## Documentação atual

- `AGENTS.md` — regras de manutenção e invariantes.
- `DESIGN-SYSTEM.md` — sistema visual.
- `docs/ARQUITETURA.md` — componentes e fluxos.
- `docs/PRODUCAO.md` — publicação, preview e backend.
- `docs/VALIDACAO.md` — matriz de validação.
- `docs/SANEAMENTO-V44.md` — escopo do saneamento que consolidou o repositório.
- `CHANGELOG.md` — histórico resumido.

Documentos de hotfix e versões antigas foram removidos no saneamento V44.
O histórico detalhado continua disponível no Git.
