# Conteúdo do Blog

O Blog V47 usa Markdown como fonte dos artigos e mantém a publicação final
100% estática.

```text
data/blog/config.json
data/blog/posts.json
data/blog/posts/<slug>.md
blog/<slug>/index.html
```

- `config.json`: textos da listagem, da Home e dos artigos.
- `posts.json`: índice leve com metadados. Não contém o corpo.
- `posts/<slug>.md`: fonte completa e legível do artigo.
- `blog/<slug>/index.html`: HTML estático compilado pelo Helper para publicação/SEO.

## Front matter

Cada Markdown começa com metadados controlados:

```md
---
slug: "meu-post"
title: "Meu post"
date: "2026-09-08"
summary: "Resumo do post."
tags: ["Reflexões"]
readMinutes: 3
published: true
---

Texto do artigo...
```

Os valores do front matter usam literais JSON. O Helper mantém o índice
`posts.json` sincronizado e calcula `readMinutes` automaticamente.

## Markdown permitido

São aceitos títulos H2–H4, parágrafos, negrito, itálico, links, citações,
listas, código inline/blocos, separadores e imagens externas HTTPS.
HTML bruto não é permitido.

Imagem externa:

```md
![Descrição](https://assets.example.com/imagem.webp "Legenda opcional")
```

Imagem com link externo:

```md
[![Descrição](https://assets.example.com/imagem.webp "Legenda opcional")](https://example.com)
```

A URL da imagem e o destino clicável devem usar HTTPS. O `alt` é obrigatório.

A Navbar e a seção do Blog na Home aparecem somente quando `posts.json`
possui ao menos um post válido com `published: true`.
