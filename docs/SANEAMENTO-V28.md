# Saneamento V28

## Frontend

- Home não carrega mais `api.js`;
- CSS morto/duplicado da agenda removido;
- fundo mobile usa `background-attachment: scroll`;
- 404 usa o core atual e não carrega API.

## 404

A página inclui:

```text
preferences.js
config.js
content.js
navbar.js
footer.js
```

Ela não inclui `api.js`.

Também usa `noindex` e resolve o base path no GitHub Pages de projeto.

## Documentação

Atualizados:

```text
AGENTS.md
DESIGN-SYSTEM.md
README-MIGRACAO.md
data/content/README.md
```

Adicionados:

```text
README.md
CHANGELOG.md
```

## Qualidade

Adicionado:

```text
.github/workflows/validate-json.yml
```

## Não alterado

```text
workers.js
js/core/config.js
js/core/api.js
OAuth
KV RANKINGS
CORS
DNS
domínios
```
