# JSON Helpers

Ferramentas locais para editar os arquivos JSON de conteúdo sem escrever
serialização JSON manualmente.

## Helpers disponíveis

| Helper | Arquivo |
|---|---|
| `agenda.html` | `data/agenda.json` |
| `creditos.html` | `data/content/creditos.json` |
| `doacoes.html` | `data/content/doacoes.json` |
| `footer.html` | `data/content/footer.json` |
| `hero.html` | `data/content/hero.json` |
| `home-doacoes.html` | `data/content/home-doacoes.json` |
| `lives.html` | `data/content/lives.json` |
| `ranking.html` | `data/content/ranking.json` |
| `regras.html` | `data/content/regras.json` |

`data/content/lives.example.json` não é arquivo de produção e não possui helper
separado.

## Uso

1. Abra `tools/json-helpers/index.html`.
2. Entre no helper desejado.
3. Clique em `Importar JSON atual`.
4. Selecione o arquivo correspondente.
5. Edite.
6. Valide.
7. Baixe.
8. Substitua o JSON original.
9. Rode a CI do projeto.

## Caracteres especiais

Os helpers usam:

```js
JSON.stringify(data, null, 2)
```

Assim é possível digitar normalmente aspas, barras, emojis, acentos e quebras
de linha. Os escapes são gerados automaticamente.

## Privacidade

Os helpers não usam CDN, `fetch`, APIs externas ou upload. Tudo acontece no
browser local.
