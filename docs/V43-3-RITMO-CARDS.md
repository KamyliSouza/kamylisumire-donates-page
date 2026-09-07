# V43.3 — Espaçamento uniforme entre título e descrição

## Objetivo

Eliminar diferenças visuais entre cards que usavam 4px, 6px, 7px, 10px ou um
espaçamento herdado maior entre o título e a descrição.

## Regra

```css
--card-title-description-gap: 8px;
```

O token fica em `css/core/variables.css`.

## Componentes cobertos

```text
Home / Lives
Home / Agenda
Home / Regras
Home / Créditos
Home / CTA de doações
Doações / card principal
Doações / Ranking
404
```

## Por que não aplicar a todos os textos

Título/subtítulo dentro de botões e outros elementos compactos não são tratados
como cards de conteúdo. Manter a densidade própria desses componentes evita
aumentar botões e linhas de lista desnecessariamente.

## Escopo

Somente CSS, CI e documentação.

Não altera:

```text
data/content/lives.json
JavaScript funcional
navbar
loader
footer
Worker/API
arquivos históricos de versões anteriores
```
