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

Os assets visuais otimizados atuais são:

```text
avatar-192.webp
avatar-384.webp
favicon.webp
fundo.avif
fundo-mobile.avif
fundo.webp
logo.webp
```

O fundo usa a cadeia `AVIF → WebP → PNG`; PNG permanece como fallback quando aplicável.

A navbar continua monocromática: `logo.webp` é usado como máscara e recebe
`var(--primary-color)`. A arte deve preservar transparência.

`preview.png` não deve ser convertido automaticamente, pois é a imagem social
1200 × 630 atualmente declarada nos metadados Open Graph/Twitter.

## Mobile e performance

Até 760px:

```css
background-attachment: scroll;
```

O perfil adaptativo também força `scroll` em hardware limitado:

```text
data-performance="reduced"
```

Quando o motivo é `save-data`, o background decorativo é omitido por completo.
O loader não reutiliza `fundo.avif`, `fundo.webp` ou `fundo.png`; ele usa apenas
gradiente CSS e `favicon.webp`.

Evitar blur excessivo, `background-attachment: fixed` em aparelhos limitados e
preload de imagens puramente decorativas.

## Regras gerais

1. Não criar nova paleta por página.
2. Reutilizar tokens.
3. Preservar Nunito.
4. Manter contraste em claro/escuro.
5. Manter legibilidade sem blur.
6. Novas páginas podem ter layout próprio, não identidade própria.
7. Hover não pode ser a única forma de acessar uma ação.


## Movimento e entrada da página

Home e Doações usam uma transição mínima quando o loader termina.

Estados:

```text
site-loading
→ site-revealing
→ site-ready
```

A animação deve permanecer discreta:

```text
navbar: 3 px
main/footer: 5 px
duração: ~240–280 ms
```

Não animar individualmente todos os cards ou textos na primeira entrada. O
objetivo é apenas suavizar a troca entre loader e conteúdo pronto.

A transição deve respeitar:

```text
prefers-reduced-motion: reduce
```

Nesse modo o conteúdo aparece imediatamente, sem deslocamento ou fade.


## Background responsivo

A arte de fundo possui variante específica para mobile:

```text
> 760 px  → assets/fundo.avif
<= 760 px → assets/fundo-mobile.avif
```

Fallbacks globais permanecem em WebP e PNG. Em `Save-Data`, nenhuma arte de
fundo é carregada.

O background é decorativo e não deve receber preload.


## Avatar responsivo

A Home usa um frame de até 184 px e Doações usa 110 px. O navegador escolhe
entre:

```text
avatar-192.webp
avatar-384.webp
```

por `srcset`/`sizes`, mantendo `avatar.png` como fallback. Não voltar a servir
`avatar.webp` grande como única fonte para esses componentes.

## Loader atrasado

O loader visual não deve aparecer imediatamente. Há um atraso curto para que
visitas rápidas cheguem direto ao conteúdo. Quando o loader realmente aparece,
a entrada suave da V37 continua sendo usada.


### AVIF desktop de produção

`assets/fundo.avif` é o asset atual de desktop/tablet na `main`. Otimizações de
compressão devem substituir o mesmo arquivo, preservando nome e proporção
visual. O design system não define um peso fixo em KiB.

Até 760 px, a arte preferencial continua sendo `assets/fundo-mobile.avif`.


## Entrega CSS em produção

A organização modular continua sendo usada para manutenção, mas o navegador
recebe um bundle por página:

```text
/          → css/build/home.css
/doacoes/  → css/build/doacoes.css
404        → css/build/404.css
```

Isso reduz o número de requisições CSS locais bloqueantes sem duplicar regras
manualmente nos arquivos fonte.

`css/build/*.css` é saída gerada. Alterações visuais devem acontecer em
`css/core`, `css/components` ou `css/pages`.
