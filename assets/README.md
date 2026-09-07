# Assets locais

Desde a V43.7, os assets gráficos públicos usados pelo site não ficam mais
neste repositório.

Origem pública:

```text
https://assets.kamylisumire.com/
```

Arquivos externos esperados:

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

O diretório `assets/` continua reservado para materiais que deliberadamente
permanecem no repositório.

## Nunito

O runtime continua carregando localmente:

```text
assets/fonts/nunito-variable.woff2
assets/fonts/OFL.txt
```

A licença OFL da Nunito deve permanecer junto do projeto.

## Logo como CSS mask

`logo.webp` continua sendo uma imagem transparente usada por
`mask-image`/`-webkit-mask-image`.

Como a imagem agora vem de `assets.kamylisumire.com`, o projeto Cloudflare
Pages que hospeda os assets deve responder com CORS para os arquivos públicos.

Configuração mínima no `_headers` da raiz do projeto de assets:

```text
/*
  Access-Control-Allow-Origin: *
  Cross-Origin-Resource-Policy: cross-origin
```

Não reintroduzir cópias locais dos assets gráficos apenas como fallback.
