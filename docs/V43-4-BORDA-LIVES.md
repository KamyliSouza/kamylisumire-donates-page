# V43.4 — Borda dos cards do carrossel de Lives

## Objetivo

Deixar a borda dos cards de Lives tão perceptível quanto a borda dos cards da
Agenda, sem alterar a fonte de dados nem a geometria 16:9.

## Motivo visual

Agenda possui conteúdo textual sobre uma superfície de card, portanto:

```css
border: 1px solid var(--card-border);
```

fica naturalmente visível.

Lives usa thumbnail em full-bleed. Embora já utilizasse o mesmo token, a imagem
podia reduzir visualmente o contraste da borda.

## Solução

O card continua usando:

```css
border: 1px solid var(--card-border);
```

e ganha um frame adicional renderizado por cima da thumbnail:

```css
.live-thumb-card::after
```

Esse frame:

```text
usa var(--card-border)
não altera largura/altura
não altera 16:9
não recebe cliques
acompanha border-radius
```

## Estados

Normal:

```text
var(--card-border)
```

Hover, foco e última live aberta:

```text
var(--primary-color)
```

No estado ativo existe também um leve frame interno na cor primária para tornar
a seleção perceptível sobre thumbnails claras ou escuras.

## Escopo

Não altera:

```text
playlist
YouTube IFrame API
popup
mini-carrossel do popup
JavaScript funcional
Agenda
navbar
loader
footer
Worker/API
arquivos históricos
```
