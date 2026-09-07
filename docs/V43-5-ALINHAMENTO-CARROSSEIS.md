# V43.5 — Alinhamento lateral dos carrosséis

## Objetivo

Reduzir o espaço vazio nas laterais dos carrosséis e alinhar melhor o primeiro
e o último card com as bordas internas dos painéis.

## Carrosséis principais

Foi criado:

```css
--carousel-edge-gutter: 8px;
```

Agenda e Lives usam o mesmo valor em três pontos:

```text
margem negativa do wrapper
padding horizontal do track
scroll-padding-inline
```

O wrapper avança 8px e o track devolve 8px. Assim o primeiro e o último card
ficam alinhados à mesma linha usada pelos títulos e descrições do painel.

O padding antigo era 20px, portanto havia mais vazio lateral do que o necessário.

## Setas

Quando uma seta de extremo está desabilitada:

```text
opacity: 0
pointer-events: none
```

Ela deixa de parecer uma margem circular vazia sobre o primeiro ou último card.

## Mini-carrossel do popup

A área reservada para controles foi reduzida:

```text
desktop: 52px → 44px
mobile:  42px → 36px
```

As setas também ficam mais próximas das bordas.

## Sem alterações

Não muda:

```text
tamanho dos cards
proporção 16:9
JavaScript
playlist
player
loader
navbar
footer
Worker/API
arquivos históricos
```
