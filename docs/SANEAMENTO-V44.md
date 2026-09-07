# Saneamento V44

## Objetivo

Consolidar o estado vigente do projeto, removendo resíduos de migrações e
documentação histórica que já conflitava com a implementação atual.

## Removido

### Raiz

- `V43-7-HOTFIX.txt`
- `V43-7-1-HOTFIX.txt`
- `V43-7-2-HOTFIX.txt`
- `V43-7-REMOVER.txt`
- `remove_v4372_public_helpers.py`

### Código temporário

- `css/pages/v43-7-3.css`
- `js/pages/home/v43-7-3.js`
- `.github/scripts/__pycache__/`

A funcionalidade V43.7.3 foi preservada sob nomes sem versão:

- `css/components/home-interactions.css`
- `js/pages/home/home-interactions.js`

### Assets duplicados

Removidas duplicatas locais dos gráficos já publicados por
`assets.kamylisumire.com`:

- `assets/avatar.png`
- `assets/favicon.png`
- `assets/fundo.png`
- `assets/preview.png`

Fonte e licença locais permanecem.

### Documentação histórica

Os documentos `V*.md` e `SANEAMENTO-V28.md` em `docs/` foram removidos depois
de consolidar as regras vigentes em:

- `README.md`;
- `AGENTS.md`;
- `DESIGN-SYSTEM.md`;
- `CHANGELOG.md`;
- `docs/ARQUITETURA.md`;
- `docs/PRODUCAO.md`;
- `docs/VALIDACAO.md`;
- este documento.

O Git permanece como fonte do histórico detalhado.

## Lives

Foram removidas apenas chaves estruturais legadas de playlist/player:

- `playlistId`;
- `mensagemCarregando`;
- `mensagemSemPlaylist`;
- `mensagemErro`;
- `modalTitulo`.

Os objetos em `videos` não são reordenados nem têm título/data alterados.

## CI

O validador antigo era específico da V43.7.2 e exigia resíduos temporários
que o próprio saneamento precisava remover.

Ele foi substituído por validação do estado arquitetural atual, sem
dependência de um número de hotfix.

## Observação editorial

No estado auditado em 7 de setembro de 2026, uma entrada de Live estava
datada como `2026-09-29`, fora da ordem das demais e no futuro.

O V44 não corrige esse dado porque títulos/datas/ordem de Lives são
editoriais. O novo validador emite aviso para revisão humana.
