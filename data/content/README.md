# Conteúdo editorial

Arquivos desta pasta alimentam textos e listas do frontend sem necessidade de alterar HTML.
Regras comuns a **todos** os arquivos:

- ícones: somente nomes aceitos por `js/core/button-icons.js`;
- URLs: caminho interno iniciado por `/` ou URL HTTP(S) (cada campo indica se exige HTTPS);
- nunca inserir HTML, SVG bruto, CSS, cores livres ou caminhos de assets;
- quebras de linha em campos multilinha usam `\n`;
- o validador (`python .github/scripts/validate-content.py`) rejeita chaves duplicadas e contratos inválidos.

## Mapa dos arquivos

| Arquivo | Conteúdo | Edição |
| --- | --- | --- |
| `hero.json` | Hero da Home | manual |
| `lives.json` | Configuração de Lives, Twitch primária e lista manual do YouTube (modelo em `lives.example.json`) | manual |
| `regras.json`, `creditos.json` | Cards de Regras e Créditos | manual |
| `home-doacoes.json` | CTA de apoio na Home | manual |
| `home-cards.json` | Composição da Home: ordem, visibilidade, tamanho, variante e cards personalizados | manual |
| `navbar.json` | Navbar compartilhada (texto, ícone, URL, ordem) | manual |
| `buttons.json` | Botões globais fora da Navbar | manual |
| `redes.json` | Redes sociais globais | manual |
| `footer.json` | Rodapé (inclui links para Privacidade e Uso de IA) | manual |
| `interface.json` | Textos de loader, rodapé, aviso de links externos, Configurações e fallback da Home | manual |
| `seo.json` | Metadados runtime de `home`, `doacoes`, `blog` e `artes` (páginas sem entrada mantêm o SEO estático) | manual |
| `404.json` | Textos da página de erro | manual |
| `doacoes.json`, `ranking.json` | Textos de Doações e do ranking | manual |
| `artes.json` | Textos e obras da Galeria | manual |
| `jogos-config.json` | Paginação de `/jogos/` | manual |
| `jogos-editorial.json` | Fichas editoriais de `/jogos/` (review, nota, playlist, transmissões, links), por `gameId` | manual |
| `jogos.json` | Catálogo de jogos das lives | **gerado** pelo sync de Jogos |
| `jogos-artwork.json`, `jogos-artwork-cache.json` | Artes e cache da Steam | **gerados** pelo sync de Jogos |

Fora desta pasta: o Blog fica em [`../blog/`](../blog/README.md) e a agenda semanal em `../agenda.json`
(**gerada** pelo sync da Agenda). Não edite à mão os arquivos "gerados": o próximo sync os sobrescreve.
O fluxo de Agenda e Jogos está em [`docs/AGENDA-E-JOGOS.md`](../../docs/AGENDA-E-JOGOS.md).

## Navbar

`navbar.json` usa `version: 2`. As chaves de `links` são estáveis e **não podem ser renomeadas**:
`inicio`, `lives`, `agenda`, `artes`, `blog`, `jogos`, `regras`, `creditos` e `apoio`. Cada entrada:

```json
{ "texto": "Blog", "icone": "none", "url": "/blog/" }
```

O botão Apoiar também pertence a este arquivo; `buttons.json` não controla a Navbar.

Dois campos controlam a ordem:

- `ordem`: lista sem duplicatas com a sequência visual dos nove itens. O runtime completa uma ordem
  ausente/incompleta com o padrão, mas o arquivo versionado deve listar todos exatamente uma vez.
- `apoioFixoNoFim` (booleano): com `true` — e também quando a chave está ausente — **Apoiar** é montado
  no slot dedicado à direita, fora da ordem. Com `false`, o mesmo link entra no grupo reordenável e ocupa
  a posição indicada em `ordem`. As outras oito chaves são reordenáveis nos dois modos.

## Redes sociais

`redes.json` usa `version: 1` e é a única fonte das redes do site. A ordem do array `redes` é a ordem
visual do dock/menu.

```json
{ "id": "youtube", "nome": "YouTube", "url": "https://youtube.com/kamyli", "icone": "youtube", "visivel": true }
```

`id` único em kebab-case, `url` HTTPS, `visivel` booleano; `icone` usa só glyphs sociais aprovados.
Desktop/tablet mostram uma barra vertical fixa; no mobile o mesmo conteúdo vira um botão expansível.

## Cards da Home

`home-cards.json` usa `version: 1`. A ordem de `cards` é a ordem visual da Home (máximo de 24). Os sete
tipos nativos são obrigatórios e aparecem exatamente uma vez:

```text
hero  lives  agenda  blog  regras  creditos  apoio
```

Nos nativos, `id` é igual ao `tipo` e só se pode alterar `visivel`, `tamanho` (`compacto` | `grande`),
`variante` (`padrao` | `suave` | `destaque`) e a posição no array. Ocultar não remove o conteúdo do card.
O conteúdo dos nativos continua em `hero.json`, `lives.json`, `data/agenda.json`, `data/blog/*`,
`regras.json`, `creditos.json` e `home-doacoes.json`; `home-cards.json` só controla a apresentação.

Cards adicionais usam `tipo: "personalizado"`:

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
    "acao": { "texto": "Saiba mais", "url": "/blog/", "icone": "arrow-right", "estilo": "contorno" }
  }
}
```

`alinhamento`: `esquerda` | `centro`. `acao.estilo`: `primario` | `contorno`. Texto e URL do CTA devem ser
preenchidos **juntos** ou ficar ambos vazios (sem botão).

## Galeria de Artes

`artes.json` (`version: 2`) controla os textos de `/artes/` e a lista de obras. A galeria é estática: o
navegador lê o JSON e busca cada imagem direto da URL HTTPS informada (não use Worker/KV/API como
hospedagem de imagem). A grade usa `preview` e o lightbox carrega `imagem` em alta qualidade só quando aberto.

```json
{
  "id": "exemplo-de-arte",
  "titulo": "Título da arte",
  "artista": "Nome ou @ da pessoa artista",
  "creditoUrl": "https://exemplo.com/original",
  "preview": "https://media.exemplo.com/artes/exemplo-preview.webp",
  "imagem": "https://media.exemplo.com/artes/exemplo.webp",
  "alt": "Descrição objetiva do conteúdo visual.",
  "data": "2026-09-10",
  "categoria": "Fanart",
  "tags": ["fanart", "comunidade"],
  "largura": 1200,
  "altura": 1600
}
```

- Obrigatórios: `id` (kebab-case e único), `titulo`, `artista`, `preview` e `imagem` (HTTPS absolutas),
  `alt`, `data` (`YYYY-MM-DD`) e `categoria`.
- Opcionais: `creditoUrl` (HTTPS quando informado) e `largura`/`altura` (inteiros positivos; recomendados
  para reduzir mudança de layout).
- A grade mostra só título e artista; o resto aparece no dialog.
- A busca não cria campos novos: usa `titulo`, `artista`, `categoria` e `tags`. Prefixos aceitos:
  `artista:` (ou `artist:`), `titulo:`, `categoria:` e `tag:`/`tags:`, com precedência sobre o seletor.

## Lives

`lives.json` mantém a lista manual do YouTube em `videos` e usa a Twitch como aba primária automática:

```json
{ "defaultPlatform": "twitch", "twitchCanalUrl": "https://www.twitch.tv/kamyli", "canalUrl": "https://youtube.com/kamyli" }
```

Cada item de `videos`:

```json
{ "videoId": "ID_DO_YOUTUBE", "title": "Título editorial", "date": "YYYY-MM-DD" }
```

Não copie VODs da Twitch para este JSON e não adicione player, iframe ou chave de API: a lista da Twitch vem
de `/twitch/videos`, normalizada pelo Worker.

## Agenda

`../agenda.json` tem sete dias (domingo a sábado). Pode ser gerada pelo sync do Trello e aceita várias lives
por dia (`lives`) sem remover os campos legados (`temLive`, `horario`, `titulo`, `descricao`,
`plataformas`), que espelham `lives[0]`. Contrato completo e formato do quadro:
[`docs/AGENDA-E-JOGOS.md`](../../docs/AGENDA-E-JOGOS.md).

## Jogos

`jogos-config.json` tem `version: 1` e `jogosPorPagina` (inteiro de 1 a 60; atual: 15). Alterar esse valor não
exige Trello, Steam nem novo sync. `jogos.json` e os arquivos de artwork são gerados pelo sync de Jogos e
não devem receber conteúdo manual.

`jogos-editorial.json` é a fonte manual das fichas da página `/jogos/`, separada do catálogo automático.
Cada entrada em `games` usa `gameId`, o ID hexadecimal de 24 caracteres do cartão Trello, para se manter
associada ao jogo quando o nome ou o status mudarem. O sync do Trello não lê nem reescreve esse arquivo.

Campos por ficha: `review` (texto simples), `rating` (0 a 10, incrementos de 0,5), `recommendation`
(`none`, `recommended`, `mixed` ou `not-recommended`), `containsSpoilers` (booleano), `playlistUrl`
(playlist HTTPS do YouTube), `episodes` (vídeos individuais com `videoId`, `title` e `date`) e `links`
(links HTTPS adicionais com `label` e `url`). A página mostra os vídeos como links externos; não incorpora
players nem usa YouTube Data API. Fichas sem correspondência com um cartão atual permanecem no JSON para
não perder texto caso um jogo seja arquivado ou retirado do quadro.

## Blog

O Blog não usa `data/content/blog.json`. A fonte é:

```text
data/blog/config.json        textos e visibilidade da listagem
data/blog/posts.json         índice derivado (sem o corpo)
data/blog/posts/<slug>.md    fonte de cada post
blog/<slug>/index.html       página estática de cada post (canonical/SEO próprios)
```

Contrato completo em [`../blog/README.md`](../blog/README.md).
