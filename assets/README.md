# Assets

## Assets de produção

```text
avatar-192.webp    avatar responsivo
avatar-384.webp    avatar para maior densidade
avatar.png         fallback do avatar

favicon.webp       favicon moderno + loader
favicon.png        fallback do favicon

fundo.avif         background desktop/tablet
fundo-mobile.avif  background mobile
fundo.webp         fallback otimizado
fundo.png          fallback legado

logo.webp          máscara monocromática da navbar
preview.png        preview social 1200 × 630
```

`avatar.webp` foi removido na V40 porque não existe referência de runtime.

## Avatar

Home:

```text
avatar-192.webp 192w
avatar-384.webp 384w
```

Doações usa os mesmos arquivos.

`avatar.png` continua como fallback.

## Logo

`logo.webp` precisa continuar com fundo transparente porque é usado como
máscara CSS preenchida pela cor primária.

## Background

```text
desktop/tablet:
fundo.avif → fundo.webp → fundo.png

mobile <= 760 px:
fundo-mobile.avif → fundo.webp → fundo.png
```

Não adicionar preload ao background decorativo.

Com `Save-Data`, a imagem decorativa pode ser omitida.

## Preview social

`preview.png` permanece PNG 1200 × 630 e é referenciado estaticamente por Open
Graph e Twitter/X.

## CI

`.github/scripts/validate-content.py` verifica presença/assinatura dos
WebP/AVIF, integração dos fallbacks e ausência do `avatar.webp` legado.
