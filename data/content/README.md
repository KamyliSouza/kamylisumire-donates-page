# Conteúdo editorial

Arquivos desta pasta alimentam textos/listas do frontend sem necessidade de
alterar HTML.

- `hero.json` — Hero.
- `lives.json` — configuração de Lives, Twitch primária e lista manual do YouTube.
- `regras.json` — regras.
- `creditos.json` — créditos.
- `home-doacoes.json` — CTA de apoio na Home.
- `doacoes.json` — textos da página de Doações.
- `ranking.json` — textos do ranking.
- `footer.json` — conteúdo do footer, incluindo o link interno para a Política de Privacidade.
- `blog.json` — textos do Blog e índice de publicações.

A agenda semanal fica em `../agenda.json`.

## Lives

A V47.4 mantém a lista manual do YouTube em `videos` e usa a Twitch como aba
primária automática. Os campos de plataforma são:

```json
{
  "defaultPlatform": "twitch",
  "twitchCanalUrl": "https://www.twitch.tv/kamyli",
  "canalUrl": "https://youtube.com/kamyli"
}
```

Cada item manual de YouTube em `videos` contém:

```json
{
  "videoId": "ID_DO_YOUTUBE",
  "title": "Título editorial",
  "date": "YYYY-MM-DD"
}
```

Não copiar VODs da Twitch para este JSON e não adicionar player/iframe/API key.
A lista automática da Twitch vem de `/twitch/videos` e é normalizada pelo Worker.


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
