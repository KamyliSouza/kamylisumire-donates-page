# ALTERACOES-UI-V11.md

## Carrossel mais fluido

O clique nas setas não depende mais apenas do `scroll-behavior: smooth`
do navegador.

Agora é usada uma animação própria com:

```text
requestAnimationFrame
+ easeInOutQuint
+ duração aproximada de 520ms
```

Isso deixa a transição entre cards mais contínua e previsível.

Cada clique ainda avança aproximadamente um card por vez.

Se o usuário começar a:

- arrastar;
- tocar;
- usar a roda do mouse/trackpad;

durante uma animação automática, ela é cancelada imediatamente para não
"brigar" com a interação manual.

`prefers-reduced-motion` também é respeitado.

## Setas sobre os cards

As setas agora ficam visualmente por cima do carrossel.

As duas bordas possuem um fade:

```text
fade ← [ card ][ card ][ card ] → fade
       ◀                   ▶
```

O fade é feito por pseudo-elementos do `.agenda-carousel` e possui
`pointer-events: none`, portanto não bloqueia touch ou clique nos cards.

As setas usam:

- fundo translúcido;
- blur;
- sombra suave;
- `--primary-color`;
- hover com a cor primária.

## Arquivos alterados

```text
css/pages/home.css
js/pages/home/home.js
```

As correções de `/doacoes/`, navbar fixa, scrollspy e aviso de links
externos continuam preservadas neste pacote consolidado.
