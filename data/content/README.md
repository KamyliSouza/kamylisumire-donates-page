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
- `artes.json` — textos e entradas da Galeria de Artes.

A configuração e as fontes do Blog ficam em `../blog/`, fora desta pasta.

A agenda semanal fica em `../agenda.json`.

## Galeria de Artes

`artes.json` controla os textos da página `/artes/` e a lista editorial de obras.
A galeria é estática: o navegador lê este JSON localmente e busca cada imagem
diretamente da URL HTTPS informada. Não usar Worker/KV/API como hospedagem de
imagem.

Desde a V48.0.1, a grade usa `preview` e o lightbox carrega `imagem` em alta qualidade apenas quando aberto. Ambas devem ser URLs HTTPS.

Estrutura de uma obra:

```json
{
  "id": "exemplo-de-arte",
  "titulo": "Título da arte",
  "artista": "Nome ou @ da pessoa artista",
  "creditoUrl": "https://exemplo.com/original",
  "imagem": "https://media.exemplo.com/artes/exemplo.webp",
  "alt": "Descrição objetiva do conteúdo visual.",
  "data": "2026-09-10",
  "categoria": "Fanart",
  "tags": ["fanart", "comunidade"],
  "largura": 1200,
  "altura": 1600
}
```

`creditoUrl`, `largura` e `altura` são opcionais. `imagem` deve ser URL HTTPS
absoluta; `creditoUrl`, quando preenchido, também. `id` usa kebab-case e deve ser
único. `alt` é obrigatório. Dimensões conhecidas são recomendadas para reduzir
mudanças de layout enquanto a imagem carrega.

As imagens preservam a proporção original em masonry e os metadados aparecem
sobre a base da imagem com gradiente/sombra. Enquanto uma imagem carrega, o card
reutiliza `.site-loader-logo`, o mesmo símbolo visual do loader global.

A busca não cria novos campos no JSON. O seletor da página usa diretamente
`titulo`, `artista`, `categoria` e `tags`. Prefixos aceitos: `artista:` (ou
`artist:`), `titulo:`, `categoria:` e `tag:`/`tags:`. O prefixo digitado tem
precedência sobre o seletor de campo.


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

O Blog não usa `data/content/blog.json`. A arquitetura vigente é:

```text
data/blog/config.json
data/blog/posts.json
data/blog/posts/<slug>.md
blog/<slug>/index.html
sitemap.xml
```

`data/blog/config.json` controla os textos/visibilidade editorial da listagem.
`data/blog/posts/<slug>.md` é a fonte de cada publicação e
`data/blog/posts.json` é o índice derivado. Um post publicado também precisa da
página estática correspondente em `blog/<slug>/index.html`, com canonical/SEO
próprios. A busca da listagem usa apenas `title`, `summary` e `tags`, com seletor
de campo e prefixos `titulo:`, `resumo:` e `tag:`/`tags:`; não há campo editorial
novo para essa funcionalidade. Consulte `../blog/README.md` para o contrato
completo.
