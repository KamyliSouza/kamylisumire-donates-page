# V37 — Entrada suave pós-loader

## Objetivo

Evitar que a troca entre o loader e o site pronto pareça abrupta.

A V37 não cria uma animação chamativa. Ela trata apenas três blocos:

```text
navbar
main
footer
```

## Fluxo

```text
site-loading
     ↓
loader inicia fade-out
     ↓
site-revealing
     ↓
navbar + main + footer aparecem suavemente
     ↓
site-ready
```

O reveal começa alguns milissegundos depois do início do fade do loader. Isso
gera um crossfade curto em vez de mostrar uma tela vazia entre os dois estados.

## Movimento

```text
navbar
opacity 0 → 1
translateY(-3px) → 0
240 ms

main/footer
opacity 0 → 1
translateY(5px) → 0
280 ms
```

Não existe animação individual de cards, títulos, botões ou itens da agenda.

## Acessibilidade

Com:

```text
prefers-reduced-motion: reduce
```

o reveal é removido completamente.

## Escopo

A transição é usada pelas páginas que possuem o loader global, atualmente:

```text
/
 /doacoes/
```

A página `404.html` continua sem loader e sem essa animação.

## Evento

Após concluir a entrada:

```js
window.addEventListener("kamyli:site-revealed", () => {
    // hooks futuros
});
```

Nenhum código precisa usar esse evento atualmente.

## Não alterado

```text
Worker
API
OAuth
KV
CORS
DNS
SEO
assets
blur adaptativo
performance adaptativa
```
