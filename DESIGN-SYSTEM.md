# DESIGN-SYSTEM.md — Kamyli Sumire

Os valores efetivos continuam definidos em `css/core/variables.css`.

## Identidade

```text
cor primária: #B35EAF
fonte: Nunito
cards principais: 24 px
botões: 16 px
blur padrão: 10 px
```

A mesma linguagem visual deve ser mantida em Home, Doações e 404.

## Fonte de verdade

```text
css/core/variables.css
```

Não criar paletas independentes por página.

## Superfícies

Cards e navbar usam superfícies translúcidas. O blur pode ser desligado por
preferência ou heurísticas de performance.

Com blur desligado, contraste e legibilidade devem continuar adequados sem
depender de `backdrop-filter`.

## Background

Desktop/tablet:

```text
fundo.avif
→ fundo.webp
→ fundo.png
```

Mobile até 760 px:

```text
fundo-mobile.avif
→ fundo.webp
→ fundo.png
```

`Save-Data` pode remover a arte decorativa.

Não preloadar o background.

## Avatar

Home e Doações usam:

```text
avatar-192.webp
avatar-384.webp
```

com `srcset`/`sizes`.

Fallback:

```text
avatar.png
```

`avatar.webp` legado não faz parte da V40.

## Navbar

- fixa no topo;
- conteúdo centralizado;
- marca à esquerda com divisor;
- links em linha;
- scroll horizontal no mobile;
- item ativo mantido visível;
- logo monocromática via máscara `logo.webp`;
- controles de tema e blur;
- Doações em destaque.

## Cards

- preservar espaçamento interno consistente;
- evitar alturas rígidas para conteúdo editável;
- não cortar conteúdo;
- listas com mais de cinco itens podem ganhar scroll interno;
- agenda usa carrossel horizontal.

## Agenda

Cada card mantém:

- data/hora legíveis;
- status no topo;
- título como informação principal;
- descrição/plataformas abaixo;
- suporte a conteúdo variável.

Setas podem sobrepor visualmente a borda do carrossel sem blur/fade sobre os
cards.

## Doações

LivePix/Pixie devem manter largura coerente, SVG simples, título/subtítulo
alinhados e consistência desktop/mobile.

## Movimento

Entrada após loader:

```text
site-loading-pending
→ site-loading-visible (somente se necessário)
→ site-revealing
→ site-ready
```

A animação deve ser mínima.

`prefers-reduced-motion: reduce` remove animações não essenciais.

## Acessibilidade

Preservar:

- foco visível;
- navegação por teclado;
- `aria-current`;
- roles/ARIA do ranking;
- labels;
- contraste suficiente nos dois temas;
- textos alternativos adequados.

## CSS

Estrutura atual:

```text
css/core/
css/components/
css/pages/
```

Não existe bundle ou build obrigatório. Essa modularidade simples é
intencional para GitHub Pages.
