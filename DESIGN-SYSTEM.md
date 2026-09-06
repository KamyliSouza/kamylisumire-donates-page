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

O blur possui estado efetivo, modo e motivo:

```text
data-blur="on|off"
data-blur-mode="auto|manual"
data-blur-preference="auto|on|off"
data-blur-reason="..."
```

Sem preferência manual salva, o site escolhe o estado automaticamente. O blur é desligado quando o navegador não suporta `backdrop-filter` ou, no modo automático, quando há sinais conservadores de menor capacidade/maior preferência por economia:

```text
prefers-reduced-transparency: reduce
navigator.connection.saveData
navigator.deviceMemory <= 2
navigator.hardwareConcurrency <= 2
```

APIs ausentes não contam como reprovação. Não usar User-Agent ou breakpoint mobile como proxy de desempenho.

O botão da navbar continua permitindo override manual. Sem blur, os painéis permanecem translúcidos, com opacidade reforçada para legibilidade.

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
[ logo ] | Início Agenda Jogos Regras Créditos Doações | [tema] [blur]
```

- fixa;
- grupo centralizado;
- scroll horizontal no mobile;
- sem dropdown;
- `logo.webp` = máscara monocromática da navbar;
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

Home e Doações usam `favicon.webp` pulsando na cor primária, sem texto visual.

Respeitar `prefers-reduced-motion`.


## Preview social

As previews usam uma imagem grande:

```text
assets/preview.png
1200 × 630
```

Home:

```text
Oiê! Eu sou a Kamyli ✨
+ descrição do Hero
```

Doações:

```text
Apoie a Kamyli Sumire ✨
Escolha entre LivePix ou Pixie para apoiar as lives!
```

Open Graph é a referência para Discord, WhatsApp, Telegram, Facebook e
outros serviços compatíveis. Twitter/X recebe os equivalentes
`twitter:*`.


## Assets otimizados

A V34 prefere WebP no carregamento visual:

```text
avatar.webp
favicon.webp
fundo.webp
logo.webp
```

PNG permanece como fallback quando aplicável.

A navbar continua monocromática: `logo.webp` é usado como máscara e recebe
`var(--primary-color)`. A arte deve preservar transparência.

`preview.png` não deve ser convertido automaticamente, pois é a imagem social
1200 × 630 atualmente declarada nos metadados Open Graph/Twitter.

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
