# Design system

O site usa uma linguagem visual simples, responsiva e baseada em glass panels,
com Nunito como fonte principal.

## Fundamentos

Os tokens globais vivem em `css/core/variables.css`. Antes de introduzir um
valor recorrente novo, verificar se já existe token equivalente.

A estrutura visual compartilhada fica em:

- `css/core/variables.css`;
- `css/core/global.css`;
- `css/core/navbar.css`.

Estilos específicos devem permanecer em componentes/páginas.

## Tipografia

Nunito é servida localmente por `assets/fonts/nunito-variable.woff2`.
A licença fica em `assets/fonts/OFL.txt`.

Evitar adicionar fontes externas para elementos que podem usar a família já
existente.

## Painéis e blur

Os painéis utilizam a classe base `glass-panel`.
O blur é adaptativo e respeita a preferência do usuário e sinais de
performance/acessibilidade.

Não forçar `backdrop-filter` quando `data-blur="off"` ou quando o perfil
adaptativo desabilitar o efeito.

## Botões

Usar as classes existentes:

- `button`;
- `button-primary`;
- `button-outline`.

Ícones decorativos dentro de botões devem usar `aria-hidden="true"` e não
substituir o rótulo textual.

Os CTAs de apoio da Home reutilizam o desenho de coração do botão Apoiar da
navbar por meio de `home-interactions.js`.

## Cards da Home

Desde a V48.2.0, a composição da Home é uma parte explícita do Design System. `data/content/home-cards.json` pode mudar ordem, visibilidade e apresentação sem autorizar estilos arbitrários.

Regras visuais:

- `.home-layout` usa duas colunas no desktop; `tamanho: grande` ocupa as duas colunas e `tamanho: compacto` ocupa uma; dois compactos consecutivos compartilham a linha, enquanto um compacto isolado pode deixar a segunda coluna livre para preservar a ordem DOM/editorial; abaixo do breakpoint mobile ambos ocupam a largura total;
- os sete cards nativos mantêm sua estrutura e conteúdo próprios mesmo quando reordenados ou redimensionados; ocultar é uma decisão editorial de apresentação, não remoção do componente;
- `variante` é limitada a `padrao`, `suave` e `destaque`; essas variantes usam exclusivamente tokens existentes (`--card-bg`, `--notice-bg`, `--card-border`, `--primary-color`, `--primary-soft` e sombras existentes);
- não permitir cor hexadecimal/RGB, classe CSS, style inline ou CSS editorial no contrato; novas necessidades visuais recorrentes devem virar variante documentada no frontend;
- cards `personalizado` reutilizam `glass-panel`, tipografia/eyebrow, botões `.button`, `.button-primary`/`.button-outline` e a biblioteca `button-icons.js`;
- ícones editoriais são nomes allowlisted, nunca SVG/HTML bruto, URL de imagem ou asset local;
- alinhamento de cards personalizados é limitado a `esquerda` ou `centro`;
- CTAs personalizados usam apenas `primario` ou `contorno` e seguem as mesmas regras de links internos/externos do site;
- a ordem editorial não deve alterar a ordem lógica interna de headings/controles dentro de cada card; foco e navegação continuam seguindo a ordem DOM resultante.

Os tamanhos padrão são coerentes com a composição histórica: Hero, Lives, Agenda, Blog e Apoio começam como `grande`; Regras e Créditos começam como `compacto`. O editor pode mudar esses valores sem criar CSS específico por card.

## Galeria de Artes

A V48.0 oficializa um padrão visual específico para conteúdo artístico em
`css/pages/artes.css`:

- masonry responsivo com CSS Columns, preservando a proporção original de cada imagem;
- cards com borda/radius/sombra derivados dos tokens existentes;
- preview com somente título e artista sobrepostos na base da imagem, apoiados por gradiente escuro e `text-shadow` para contraste;
- `loading="lazy"` e `decoding="async"` nas imagens;
- `.site-loader-logo` reutilizado durante o carregamento individual, sem criar um segundo desenho de loader;
- estado de erro por card, sem bloquear o restante da grade;
- dialog nativo para ampliação, com foco/fechamento acessíveis;
- `alt` editorial obrigatório; crédito externo opcional e sempre HTTPS quando informado.

Desde a V48.0.1, cards usam a `preview` leve; o lightbox reaproveita essa preview enquanto carrega a `imagem` full e exibe o mesmo `site-loader-logo` do loader global durante a transição. A grade não deve baixar automaticamente a imagem full.

Desde a V48.1.1, categoria, data, tags e crédito aparecem somente no dialog da obra. O seletor de escopo da busca da Galeria usa um drop-down customizado com `--card-bg`, `--card-border`, `--primary-color`, `--primary-soft`, `--shadow-card` e `--blur-card`; a seta e a marca de seleção são desenhadas em CSS, sem arquivos de imagem. O componente deve manter `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, `role="option"` e navegação por teclado.

Não duplicar o CSS do loader global: a Galeria reutiliza a classe compartilhada e
altera apenas dimensões/posicionamento local.

## Redes sociais globais

Desde a V48.3.33, as redes não pertencem à Navbar nem ao Hero: são um componente
global independente alimentado por `data/content/redes.json`. Em larguras de
768 px ou mais, o componente usa um dock vertical fixo à esquerda; abaixo disso,
usa uma única cápsula `@ Redes` com menu expansível nativo.

Regras visuais e de interação:

- o dock usa os mesmos tokens de superfície, borda, sombra, blur e cor primária do site;
- `z-index` permanece abaixo da Navbar e dos listboxes portados para `body`;
- links de desktop são icon-only com tooltip visual e nome acessível; o menu mobile mostra ícone + nome;
- nenhuma rede define cor própria no JSON e nenhum SVG/HTML bruto é editorial;
- a cápsula mobile `@ Redes` evita a semântica ambígua de compartilhamento, respeita safe area, fecha por Escape/clique externo e o componente respeita `prefers-reduced-motion`;
- loader e transições de página ocultam temporariamente o componente para evitar sobreposição visual.

## Navbar

Desde a V48.2.0, todos os itens clicáveis da Navbar compartilham um único contrato editorial em `data/content/navbar.json`. Cada item possui texto, ícone e URL, mas o desenho continua sendo responsabilidade do frontend.

Regras visuais:

- ícones são opcionais e vêm exclusivamente da biblioteca `button-icons.js`; nenhum caminho de imagem, SVG bruto ou asset editorial entra no JSON;
- texto e ícone ficam alinhados no mesmo `inline-flex`, com gap consistente e cor herdada do próprio link;
- o botão **Apoiar** mantém o tratamento primário rosa e a posição fixa à direita, mesmo sendo configurado pelo mesmo JSON;
- alterar URL/texto/ícone não pode exigir HTML específico por item; novos estilos devem continuar orientados pelas classes compartilhadas da Navbar;
- no mobile, a lista central continua horizontalmente rolável e o CTA Apoiar permanece fora desse scroll.

## Blog

Desde a V48.1.3, a busca por campo da listagem do Blog deve seguir o mesmo padrão
visual e de interação da busca da Galeria. Essa paridade é uma regra do design
system, não uma coincidência de implementação.

O bloco completo de ferramentas do Blog deve usar o mesmo painel externo da
Galeria: `glass-panel` envolvendo filtros de tags, seletor **Buscar em** e campo
textual. O fundo translúcido, borda, radius, sombra e blur pertencem ao conjunto
inteiro, e não apenas aos controles individuais. Esse painel deve manter padding
e espaçamento equivalentes ao `.artes-tools`.

O conjunto **Buscar em + campo de texto** deve preservar:

- altura mínima de 44 px, borda de 1 px com `--card-border` e radius de 14 px;
- seletor e menu usam `--nav-bg` durante o blur, texto em `--text-color`/`--subtitle-color` e foco com `--primary-color` + `--primary-soft`; com blur desligado, voltam a `--card-bg` para reforçar a leitura;
- drop-down próprio em vez de `<select>` nativo, com `--shadow-card` e `--blur-card`; o menu deve ser posicionado pelo wrapper interno do valor selecionado, e não pelo bloco completo que também contém o rótulo **Buscar em**, para manter alinhamento previsível;
- chevron e marca de seleção desenhados somente em CSS, sem SVG/PNG ou outro asset;
- `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, `role="option"` e a mesma navegação por teclado usada na Galeria;
- empilhamento suficiente para que o menu fique acima da lista de posts e de outros painéis subsequentes;
- comportamento responsivo equivalente: controles em coluna no mobile e fonte de 16 px nos controles editáveis/interativos necessários para evitar zoom involuntário.

O cabeçalho do Blog segue a mesma hierarquia cromática da Galeria: eyebrow em
`--primary-color` sobre a superfície auxiliar global, título principal em
`--primary-color` e descrição em `--subtitle-color`. Não criar uma paleta exclusiva
para o Blog.

Desde a V48.3.4, o painel externo de ferramentas não aplica `backdrop-filter` diretamente em `.artes-tools`/`.blog-tools`; o vidro externo permanece em `::before`. A V48.3.5 acrescenta uma regra mais forte para o drop-down: enquanto aberto, o menu deve ser portado temporariamente para `document.body`, usando posicionamento fixo calculado pelo controle. Isso evita que o menu fique visualmente limitado pela composição/backdrop do painel e garante que seu `backdrop-filter` atue sobre a página real atrás dele. Ao fechar, o mesmo nó retorna ao wrapper original; não criar uma cópia do listbox.

Desde a V48.3.10, a moldura externa desses dois painéis também pertence ao `::before`: a borda herdada de `glass-panel` fica transparente no elemento pai, enquanto o pseudo-elemento usa `inset: -2px`, `border: 2px solid var(--card-border)` e `border-radius: var(--radius-card)`. Isso faz o `backdrop-filter` cobrir também a área sob a borda sem reintroduzir uma Backdrop Root ancestral. Não mover o blur de volta para `.artes-tools`/`.blog-tools`.

Campo e menu devem manter fundo translúcido derivado de `--nav-bg`, com fallback para o token original. Quando `data-blur="off"`, não usar blur/saturação e voltar a `--card-bg`.

Os campos editoriais continuam específicos de cada página: a Galeria usa Todos,
Artista, Título, Categoria e Tags; o Blog usa Todos, Título, Resumo e Tags. Os
filtros de tags do Blog continuam em pills e não precisam imitar os filtros de
categoria da Galeria. Não alterar `data/blog/*` apenas para atender a essa regra
visual.

Desde a V48.3.22, as faixas horizontais de filtros de Jogos, Blog e Galeria
indicam conteúdo oculto com `mask-image` aplicado à própria faixa rolável, e não
com uma camada de fundo sobre os chips. Isso evita blocos/recortes visíveis sobre
superfícies translúcidas e permite que o realce do chip selecionado permaneça
integrado ao próprio botão. As setas continuam sobrepostas e não reservam espaço.

## Carrosséis

Lives e Agenda mantêm:

- setas;
- navegação por teclado;
- scroll horizontal;
- scroll-snap;
- touch nativo;
- click + arrasta em ponteiro fino.

O estado de arraste não deve disparar o clique de um card de Live.

## Responsividade

Evitar larguras fixas que produzam overflow.
Mudanças devem ser verificadas pelo menos em desktop e viewport móvel.

## Movimento

Animações/transições devem respeitar `prefers-reduced-motion`.
Não adicionar movimento indispensável à compreensão da interface.

## Acessibilidade

Manter:

- foco visível;
- controles com nome acessível;
- headings em ordem coerente;
- contraste suficiente;
- links externos identificáveis pelo contexto;
- `aria-live` somente onde já há atualização dinâmica relevante.

## Assets

Gráficos públicos vêm de `assets.kamylisumire.com`.
Não reintroduzir duplicatas locais de avatar, favicon, fundo e preview social.


### Navbar reordenável — V48.3.0

`data/content/navbar.json` mantém as nove chaves estáveis em `links` e adiciona `ordem`, uma lista sem duplicatas que determina a sequência visual dos nove itens. O runtime completa uma ordem ausente/incompleta com o padrão para compatibilidade, mas o conteúdo versionado atual deve listar todos os itens exatamente uma vez. **Apoiar** continua com estilo de CTA, porém participa do mesmo fluxo reordenável.
### Apoiar fixo opcional — V48.3.1

`data/content/navbar.json` aceita `apoioFixoNoFim`. Com `true` — e também quando a chave está ausente, por compatibilidade — o runtime aplica `ordem` aos itens e força **Apoiar** para o final, mantendo a posição histórica do CTA. Com `false`, `apoio` participa livremente da posição definida em `ordem`. As outras oito chaves continuam reordenáveis nos dois modos.

### CTA Apoiar em dois modos — V48.3.2

Quando `apoioFixoNoFim` é `true`, o CTA mantém a composição histórica à direita, fora do scroll central e com divisor próprio. Quando `false`, ele participa do fluxo reordenável central sem perder o estilo de CTA.

### Performance de montagem — V48.3.6

A identidade visual não deve tornar o conteúdo dependente de assets decorativos. O fundo usado por `backdrop-filter` pode ser antecipado, mas não deve bloquear o reveal da página nem competir com conteúdo editorial em prioridade alta. Observers de montagem devem reagir somente aos componentes que precisam de configuração tardia e não a toda mutação do documento.
### Cor primária para texto — V48.3.7

No tema claro, `--primary-color` continua sendo o tom de identidade para fundos, bordas, ícones e títulos grandes. Texto normal ou pequeno que use a cor primária deve usar `--primary-text`, cujo contraste atende AA nas superfícies claras principais. No tema escuro, `--primary-text` mantém o mesmo tom visual de `--primary-color`. Não substituir títulos grandes por `--primary-text` apenas por consistência mecânica; a distinção é semântica e preserva a identidade visual.

Galeria e Blog continuam compartilhando a mesma hierarquia cromática: seus títulos principais usam `--primary-color`; controles, links, tags e estados textuais pequenos podem usar `--primary-text` quando necessário para contraste.
