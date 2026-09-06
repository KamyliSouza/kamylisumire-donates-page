# Assets

## Formatos otimizados

A interface usa formatos progressivos, preservando fallbacks históricos.

```text
avatar.webp   → avatar exibido na Home e em Doações
favicon.webp  → favicon moderno + ícone do loader
fundo.avif    → primeira opção do background
fundo.webp    → fallback otimizado do background
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
AVIF → WebP → PNG
```

Não adicionar preload para `fundo.avif`, `fundo.webp` ou `fundo.png`: a arte é
decorativa e não deve competir com conteúdo crítico da primeira renderização.

No modo `Save-Data`, a imagem decorativa é omitida e o site mantém
`var(--bg-color)` como fundo.

### Validação

O workflow verifica:

- assinatura dos quatro WebP;
- assinatura ISO-BMFF compatível com AVIF em `fundo.avif`;
- referências de fallback;
- ausência do fundo pesado no loader;
- integração do perfil de performance adaptativa.
