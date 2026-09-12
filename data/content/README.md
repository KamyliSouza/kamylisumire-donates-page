# Conteúdo editorial

Arquivos desta pasta alimentam textos/listas do frontend sem necessidade de
alterar HTML.

- `hero.json` — Hero.
- `lives.json` — configuração de Lives, Twitch primária e lista manual do YouTube.
- `regras.json` — regras.
- `creditos.json` — créditos.
- `home-doacoes.json` — CTA de apoio na Home.
- `home-cards.json` — composição/layout da Home: ordem, visibilidade, tamanho, variante e cards personalizados.
- `doacoes.json` — textos da página de Doações.
- `ranking.json` — textos do ranking.
- `footer.json` — conteúdo do footer, incluindo o link interno para a Política de Privacidade.
- `artes.json` — textos e entradas da Galeria de Artes.
- `navbar.json` — Navbar compartilhada (`version: 2`), com texto, ícone e URL de cada item.
- `buttons.json` — botões globais fora da Navbar.

A configuração e as fontes do Blog ficam em `../blog/`, fora desta pasta.

A agenda semanal fica em `../agenda.json`.

## Navbar

Desde a V48.2.0, `navbar.json` usa `version: 2`. As chaves de `links` são estáveis e não devem ser renomeadas: `inicio`, `lives`, `agenda`, `artes`, `blog`, `jogos`, `regras`, `creditos` e `apoio`. Cada entrada contém:

```json
{
  "texto": "Blog",
  "icone": "none",
  "url": "/blog/"
}
```

`icone` deve ser um nome aceito por `js/core/button-icons.js`. `url` aceita caminho interno iniciado por `/` ou URL HTTP(S). Não inserir HTML, SVG bruto ou caminhos de assets no JSON. O botão Apoiar também pertence a este arquivo; `buttons.json` não controla mais a Navbar.


## Cards da Home

Desde a V48.2.0, `home-cards.json` usa `version: 1`. A ordem de `cards` é a ordem visual da Home. Os sete tipos nativos são obrigatórios e aparecem exatamente uma vez:

```text
hero
lives
agenda
blog
regras
creditos
apoio
```

Nos cards nativos, `id` deve ser igual ao `tipo`. É permitido alterar somente `visivel`, `tamanho` (`compacto` ou `grande`) e `variante` (`padrao`, `suave` ou `destaque`), além da própria posição no array. Ocultar não remove o conteúdo nem o contrato original do card.

O conteúdo dos nativos continua em `hero.json`, `lives.json`, `data/agenda.json`, `data/blog/*`, `regras.json`, `creditos.json` e `home-doacoes.json`. `home-cards.json` controla composição/apresentação, não substitui essas fontes.

Cards adicionais usam `tipo: "personalizado"`. Exemplo:

```json
{
  "id": "minha-chamada",
  "tipo": "personalizado",
  "visivel": true,
  "tamanho": "compacto",
  "variante": "suave",
  "alinhamento": "esquerda",
  "conteudo": {
    "eyebrow": "Novidade",
    "titulo": "Título do card",
    "descricao": "Texto opcional seguindo a tipografia do site.",
    "icone": "heart",
    "acao": {
      "texto": "Saiba mais",
      "url": "/blog/",
      "icone": "arrow-right",
      "estilo": "contorno"
    }
  }
}
```

`icone` e `acao.icone` usam somente nomes de `js/core/button-icons.js`. `acao.url` aceita caminho interno iniciado por `/` ou URL HTTP(S); texto e URL do CTA devem ser preenchidos juntos ou ambos ficar vazios. Não inserir HTML, SVG bruto, CSS, cores arbitrárias ou assets no JSON. O limite global é 24 cards.

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


### Navbar reordenável — V48.3.0

`data/content/navbar.json` mantém as nove chaves estáveis em `links` e adiciona `ordem`, uma lista sem duplicatas que determina a sequência visual dos nove itens. O runtime completa uma ordem ausente/incompleta com o padrão para compatibilidade, mas o conteúdo versionado atual deve listar todos os itens exatamente uma vez. **Apoiar** continua com estilo de CTA, porém participa do mesmo fluxo reordenável.
### Apoiar fixo opcional — V48.3.1

`data/content/navbar.json` aceita `apoioFixoNoFim`. Com `true` — e também quando a chave está ausente, por compatibilidade — o runtime aplica `ordem` aos itens e força **Apoiar** para o final, mantendo a posição histórica do CTA. Com `false`, `apoio` participa livremente da posição definida em `ordem`. As outras oito chaves continuam reordenáveis nos dois modos.

### Slot histórico de Apoiar — V48.3.2

`apoioFixoNoFim: true` significa posição histórica real: o link `apoio` é montado no slot dedicado à direita. `false` coloca o mesmo link no grupo reordenável e sua posição passa a ser a indicada por `ordem`.
