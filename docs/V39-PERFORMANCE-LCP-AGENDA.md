# V39 — Avatar responsivo, loader atrasado e agenda otimizada

## Avatar

Home:

```text
avatar-192.webp 192w
avatar-384.webp 384w
sizes: até 150 px no mobile / até 184 px no desktop
```

Doações usa os mesmos arquivos com `sizes="110px"`.

O PNG histórico continua como fallback.

## Loader atrasado

O HTML começa em:

```text
site-loading-pending
```

O loader visual permanece oculto por 180 ms. Se conteúdo, footer e agenda
ficarem prontos antes disso, o loader é removido sem nunca ser exibido.

Se ainda houver trabalho:

```text
site-loading-pending
        ↓ 180 ms
site-loading-visible
        ↓ conteúdo pronto
site-revealing
        ↓
site-ready
```

Depois de exibido, o loader fica no mínimo 160 ms para evitar um flash muito
curto. O timeout de segurança continua em 2400 ms.

## Agenda / reflow

A V39 reduz leituras geométricas repetidas:

- cards são montados em `DocumentFragment` e inseridos em uma única operação;
- largura do card, gap, `scrollWidth` e `clientWidth` são medidos juntos;
- essas métricas ficam em cache durante o scroll programático;
- o loop da animação escreve apenas `scrollLeft`;
- estado dos botões é atualizado via `requestAnimationFrame`;
- `ResizeObserver` agenda nova medição quando o track realmente muda de tamanho.

A animação, scroll-snap, touch, wheel, setas e reduced-motion são preservados.


## AVIF desktop

`assets/fundo.avif` já está presente na `main` e continua sendo a fonte AVIF
principal de desktop/tablet. A V39 não exige adicionar esse arquivo.

Quando houver uma versão mais comprimida, basta substituir o conteúdo de
`assets/fundo.avif` mantendo o caminho. O CI valida o formato, não um peso fixo.
