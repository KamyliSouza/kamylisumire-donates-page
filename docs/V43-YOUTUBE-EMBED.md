# V43.1 — Carrossel de lives com player em popup

## Base

Esta V43.1 parte da V43 de playlist embed já aplicada no repositório.

Ela não deve ser aplicada diretamente sobre a V42.5. Para uma instalação limpa,
a ordem é:

```text
V42.5
→ V43 playlist embed
→ V43.1 carrossel + popup
```

O hotfix não remove nem substitui arquivos antigos não relacionados, inclusive
arquivos históricos que já existam no repositório.

## Objetivo

A seção Lives deixa de exibir um player integrado diretamente à Home.

A nova experiência é:

```text
playlist pública
↓
YouTube IFrame Player API
↓
IDs da playlist
↓
carrossel de thumbnails
↓
clique em uma live
↓
dialog modal
↓
player youtube-nocookie.com
```

Não existe Google Cloud, YouTube Data API ou API key.

## Arquitetura modular

```text
data/content/lives.json
→ configuração pública da playlist

js/pages/home/lives.js
→ descoberta dos IDs
→ carrossel
→ popup/player

css/components/lives.css
→ aparência exclusiva de Lives
```

A Agenda continua independente:

```text
js/pages/home/home.js
css/pages/home.css
```

## Configuração da playlist

Continue usando o mesmo arquivo criado na V43:

```text
data/content/lives.json
```

Preencha:

```json
"playlistId": "PLxxxxxxxxxxxxxxxx"
```

Use somente o conteúdo que aparece depois de `list=` na URL pública da
playlist.

O campo:

```json
"maxItems": 10
```

define quantas thumbnails serão exibidas. Valores aceitos: 3 a 20.

## Como o carrossel é obtido sem Data API

Quando a seção Lives se aproxima da viewport, o site carrega a IFrame Player
API oficial do YouTube.

Um player auxiliar de 1×1 pixel é criado fora da área visível apenas para:

```text
cuePlaylist(...)
getPlaylist()
```

Depois que a ordem atual dos IDs é obtida, esse player auxiliar é destruído.

As thumbnails são montadas com:

```text
https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg
```

Isso mantém o carrossel atualizado conforme a playlist muda, sem credenciais e
sem sincronização de backend.

## Limitação sem YouTube Data API

A IFrame Player API fornece a lista de IDs, mas não fornece em uma única
consulta os títulos, datas e metadados completos de todos os vídeos.

Por isso cada card usa:

```text
thumbnail
+ indicador de play
+ Live 1 / Live 2 / ...
```

## Popup

O player visível existe somente dentro de um `<dialog>`.

```text
Home
→ carrossel de thumbnails

clique
→ dialog.showModal()
→ player da live escolhida
```

O popup fecha por:

```text
×
Esc
clique no backdrop
```

Ao fechar, o iframe é removido do DOM. A reprodução é interrompida imediatamente
e os recursos do player são liberados.

O player usa:

```text
youtube-nocookie.com
```

e recebe também o `playlistId`, mantendo o contexto da playlist.

## Tema e blur

O dialog segue os tokens visuais existentes.

Com blur ligado:

```text
backdrop
→ blur(var(--blur-card))

card do popup
→ blur(var(--blur-card))
```

Com blur desligado:

```text
sem backdrop-filter
```

O título `Assistir live` usa `var(--primary-color)`.

## Performance

A IFrame Player API não entra no caminho crítico inicial.

Ela é carregada somente quando `#lives` chega a aproximadamente 500 px da
viewport.

As thumbnails usam:

```text
loading="lazy"
decoding="async"
```

O player de reprodução só existe enquanto o popup estiver aberto.

`prefers-reduced-motion` e `data-performance="reduced"` continuam respeitados.

## Atualização da playlist

Não existe sincronização.

Quando a playlist muda no YouTube, uma nova visita ou recarregamento obtém a
lista atualizada.

Não é necessário:

```text
GitHub Action
commit automático
Google Cloud
API key
YouTube Data API
```

## Sem alterações

A V43.1 não altera:

```text
workers.js
js/core/api.js
js/core/config.js
ranking
loader
footer
preferências
transição Home → Doações
```
