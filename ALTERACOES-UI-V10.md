# ALTERACOES-UI-V10.md

## Página de doações

A última consolidação havia trazido novamente um layout largo em duas colunas.

O layout volta ao padrão compacto:

```text
largura máxima: ~380px

┌─────────────────────┐
│      Doações        │
│                     │
│   [ LivePix      ]  │
│                     │
│   [ Pixie        ]  │
│                     │
│      Aviso          │
└─────────────────────┘

        20px

┌─────────────────────┐
│      Ranking        │
└─────────────────────┘
```

Correções:

- cards empilhados verticalmente;
- largura máxima de 380px;
- `gap: 20px` entre cards;
- `gap: 14px` entre botões;
- botões voltam a usar `padding: 13px 20px`;
- botões ocupam 100% da largura interna;
- avatar continua centralizado;
- coração SVG continua preservado.

## Carrossel da agenda

As setas deixam o cabeçalho e passam para as laterais do próprio carrossel:

```text
        ‹  [ SEG ] [ TER ] [ QUA ]  ›
```

Características:

- setas sobrepostas às laterais esquerda/direita;
- `scroll-snap`;
- `scroll-behavior: smooth`;
- cada clique avança exatamente um card;
- touch/trackpad continuam funcionando;
- setas desabilitam visualmente no início/fim;
- suporte às teclas esquerda/direita continua ativo;
- padding lateral impede que os botões escondam o conteúdo dos cards.

## Preservado

- navbar fixa/centralizada;
- scrollspy V9;
- aviso de links externos;
- redes sociais na cor primária;
- Worker/API/ranking.js;
- `data/agenda.json`;
- assets.
