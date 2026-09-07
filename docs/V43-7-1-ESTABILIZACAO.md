# V43.7.1 — estabilização

## Escopo

Esta versão é deliberadamente pequena.

Ela não altera:

```text
data/content/lives.json
IDs dos vídeos
títulos cadastrados
datas cadastradas
ordem dos vídeos
integração YouTube
Cloudflare Pages assets
Nunito
Worker/API
layout
```

## Fallback da Home

Antes:

```text
Carregando lives da playlist...
```

Depois:

```text
Carregando últimas lives...
```

A mudança remove terminologia de uma arquitetura antiga que já não existe.

## Helper de Lives

O helper continua aceitando títulos com:

```text
aspas
barra invertida
acentos
emoji
pontuação
Unicode
```

Esses caracteres são serializados por `JSON.stringify`.

A V43.7.1 acrescenta apenas uma validação para detectar whitespace acidental:

```text
"Minha live"
→ válido

"Minha live\n"
→ sinalizado pelo helper

"  Minha live"
→ sinalizado pelo helper
```

O helper não aplica `trim()` automaticamente no conteúdo salvo, porque o título
deve continuar sob controle editorial da usuária.

## Datas e ordenação

A CI continua verificando somente se a data usa um valor ISO válido
`AAAA-MM-DD`.

A V43.7.1 não tenta decidir se as Lives devem estar em ordem cronológica e não
corrige datas automaticamente.
