# V43.7 — assets públicos no Cloudflare Pages

## Arquitetura

```text
kamylisumire.com
└── código, JSONs, helpers e Nunito no repositório

https://assets.kamylisumire.com
└── imagens públicas no Cloudflare Pages Direct Upload
```

Não há R2, Worker ou Pages Function envolvidos na entrega dos assets.

## Arquivos externos

```text
avatar-192.webp
avatar-384.webp
avatar.png
favicon.webp
favicon.png
fundo.avif
fundo-mobile.avif
fundo.webp
fundo.png
logo.webp
preview.png
```

## CSS mask e CORS

A logo continua colorida por CSS:

```css
background-color: var(--primary-color);
mask-image: url("https://assets.kamylisumire.com/logo.webp");
```

O projeto de assets precisa ter na raiz:

```text
/*
  Access-Control-Allow-Origin: *
  Cross-Origin-Resource-Policy: cross-origin
```

O wildcard é apropriado neste projeto porque todos os arquivos servidos são
assets deliberadamente públicos e não usam credenciais.

## Direct Upload

Cada novo deployment deve representar a pasta completa desejada:

```text
_headers
avatar-192.webp
avatar-384.webp
avatar.png
favicon.webp
favicon.png
fundo.avif
fundo-mobile.avif
fundo.webp
fundo.png
logo.webp
preview.png
```

Não publicar somente `_headers`, pois isso criaria um deployment sem os assets.

## Repositório

Continuam locais:

```text
assets/fonts/nunito-variable.woff2
assets/fonts/OFL.txt
```

Os 11 assets gráficos devem ser removidos do working tree após a origem externa
estar confirmada.

## SEO

Open Graph e Twitter Card usam:

```text
https://assets.kamylisumire.com/preview.png
```

O JSON-LD da pessoa usa:

```text
https://assets.kamylisumire.com/avatar.png
```

## Histórico Git

A V43.7 remove os arquivos do estado atual do repositório, mas não apaga versões
anteriores do histórico Git. Uma eventual reescrita de histórico deve ser feita
separadamente.
