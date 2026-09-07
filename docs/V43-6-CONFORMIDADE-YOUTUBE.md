# V43.6 — Conformidade do player do YouTube

## Motivo

A implementação anterior usava um player auxiliar fora da área visível com
1×1 pixel apenas para executar:

```text
cuePlaylist()
getPlaylist()
```

A documentação atual do YouTube exige que players incorporados tenham uma
viewport de pelo menos 200×200 pixels.

A V43.6 remove completamente esse mecanismo.

## Novo fluxo

Nenhum recurso do YouTube é carregado quando a página apenas abre ou quando a
seção Lives entra na viewport.

```text
Home
↓
botão "Carregar lives"
↓ clique explícito
popup visível
↓
IFrame Player oficial
↓
cuePlaylist()
↓
getPlaylist()
↓
carrossel principal + mini-carrossel
```

O próprio player visível usado para assistir às lives é também o player usado
para obter os IDs da playlist.

Não existe segundo player, probe oculto ou iframe offscreen.

## Tamanho

O iframe declara:

```text
480×270
```

e o CSS garante:

```text
min-width: 200px
min-height: 200px
```

Assim o player não cai abaixo da viewport mínima documentada.

## Identificação do cliente

O iframe usa:

```text
Referrer-Policy:
strict-origin-when-cross-origin
```

e inclui:

```text
enablejsapi=1
origin=window.location.origin
```

O `origin` é dinâmico, portanto funciona tanto em produção quanto no domínio de
preview sem codificar hosts específicos.

## Autoplay

No primeiro clique em `Carregar lives`, a playlist é apenas preparada com:

```text
cuePlaylist()
```

sem reprodução automática.

Quando o visitante clica em uma thumbnail do carrossel, o popup já está visível
e a reprodução pode ser iniciada pela ação explícita:

```text
loadPlaylist()
playVideoAt()
```

Fechar o dialog destrói o player.

## Thumbnails

As thumbnails do carrossel principal já excediam o mínimo de 120×70.

As thumbnails compactas do popup foram ampliadas para no mínimo:

```text
128×72
```

Também foram removidos os badges de texto desenhados sobre as thumbnails.

Permanece somente o indicador visual de play no card principal.

## Privacidade e performance

A V43.6 melhora também o comportamento de privacidade:

```text
antes do clique:
nenhum IFrame Player
nenhum iframe_api do YouTube

depois do clique:
player oficial é carregado no popup
```

## Sem Google Cloud

Esta mudança não introduz:

```text
YouTube Data API
API key
Google Cloud
GitHub Action
backend
```

## Sem alterações

Não altera:

```text
data/content/lives.json
playlistId já configurado
Worker/API de doações
navbar
loader
footer
Agenda
arquivos históricos
```
