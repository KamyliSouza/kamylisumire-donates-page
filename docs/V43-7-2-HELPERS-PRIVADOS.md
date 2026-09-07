# V43.7.2 — JSON Helpers privados

## Objetivo

Retirar o código dos JSON Helpers do repositório e do deploy público sem
alterar os JSONs de produção.

## Arquitetura

```text
kamylisumire.com
├── site público
├── JSONs
├── Nunito/OFL
└── sem JSON Helpers

helpers.kamylisumire.com
├── Cloudflare Pages Direct Upload
├── JSON Helpers
└── Cloudflare Access obrigatório
```

## Cloudflare Access

O custom domain deve ser protegido por uma aplicação Access do tipo
Self-hosted/private.

Uma policy simples pode permitir somente o e-mail autorizado e usar One-time
PIN como método de autenticação.

O domínio padrão `*.pages.dev` também precisa permanecer protegido. Não deixar
o Pages dev URL como bypass público para o mesmo conteúdo.

## Pacote privado

O pacote privado V43.7.2 contém:

```text
index.html
agenda.html
creditos.html
doacoes.html
footer.html
hero.html
home-doacoes.html
lives.html
ranking.html
regras.html
helper.css
helper-core.js
schemas.js
_headers
SETUP-CLOUDFLARE-ACCESS.txt
```

Não há JSONs de produção, tokens, API keys ou fontes no pacote.

## Remoção do repositório

Executar na raiz:

```text
python remove_v4372_public_helpers.py
```

O script remove somente os arquivos de helper conhecidos.

Se encontrar arquivos adicionais em `tools/json-helpers/`, eles são preservados
e o script retorna erro para evitar exclusão acidental.

## Histórico

Esta versão remove o código dos helpers do estado atual do repositório, mas não
reescreve commits antigos. Uma eventual limpeza do histórico Git é uma operação
separada.
