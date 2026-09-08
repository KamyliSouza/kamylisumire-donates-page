# Conteúdo do Blog

O Blog usa arquivos separados.

```text
data/blog/config.json
data/blog/posts.json
data/blog/posts/<slug>.json
blog/<slug>/index.html
```

- `config.json`: textos da listagem, da Home e dos artigos.
- `posts.json`: índice leve com metadados. Não contém o corpo.
- `posts/<slug>.json`: fonte completa de um artigo.
- `blog/<slug>/index.html`: HTML estático publicado/SEO.

A Navbar e a seção do Blog na Home aparecem somente quando `posts.json`
possui ao menos um post válido com `published: true`.

O corpo de um post usa blocos seguros (`paragraph`, `heading`, `quote`,
`list`) e não deve conter HTML bruto.
