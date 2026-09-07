# V43 — Playlist de lives via embed do YouTube

## Base

Esta V43 deve ser aplicada diretamente sobre a V42.5.

As propostas anteriores chamadas V43/V43.1, que usavam YouTube Data API,
Google Cloud e GitHub Actions, foram abandonadas e não fazem parte desta
versão.

## Objetivo

Adicionar uma seção `#lives` acima da Agenda usando apenas o player oficial de
playlist do YouTube.

Não existe:

```text
Google Cloud
YouTube Data API
API key
Secret
Action de sincronização
JSON gerado por bot
```

## Arquitetura

```text
data/content/lives.json
        ↓
js/pages/home/lives.js
        ↓
iframe lazy de playlist
        ↓
youtube-nocookie.com/embed/videoseries
```

A Home continua estática no GitHub Pages.

## Modularidade

A Agenda permanece intacta:

```text
Agenda
→ js/pages/home/home.js
→ css/pages/home.css
```

Lives possui seus próprios arquivos:

```text
Lives
→ data/content/lives.json
→ js/pages/home/lives.js
→ css/components/lives.css
```

## Configurar a playlist

Edite:

```text
data/content/lives.json
```

Preencha somente `playlistId`.

Exemplo:

```json
{
  "playlistId": "PLxxxxxxxxxxxxxxxx"
}
```

Não cole `?list=` nesse campo. Use apenas o identificador que aparece depois de
`list=` na URL da playlist.

Exemplo de URL:

```text
https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx
```

Valor a copiar:

```text
PLxxxxxxxxxxxxxxxx
```

O ID de uma playlist pública não é segredo e pode permanecer no repositório.

## Sem playlist configurada

Enquanto `playlistId` estiver vazio:

- a seção continua visível;
- o player não é criado;
- o botão de carregar permanece desativado;
- o visitante pode usar `Abrir no YouTube` para acessar o canal.

Isso permite publicar a V43 antes de criar a playlist.

## Carregamento do player

O `iframe` não existe no HTML inicial.

```text
página abre
→ nenhum player do YouTube carregado

usuário clica em "Carregar playlist"
→ JS cria o iframe
→ playlist é carregada
```

Isso evita adicionar o peso do player ao caminho crítico da Home.

O player usa:

```text
https://www.youtube-nocookie.com/embed/videoseries?list=...
```

e mantém a interface interna oficial do YouTube.

O CSS do site estiliza o card, bordas, espaçamento, fundo, botão e responsividade,
mas não tenta modificar o conteúdo interno do iframe.

## Atualização das lives

Não há sincronização.

Quando você adiciona, remove ou reorganiza vídeos na própria playlist do
YouTube, o embed continua apontando para a mesma playlist.

Portanto não é necessário:

```text
commit
deploy
GitHub Action
esperar 12 horas
```

para refletir alterações na lista do YouTube.

## Navbar

A V43 adiciona:

```text
Lives
```

entre `Início` e `Agenda`.

O link usa `#lives` e participa do scrollspy já existente.

## Privacidade e performance

- o player só é criado depois de interação explícita;
- o domínio de embed usado é `youtube-nocookie.com`;
- não existe API key no frontend;
- o iframe usa `referrerPolicy="strict-origin-when-cross-origin"`;
- o componente não adiciona `backdrop-filter` próprio;
- o `glass-panel` ancestral continua seguindo Blur automático/ligado/desligado;
- reduced motion e performance reduzida continuam respeitados.

## Sem alterações

A V43 não altera:

```text
workers.js
js/core/api.js
js/core/config.js
ranking
OAuth
KV
CORS
DNS
loader
footer
preferências
transição Home → Doações
```
