# Assets

## Formatos principais da V34

Coloque nesta pasta os arquivos WebP otimizados:

```text
avatar.webp   → avatar exibido na Home e em Doações
favicon.webp  → favicon moderno + ícone do loader
fundo.webp    → background principal otimizado
logo.webp     → marca da navbar
```

Os PNGs antigos continuam no repositório como fallback:

```text
avatar.png
favicon.png
fundo.png
preview.png
```

`preview.png` continua em PNG porque é a imagem de Open Graph/Twitter e não
faz parte do carregamento visual normal da página.

### Importante

`logo.webp` deve preservar transparência, pois a navbar o usa como máscara
CSS preenchida com `var(--primary-color)`.

O workflow de validação verifica se os quatro WebP existem e possuem
assinatura WebP válida.
