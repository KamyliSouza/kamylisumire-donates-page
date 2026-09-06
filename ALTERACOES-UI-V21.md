# ALTERACOES-UI-V21.md

## Footer global normalizado

Home e `/doacoes/` agora usam exatamente o mesmo footer.

Novo componente compartilhado:

```text
js/core/footer.js
```

As duas páginas possuem apenas o mount:

```html
<footer
    class="site-footer"
    id="site-footer"
    aria-label="Créditos e informações do site"
></footer>
```

## Créditos fixos no footer

Os créditos da identidade visual aparecem sempre:

```text
Arte do fundo por @h0wl_oficial
Avatar por @maililac
```

Links:

```text
@h0wl_oficial
https://www.instagram.com/h0wl_oficial/

@maililac
https://bsky.app/profile/maililac.bsky.social
```

Esses créditos não dependem de:

```text
data/creditos.json
js/pages/home/content.js
```

Portanto continuam no footer mesmo que o conteúdo do card de Créditos seja
editado, removido ou tenha erro de carregamento.

## Informações também normalizadas

As duas páginas agora mostram igualmente:

```text
© ano atual Kamyli Sumire. Todos os direitos reservados.
Ver código fonte
```

O ano é calculado automaticamente pelo JavaScript.

## Layout

Desktop:

```text
Arte do fundo... · Avatar...       © ... · Ver código fonte
```

Mobile:

```text
Arte do fundo... · Avatar...
© ... · Ver código fonte
```

No mobile o conteúdo centraliza e quebra linha naturalmente.

## Doações

A classe específica:

```text
.donation-footer
```

foi removida.

A página de Doações passa a usar somente o estilo global `.site-footer`, igual
à Home e às futuras páginas do site.

## Arquivos alterados/adicionados

```text
index.html
doacoes/index.html

css/core/global.css
css/pages/doacoes.css

js/core/footer.js   # novo
```

Todas as alterações anteriores da V20 foram preservadas.
