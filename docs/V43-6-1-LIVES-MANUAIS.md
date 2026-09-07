# V43.6.1 — Lives manuais + metadata + borda de contraste

## Objetivo

O carrossel deixa de descobrir vídeos automaticamente e passa a usar uma lista
manual em `data/content/lives.json`.

Cada item contém somente:

```json
{
  "videoId": "abcdefghijk",
  "title": "Título exatamente como publicado no YouTube",
  "date": "2026-09-06"
}
```

A ordem do array define a ordem do carrossel.

## Thumbnail

A miniatura é montada diretamente a partir do `videoId`:

```text
https://i.ytimg.com/vi/VIDEO_ID/mqdefault.jpg
```

Ela é carregada quando a página abre (`loading="eager"`), sem depender de
IFrame Player API, playlist discovery ou Google Cloud.

A imagem é mostrada sem texto, filtro ou botão de play sobreposto. O título e a
data aparecem fora da thumbnail.

## Reprodução

A V43.6.1 não incorpora player do YouTube.

O card é um link HTTPS normal para:

```text
https://www.youtube.com/watch?v=VIDEO_ID
```

Portanto:

```text
sem iframe
sem YT.Player
sem enablejsapi
sem autoplay
sem player oculto
sem getPlaylist
sem cuePlaylist
sem Data API
sem API key
```

O fluxo de confirmação de links externos do site continua sendo aplicado.

## Por que o embed foi removido

As políticas atuais do YouTube impõem requisitos adicionais a clientes que
incorporam vídeos, inclusive a obrigação de conhecer/tratar o status Made For
Kids de cada vídeo incorporado. A documentação oficial direciona essa consulta
para a YouTube Data API.

Como este projeto decidiu não usar Google Cloud/Data API, a V43.6.1 deixa de
incorporar os vídeos e envia o visitante para a página oficial do YouTube.

Isso evita fingir conformidade com uma obrigação que o frontend sem Data API não
conseguiria cumprir de forma verificável.

## Metadata manual

`title` deve ser copiado exatamente do vídeo publicado no YouTube.

`date` deve corresponder à data real de publicação e usa ISO `AAAA-MM-DD`.

Esses campos não são consultados nem corrigidos automaticamente.

## Borda de maior contraste

Foi criado:

```css
--card-border-strong
```

Claro:

```text
rgba(179, 94, 175, 0.46)
```

Escuro:

```text
rgba(235, 170, 232, 0.58)
```

O token é aplicado às bordas dos cards e controles de Lives. O restante do
sistema continua usando `--card-border`.

## Configuração segura

O hotfix **não sobrescreve** `data/content/lives.json`, pois esse arquivo pode
conter o `playlistId` e demais textos já configurados pela usuária.

Depois de aplicar o ZIP, adicione a chave `videos` ao arquivo existente.

`data/content/lives.example.json` serve como referência.
