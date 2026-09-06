# Assets

## Formatos otimizados

A interface usa formatos progressivos, preservando fallbacks históricos.

```text
avatar-192.webp → avatar responsivo 1x / telas pequenas
avatar-384.webp → avatar responsivo para alta densidade
avatar.webp     → asset legado preservado
favicon.webp  → favicon moderno + ícone do loader
fundo.avif         → background AVIF de produção para desktop/tablet (já presente na main)
fundo-mobile.avif  → background 720p dedicado a telas até 760 px
fundo.webp         → fallback otimizado do background
logo.webp     → marca monocromática da navbar
```

PNGs preservados:

```text
avatar.png
favicon.png
fundo.png
preview.png
```

`preview.png` continua em PNG porque é a imagem 1200 × 630 declarada nos
metadados Open Graph/Twitter.

### Logo

`logo.webp` deve preservar transparência, pois a navbar o usa como máscara CSS
preenchida com `var(--primary-color)`.

### Fundo

A ordem do background é:

```text
Desktop/tablet:
fundo.avif → fundo.webp → fundo.png

Mobile (até 760 px):
fundo-mobile.avif → fundo.webp → fundo.png
```

Não adicionar preload para `fundo.avif`, `fundo.webp` ou `fundo.png`: a arte é
decorativa e não deve competir com conteúdo crítico da primeira renderização.

No modo `Save-Data`, a imagem decorativa é omitida e o site mantém
`var(--bg-color)` como fundo.

### Validação

O workflow verifica:

- assinatura dos cinco WebP obrigatórios (`avatar-192`, `avatar-384`, favicon, fundo e logo);
- assinatura ISO-BMFF compatível com AVIF em `fundo.avif` e `fundo-mobile.avif`;
- referências de fallback;
- ausência do fundo pesado no loader;
- integração do perfil de performance adaptativa.


### Avatar responsivo

Home e Doações usam `srcset` com `avatar-192.webp` e `avatar-384.webp`.
O navegador escolhe o arquivo adequado conforme tamanho renderizado e densidade
de pixels. `avatar.png` permanece como fallback para navegadores sem WebP.


### Estado do AVIF de produção

`assets/fundo.avif` já faz parte da `main` e é o arquivo servido para
desktop/tablet. Ele não é um pré-requisito pendente da V39.

Uma nova compressão pode substituir esse arquivo mantendo o mesmo nome e
caminho. O CI valida presença e assinatura AVIF, mas não fixa um tamanho em
bytes, para permitir novas otimizações sem alterar código ou documentação.

O mobile continua usando `assets/fundo-mobile.avif`.
