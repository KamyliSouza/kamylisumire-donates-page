# ALTERACOES-UI-V13.md

## Carrossel

Foram removidos somente os efeitos visuais de blur e fade das setas do carrossel.

Preservado:

- setas sobrepostas aos cards;
- animação fluida com `requestAnimationFrame`;
- easing `easeInOutQuint`;
- avanço de aproximadamente um card por clique;
- scroll-snap;
- touch/trackpad;
- suporte às teclas esquerda/direita;
- cancelamento da animação ao interagir manualmente;
- `prefers-reduced-motion`;
- setas desabilitadas no início/fim.

Alterado:

- removidos os fades laterais;
- removido `backdrop-filter` dos botões;
- botão passa a usar `background-color: var(--card-bg)`;
- sombra continua leve, sem halo translúcido adicional.

## Hero

Preservada a alteração V12:

```text
[ Apoiar ] [ Abrir live ]
```

## Demais alterações preservadas

- navbar fixa;
- conteúdo da navbar centralizado;
- scrollspy;
- aviso de links externos;
- redes sociais na cor primária;
- layout compacto de `/doacoes/`;
- avatar centralizado em `/doacoes/`;
- coração SVG no ranking.
