# V43.6.2 — JSON Helpers

## Arquivos cobertos

```text
data/agenda.json
data/content/creditos.json
data/content/doacoes.json
data/content/footer.json
data/content/hero.json
data/content/home-doacoes.json
data/content/lives.json
data/content/ranking.json
data/content/regras.json
```

Há um helper dedicado para cada arquivo em `tools/json-helpers/`.

## Caracteres especiais

Os helpers usam `JSON.stringify(data, null, 2)`.

Texto digitado:

```text
Jogando "Resident Evil" \ Parte 2 ✨
```

JSON gerado:

```json
"Jogando \"Resident Evil\" \\ Parte 2 ✨"
```

O usuário não precisa escrever escapes manualmente.

## Operação

```text
Importar JSON atual
↓
Editar campos
↓
Validar
↓
Copiar ou baixar
↓
Substituir JSON no repositório
↓
CI
```

## Privacidade

Não há CDN, biblioteca externa, `fetch`, API, backend ou upload.

## Escopo

Nenhum JSON de produção ou arquivo funcional do site é alterado pela V43.6.2.
