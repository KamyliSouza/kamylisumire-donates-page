# ALTERACOES-UI-V27.md

## Loader

O texto visual:

```text
Carregando...
```

foi removido.

Agora o loader mostra somente o favicon pulsando na cor primária.

O elemento continua com:

```html
role="status"
aria-label="Carregando o site"
```

portanto permanece acessível para leitores de tela.

## Toggle de blur

O ícone anterior de dois painéis sobrepostos foi substituído por uma gota
simples em SVG.

Estado normal:

```text
💧
```

Quando o blur está desligado, a gota recebe a linha diagonal já usada pelo
controle para indicar o estado OFF.

O SVG continua usando `currentColor`, portanto acompanha a cor primária,
hover e temas claro/escuro.

## Arquivos alterados

```text
index.html
doacoes/index.html
css/core/global.css
css/core/navbar.css
js/core/navbar.js
```

Todas as alterações anteriores da V26 foram preservadas.
