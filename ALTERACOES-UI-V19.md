# ALTERACOES-UI-V19.md

## Doações normalizada também no desktop

A página `/doacoes/` passa a usar a mesma largura-base da Home:

```css
width: min(1120px, calc(100% - 32px));
```

### Desktop

Os dois cards principais ficam em duas colunas equilibradas:

```text
┌──────────────────────────┐  ┌──────────────────────────┐
│         Doações          │  │         Ranking          │
│                          │  │                          │
│ [ LivePix             ]  │  │ Este mês | Todos tempos │
│                          │  │                          │
│ [ Pixie               ]  │  │ ranking...               │
│                          │  │                          │
│ aviso                    │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

- mesma largura externa da Home;
- `gap: 22px` entre os cards;
- cards dividem o espaço igualmente;
- padding interno preservado;
- espaçamento dos botões preservado.

### Tablet

Entre `761px` e `920px`, a página volta para uma única coluna com
largura máxima de `720px`, evitando cards apertados.

### Mobile

Até `760px`:

```css
width: min(100% - 24px, 1120px);
grid-template-columns: 1fr;
```

Portanto Home e Doações usam as mesmas margens laterais.

### Footer

O footer da página de doações também acompanha a largura-base da Home no
desktop.

## Preservado

- toggle claro/escuro;
- toggle de blur;
- preferências persistidas;
- navbar fixa;
- scrollspy;
- rolagem natural;
- aviso de links externos;
- coração SVG;
- ranking/API/Worker;
- carrossel e agenda.

## Arquivo alterado

```text
css/pages/doacoes.css
```
