# DESIGN-SYSTEM.md — Identidade visual da Kamyli Sumire

A referência histórica vem da branch `main`; a fonte de verdade operacional é `css/core/variables.css`.

## Tokens

### Claro

```css
--primary-color: #B35EAF;
--primary-hover: #9b4d97;
--bg-color: #f7eff7;
--card-bg: rgba(255, 255, 255, 0.92);
--card-border: rgba(179, 94, 175, 0.30);
--text-color: #2b2b2b;
--subtitle-color: #666;
--notice-bg: rgba(179, 94, 175, 0.08);
```

### Escuro

```css
--primary-color: #d178cd;
--primary-hover: #b35eaf;
--bg-color: #121212;
--card-bg: rgba(30, 24, 32, 0.85);
--card-border: rgba(209, 120, 205, 0.35);
--text-color: #f0e6f0;
--subtitle-color: #bfa9be;
--notice-bg: rgba(209, 120, 205, 0.12);
```

### Geometria

```css
--radius-card: 24px;
--radius-button: 16px;
--radius-small: 14px;
--blur-card: 10px;
--shadow-card: 0 10px 30px rgba(0, 0, 0, 0.15);
--font-main: "Nunito", sans-serif;
```

## Tema e blur

Tema:

```text
data-theme="light"
data-theme="dark"
```

Blur desligado:

```text
data-blur="off"
```

Sem blur, os painéis continuam translúcidos, com opacidade reforçada para legibilidade.

## Superfícies

Painéis principais:

```html
class="glass-panel"
```

Superfícies internas:

```css
var(--notice-bg)
var(--card-border)
```

## Botões

Base:

```text
.button
```

Variantes:

```text
.button-primary
.button-outline
.button-soft
```

SVGs de interface devem preferir `currentColor`.

## Navbar

Estado atual:

```text
[ favicon ] | Início Agenda Jogos Regras Créditos Doações | [tema] [blur]
```

- fixa;
- grupo centralizado;
- scroll horizontal no mobile;
- sem dropdown;
- favicon = máscara de `assets/favicon.png`;
- cor = `var(--primary-color)`;
- links externos usam confirmação global antes do redirecionamento.

O modal de saída é compartilhado por todo o site e mantém a mesma identidade visual da navbar.

## Home

Base:

```css
width: min(1120px, calc(100% - 32px));
```

Mobile:

```css
width: min(100% - 24px, 1120px);
```

A Home contém hero, redes sociais, agenda, Regras, Créditos e CTA de Doações.

## Agenda

- cards adaptáveis ao conteúdo;
- sem fade lateral;
- setas sobrepostas;
- setas sem blur próprio;
- scroll-snap;
- título/jogo em destaque;
- status no canto superior direito;
- data e hora juntas;
- animação discreta.

## Regras e Créditos

Os dois painéis usam mini-cards com a mesma linguagem visual.

Mais de cinco itens → scroll interno automático.

## Doações

Mesma largura externa da Home.

Desktop amplo:

```text
[ Doações ] [ Ranking ]
```

Tablet/mobile:

```text
[ Doações ]
[ Ranking ]
```

LivePix/Pixie e aviso usam a mesma largura máxima interna.

Ícones:

- LivePix → cifrão SVG;
- Pixie → globo SVG.

## Footer

É global.

Sempre deve exibir créditos de fundo e avatar.

Desktop pode distribuir conteúdo horizontalmente; mobile centraliza.

## Loader

Home e Doações usam favicon pulsando na cor primária, sem texto visual.

Respeitar `prefers-reduced-motion`.

## Mobile e performance

Até 760px:

```css
background-attachment: scroll;
```

Evitar blur excessivo e efeitos que aumentem repaints.

## Regras gerais

1. Não criar nova paleta por página.
2. Reutilizar tokens.
3. Preservar Nunito.
4. Manter contraste em claro/escuro.
5. Manter legibilidade sem blur.
6. Novas páginas podem ter layout próprio, não identidade própria.
7. Hover não pode ser a única forma de acessar uma ação.
