# Design system

O site usa uma linguagem visual simples, responsiva e baseada em *glass panels*, com
Nunito como fonte principal. Este arquivo descreve o estado vigente; histórico de
mudanças está no [`CHANGELOG.md`](CHANGELOG.md) e regras de manutenção em
[`AGENTS.md`](AGENTS.md).

## Sumário

1. [Fundamentos e tokens](#1-fundamentos-e-tokens)
2. [Tipografia](#2-tipografia)
3. [Cor e contraste](#3-cor-e-contraste)
4. [Painéis e blur](#4-painéis-e-blur)
5. [Modo leitura](#5-modo-leitura)
6. [Botões](#6-botões)
7. [Busca e filtros (Galeria, Blog, Jogos)](#7-busca-e-filtros-galeria-blog-jogos)
8. [Cards da Home](#8-cards-da-home)
9. [Galeria de Artes](#9-galeria-de-artes)
10. [Blog](#10-blog)
11. [Navbar](#11-navbar)
12. [Navegação mobile](#12-navegação-mobile)
13. [Redes sociais globais](#13-redes-sociais-globais)
14. [Carrosséis](#14-carrosséis)
15. [Responsividade, movimento e acessibilidade](#15-responsividade-movimento-e-acessibilidade)
16. [Assets](#16-assets)

---

## 1. Fundamentos e tokens

Os tokens globais vivem em `css/core/variables.css`. Antes de introduzir um valor
recorrente novo, verifique se já existe token equivalente. A estrutura compartilhada fica em
`css/core/variables.css`, `global.css` e `navbar.css`; estilos específicos permanecem em
`css/components/` e `css/pages/`.

Ordem de carregamento relevante: `css/core/reading.css` é sempre o **último** CSS de cada página.

## 2. Tipografia

Nunito é servida localmente por `assets/fonts/nunito-variable.woff2` (licença em
`assets/fonts/OFL.txt`). Evite fontes externas para elementos que podem usar a família existente.

## 3. Cor e contraste

| Token | Use para | Não use para |
| --- | --- | --- |
| `--primary-color` | Cor de marca: títulos grandes, ícones, bordas, detalhes decorativos | Texto pequeno; fundo de botão com texto branco |
| `--primary-text` | Texto normal/pequeno na cor primária (links, tags, labels, estados textuais) | Títulos grandes (a distinção é semântica; não troque por consistência mecânica) |
| `--button-bg`, `--button-bg-hover`, `--button-text` | Superfícies de ação preenchidas: CTAs, abas/filtros ativos, seletores | Decoração |
| `--primary-soft` | Fundos suaves de estado (ativo/foco/hover) | Única superfície de um botão aberto |

- No tema claro `--primary-text` tem contraste AA nas superfícies claras principais; no tema
  escuro mantém o mesmo tom de `--primary-color`.
- Os tokens de ação existem nos temas claro, escuro explícito e fallback `prefers-color-scheme`, com
  contraste mínimo de **4,5:1** para texto normal. O teste `color-contrast.test.mjs` calcula o
  contraste WCAG dos tokens e confere o uso semântico nos componentes.
- Galeria e Blog compartilham a mesma hierarquia cromática: eyebrow e título principal em
  `--primary-color`, descrição em `--subtitle-color`. Não crie paleta própria para o Blog.

## 4. Painéis e blur

Painéis usam a classe base `glass-panel`. O blur é adaptativo e respeita a preferência do
usuário e sinais de performance/acessibilidade. Não force `backdrop-filter` quando
`data-blur="off"` ou quando o perfil adaptativo desabilitar o efeito.

- **Exceção deliberada:** o painel de Configurações (`.site-settings-popover`) flutua sobre texto e
  por isso é **opaco** (`--card-bg` composto sobre `--bg-color`), sem `backdrop-filter`.
  Superfícies que flutuam sobre conteúdo legível não devem depender de blur.
- O `backdrop-filter` de `.glass-panel` cria um contexto de empilhamento: painéis com menus
  (`artes-tools`, `blog-tools`) precisam de `z-index` explícito acima da grade/lista seguinte;
  elevar só o menu não basta.
- **Painéis de ferramentas (Galeria e Blog):** o blur e a moldura externa pertencem ao `::before`,
  não ao próprio `.artes-tools`/`.blog-tools`, para não criar uma Backdrop Root ancestral dos
  seletores. A borda do pai fica transparente; o pseudo-elemento usa `inset: -2px`,
  `border: 2px solid var(--card-border)` e `border-radius: var(--radius-card)`, de modo que o blur
  cubra também a área sob a borda. Não mova o blur de volta para o elemento pai.

## 5. Modo leitura

Preferência explícita (Configurações → Leitura) que prioriza a leitura no site inteiro. Estado em
`html[data-reading="on"]`; todo o visual em `css/core/reading.css`.

- **Superfícies:** `--card-bg`, `--nav-bg`, `--footer-bg` e `--bg-color` opacos; sem blur e sem arte de fundo.
- **Cor:** texto principal AAA (≥ 7:1); textos secundários e links AA (≥ 4,5:1) nos dois temas;
  bordas mais fortes para separar painéis sem transparência. `--primary-text` segue valendo.
- **Tipografia:** peso 500, entrelinha 1,8, medida de ~68 caracteres (`--reading-measure: 43rem`), corpo de
  artigo em 1,0625rem. O tamanho do texto (padrão/grande/maior) escala o `rem` em 1 / 1,125 / 1,25.
- **Links** em texto corrido ficam sublinhados; foco visível com contorno de 3 px.
- **Movimento:** `scroll-behavior: auto`.
- **Botões** (`.button-primary`, `.button-outline`) seguem os tokens de botão; em texto corrido não
  recebem sublinhado/cor de link. O botão vazado usa `--primary-text` também no contorno.
- Atalho "Modo leitura" nos artigos: `.reading-toggle` com `aria-pressed`.

Não adicione `backdrop-filter`, `!important` nem cores soltas ao arquivo; novas cores entram como
tokens e passam pelo teste de contraste.

## 6. Botões

Use as classes existentes: `button`, `button-primary`, `button-outline`. Ícones decorativos dentro de
botões usam `aria-hidden="true"` e não substituem o rótulo textual. Os CTAs de apoio da Home
reutilizam o coração do botão Apoiar da Navbar (via `home-interactions.js`). A cor de fundo vem dos
tokens `--button-*` (ver [seção 3](#3-cor-e-contraste)).

## 7. Busca e filtros (Galeria, Blog, Jogos)

O conjunto **Buscar em + campo de texto** é um componente único, com o mesmo visual e interação na
Galeria e no Blog (paridade é regra do design system, não coincidência):

- altura mínima de 44 px, borda de 1 px em `--card-border`, radius de 14 px;
- campo e menu usam `--nav-bg` com blur (texto em `--text-color`/`--subtitle-color`, foco em
  `--primary-color` + `--primary-soft`); com blur desligado voltam a `--card-bg`;
- drop-down **próprio** (nunca `<select>` nativo), com `--shadow-card` e `--blur-card`; chevron e
  marca de seleção desenhados só em CSS, sem SVG/PNG;
- a11y: `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, `role="option"`,
  `aria-selected` e teclado (`ArrowUp`/`ArrowDown`, `Home`/`End`, `Enter`/`Space`, `Escape`, `Tab`);
- o menu ancora no **wrapper interno do valor selecionado**, não no bloco inteiro que também contém
  o rótulo "Buscar em";
- **enquanto aberto**, o menu é portado temporariamente para `document.body` com posicionamento fixo
  calculado pelo controle, para que o `backdrop-filter` atue sobre a página real e o menu não seja
  cortado pelo painel. Ao fechar, o **mesmo nó** volta ao wrapper (nunca crie cópia do listbox);
  ARIA, teclado e a preferência "Blur desligado" são preservados;
- empilhamento suficiente para ficar acima da lista/grade seguinte;
- responsivo: controles em coluna no mobile e fonte de 16 px nos controles editáveis para evitar zoom.

Os **campos** de busca são próprios de cada página (Galeria: Todos, Artista, Título, Categoria, Tags;
Blog: Todos, Título, Resumo, Tags). Os filtros de tags do Blog continuam em *pills* e não precisam
imitar os filtros de categoria da Galeria.

**Faixas horizontais de filtros** (Jogos, Blog, Galeria): o conteúdo oculto é indicado com
`mask-image` na própria faixa rolável, não com camada de fundo sobre os chips; assim não há
recortes sobre superfícies translúcidas e o realce do chip selecionado fica integrado ao botão. As
setas continuam sobrepostas e não reservam espaço.

## 8. Cards da Home

`data/content/home-cards.json` muda ordem, visibilidade e apresentação **sem** autorizar estilos
arbitrários.

- `.home-layout` usa duas colunas no desktop: `tamanho: grande` ocupa as duas, `compacto` ocupa
  uma (dois compactos consecutivos compartilham a linha; um compacto isolado pode deixar a segunda
  coluna livre para preservar a ordem editorial). No mobile ambos ocupam a largura total.
- Tamanhos padrão: Hero, Lives, Agenda, Blog e Apoio começam `grande`; Regras e Créditos `compacto`.
- Os sete nativos mantêm estrutura e conteúdo próprios mesmo reordenados ou redimensionados; ocultar
  é decisão editorial de apresentação, não remoção do componente.
- `variante` ∈ `padrao | suave | destaque`, usando exclusivamente tokens existentes (`--card-bg`,
  `--notice-bg`, `--card-border`, `--primary-color`, `--primary-soft` e sombras existentes).
- Não permita cor hex/RGB, classe CSS, `style` inline ou CSS editorial. Necessidade visual recorrente
  vira variante documentada no frontend.
- Cards `personalizado` reutilizam `glass-panel`, tipografia/eyebrow, `.button`,
  `.button-primary`/`.button-outline` e a biblioteca `button-icons.js`. Alinhamento: `esquerda` ou
  `centro`. CTA: `primario` ou `contorno`, com as mesmas regras de links do site. Ícones são nomes da
  allowlist, nunca SVG/HTML bruto, URL de imagem ou asset local.
- A ordem editorial não altera a ordem lógica interna de headings/controles de cada card; foco e
  navegação seguem a ordem do DOM resultante.

## 9. Galeria de Artes

Padrão visual em `css/pages/artes.css`:

- masonry responsivo com CSS Columns, preservando a proporção de cada imagem;
- cards com borda/radius/sombra derivados dos tokens existentes;
- **a grade usa só `preview`** e mostra **somente título e artista** sobre a base da imagem, com
  gradiente escuro e `text-shadow` para contraste; categoria, data, tags e crédito aparecem apenas
  no dialog;
- `loading="lazy"` e `decoding="async"`; `.site-loader-logo` reutilizado durante o carregamento
  individual (não duplique o CSS do loader; altere só dimensões/posição locais);
- o lightbox reaproveita a preview enquanto carrega a `imagem` full, com o mesmo loader; a grade
  nunca baixa a full automaticamente;
- estado de erro por card, sem bloquear a grade;
- dialog nativo com foco/fechamento acessíveis;
- `alt` editorial obrigatório; crédito externo opcional e sempre HTTPS.

## 10. Blog

- O bloco completo de ferramentas usa o mesmo painel externo da Galeria: `glass-panel` envolvendo
  filtros de tags, seletor e campo, com padding e espaçamento equivalentes a `.artes-tools`
  (ver [seção 7](#7-busca-e-filtros-galeria-blog-jogos) e [seção 4](#4-painéis-e-blur)).
- Ordem: tags/filtros primeiro, busca + seletor depois (filtros à esquerda e busca à direita no
  desktop; mesma ordem vertical no mobile).
- Cabeçalho: eyebrow em `--primary-color` sobre a superfície auxiliar global, `h1` em
  `--primary-color`, descrição em `--subtitle-color`.
- Não altere `data/blog/*` apenas para atender a regras visuais.

## 11. Navbar

Todos os itens clicáveis compartilham um contrato editorial em `data/content/navbar.json` (texto,
ícone, URL); o desenho é responsabilidade do frontend.

- Ícones são opcionais, vêm exclusivamente de `button-icons.js` e ficam alinhados ao texto no mesmo
  `inline-flex`, com gap consistente e cor herdada do link. Nenhum caminho de imagem, SVG bruto ou
  asset editorial entra no JSON.
- Alterar URL/texto/ícone não pode exigir HTML específico por item.
- **Apoiar** mantém o tratamento primário rosa. Com `apoioFixoNoFim: true` fica no slot histórico à
  direita, fora do scroll central e com divisor próprio; com `false` entra no fluxo reordenável sem
  perder o estilo de CTA.
- **Configurações** é só um ícone de engrenagem (círculo de 40 px; 38 px no mobile), à esquerda de
  Apoiar, no slot `.site-nav-settings-slot`. O preenchimento com os tokens de ação significa "painel
  aberto" e só isso: foco = contorno; hover só com mouse (`(hover: hover) and (pointer: fine)`) e só
  no contorno. O painel abre logo abaixo da barra, alinhado à borda direita do conteúdo (centralizado
  no mobile).
- A identidade visual não deve tornar o conteúdo dependente de assets decorativos. O fundo usado por
  `backdrop-filter` pode ser antecipado, mas não bloqueia o reveal nem compete com conteúdo editorial
  em prioridade alta.

## 12. Navegação mobile

Até 767 px a lista horizontal é substituída por um drawer lateral; acima disso a Navbar tradicional
permanece.

- Gatilhos `Menu` (canto inferior esquerdo) e `@ Redes` (inferior direito) usam a mesma altura,
  safe area, blur e linguagem de estado: fechados usam a superfície de card; abertos usam
  `--primary-soft` + destaque primário. A diferença de componente é intencional — Menu é drawer
  estrutural, Redes é popup compacto —, mas o comportamento de camada temporária é compartilhado.
- O drawer preserva a linguagem da Navbar desktop: links sem borda individual e sem cartão
  permanente, transparentes no estado normal e com `--primary-soft` em ativo/foco/hover. Ícones têm
  função de reconhecimento rápido e mantêm o traço do `KamyliButtonIcons`. **Apoiar** é a exceção e
  fica destacado no rodapé do drawer.
- Medidas e comportamento (largura `clamp(248px, 74vw, 288px)`, sem cabeçalho, swipe, histórico):
  ver "Navbar mobile" em [`AGENTS.md`](AGENTS.md).

## 13. Redes sociais globais

Componente global independente alimentado por `data/content/redes.json` (não pertence à Navbar nem ao
Hero). A partir de 768 px: dock vertical fixo à esquerda; abaixo: cápsula `@ Redes` com menu expansível.

- usa os mesmos tokens de superfície, borda, sombra, blur e cor primária do site;
- `z-index` abaixo da Navbar e dos listboxes portados para `body`;
- links de desktop são icon-only com tooltip visual e nome acessível; o menu mobile mostra ícone + nome;
- nenhuma rede define cor própria no JSON e nenhum SVG/HTML bruto é editorial;
- a cápsula mobile evita a semântica ambígua de compartilhamento, respeita safe area, fecha por
  Escape/clique externo e respeita `prefers-reduced-motion`;
- em touch, o estado aberto/foco mantém superfície legível e o `:hover` só vale com
  `(hover: hover) and (pointer: fine)` (evita hover persistente em Chromium/Brave no Android);
- loader e transições de página ocultam temporariamente o componente.

## 14. Carrosséis

Lives e Agenda mantêm: setas, navegação por teclado, scroll horizontal, scroll-snap, touch nativo e
click + arrasta em ponteiro fino. O estado de arraste não pode disparar o clique de um card de Live.

## 15. Responsividade, movimento e acessibilidade

- Evite larguras fixas que produzam overflow; verifique ao menos desktop e viewport móvel.
- Animações/transições respeitam `prefers-reduced-motion`; não adicione movimento indispensável à
  compreensão.
- Mantenha: foco visível; link "Pular para o conteúdo" como primeiro controle focável apontando para o
  `<main>`; controles com nome acessível; headings em ordem coerente; contraste suficiente; links
  externos identificáveis pelo contexto; `aria-live` apenas em regiões curtas de status, nunca em
  grades inteiras de resultados.

## 16. Assets

Gráficos públicos vêm de `assets.kamylisumire.com`; não reintroduza duplicatas locais de avatar,
favicon, fundo e preview social. A mídia da Galeria continua referenciada por URL HTTPS externa.
