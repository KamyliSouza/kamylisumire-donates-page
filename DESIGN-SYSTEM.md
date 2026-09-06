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

## Tipografia local — V41

Nunito é servida pelo próprio domínio como fonte variável WOFF2.

```text
assets/fonts/nunito-variable.woff2
```

Pesos disponíveis: 200–1000.

## Transição entre páginas — V41

Home sai discretamente para a esquerda e Doações entra discretamente pela
direita.

- saída: ~180 ms;
- entrada: ~340 ms;
- sem animação card por card;
- sem filtro/blur animado;
- reduced motion elimina o efeito;
- performance reduzida elimina o efeito;
- loader continua dominante quando realmente aparece.

## Configurações — V42

O rodapé ganha um botão discreto de configurações. O popover usa as mesmas
superfícies, bordas, raio e cor primária do restante do site.

As escolhas são segmentadas em três opções por grupo:

- Aparência: Automático, Claro, Escuro;
- Blur: Automático, Ligado, Desligado.

## Navbar — V42

A área central continua rolável no mobile. O CTA `Apoiar` fica fora dela e
permanece no lado direito da navbar.

## Loader — V42

- fundo transparente;
- logo de 76 px;
- pulsação de escala 0,94 → 1,04;
- duração mínima de 1 segundo;
- fade-out de 320 ms;
- sem pulsação em reduced motion/performance reduzida.

## Loader adaptativo — V42.1

A superfície de carregamento usa a mesma linguagem de vidro dos cards.

```text
superfície: var(--card-bg)
blur: var(--blur-card)
```

Com blur desligado, o filtro é removido e a opacidade passa a depender somente
dos tokens de superfície do tema. A logo continua sendo o único elemento
animado do loader.

## Fundo mobile fixo — V42.4

Em telas de até 760 px, a arte `fundo-mobile.avif` (9:16) permanece fixa atrás
do conteúdo por meio de uma camada `body::before` com `position: fixed`.

```text
performance normal
→ camada fixa
→ center / cover

performance reduzida
→ background rolável no body

Save-Data
→ sem imagem decorativa
```

Não usar `background-attachment: fixed` como implementação principal no
mobile.

## Card de configurações — V42.5

O popover de Configurações é descendente do footer. Como ambos utilizam
`backdrop-filter`, o footer suspende temporariamente o próprio filtro enquanto
o popover estiver aberto para evitar um backdrop root aninhado.

```text
menu fechado + blur on
→ footer com blur

menu aberto + blur on
→ footer sem filtro
→ popover com blur(var(--blur-card))

blur off
→ footer e popover sem backdrop-filter
```

O cabeçalho do popover deve conter apenas `Configurações`, sem um segundo
rótulo `Preferências`.

