# Conteúdo editorial

Arquivos desta pasta alimentam textos/listas do frontend sem necessidade de
alterar HTML.

- `hero.json` — Hero.
- `lives.json` — bloco de Lives e lista manual de vídeos.
- `regras.json` — regras.
- `creditos.json` — créditos.
- `home-doacoes.json` — CTA de apoio na Home.
- `doacoes.json` — textos da página de Doações.
- `ranking.json` — textos do ranking.
- `footer.json` — conteúdo do footer.
- `blog.json` — textos do Blog e índice de publicações.

A agenda semanal fica em `../agenda.json`.

## Lives

Cada item em `videos` contém:

```json
{
  "videoId": "ID_DO_YOUTUBE",
  "title": "Título editorial",
  "date": "YYYY-MM-DD"
}
```

Não adicionar campos de playlist/player/API.


## Blog

`blog.json` controla a visibilidade e a listagem do Blog.

A Navbar e a seção de Blog da Home só aparecem quando existe pelo menos um
item com `"published": true` e metadados válidos.

Cada item usa:

```json
{
  "slug": "meu-primeiro-post",
  "title": "Título do post",
  "date": "2026-09-08",
  "summary": "Resumo curto usado na listagem.",
  "tags": ["Reflexões", "Vida"],
  "readMinutes": 4,
  "published": true
}
```

Antes de marcar `published: true`, crie a página estática correspondente em:

```text
blog/<slug>/index.html
```

O corpo do post deve permanecer HTML estático para que título, description,
canonical e Open Graph possam ser lidos sem depender de JavaScript.

Não usar imagens de capa como requisito do Blog; a listagem é textual.
