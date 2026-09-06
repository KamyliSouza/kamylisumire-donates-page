# ALTERACOES-UI-V22.md

## Favicon da navbar usando a cor primária

O favicon da navbar deixou de ser renderizado diretamente como `<img>`.

Agora ele funciona como uma máscara CSS:

```css
.site-brand-logo {
    background-color: var(--primary-color);

    mask-image: url('../../assets/favicon.png');
    mask-size: contain;
    mask-position: center;
    mask-repeat: no-repeat;
}
```

Também existe o prefixo `-webkit-mask-*` para Safari.

## Resultado

A forma/transparência do arquivo:

```text
assets/favicon.png
```

é preservada, mas sua cor passa a acompanhar:

```css
var(--primary-color)
```

Portanto:

```text
Tema claro
→ favicon usa #B35EAF

Tema escuro
→ favicon usa #d178cd
```

Se a cor primária for alterada futuramente no design system, o favicon da
navbar acompanha automaticamente.

## Fallback

Em navegadores sem suporte a CSS Mask, o favicon original continua sendo
mostrado normalmente.

## Arquivos alterados

```text
js/core/navbar.js
css/core/navbar.css
```

Todas as alterações anteriores da V21 foram preservadas.
