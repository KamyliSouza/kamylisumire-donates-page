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
- superfícies em `--card-bg`, texto em `--text-color`/`--subtitle-color` e foco com `--primary-color` + `--primary-soft`;
- drop-down próprio em vez de `<select>` nativo, com menu em `--card-bg`, `--shadow-card` e `--blur-card`;
- chevron e marca de seleção desenhados somente em CSS, sem SVG/PNG ou outro asset;
- `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, `role="option"` e a mesma navegação por teclado usada na Galeria;
- empilhamento suficiente para que o menu fique acima da lista de posts e de outros painéis subsequentes;
- comportamento responsivo equivalente: controles em coluna no mobile e fonte de 16 px nos controles editáveis/interativos necessários para evitar zoom involuntário.

Os campos editoriais continuam específicos de cada página: a Galeria usa Todos,
Artista, Título, Categoria e Tags; o Blog usa Todos, Título, Resumo e Tags. Os
filtros de tags do Blog continuam em pills e não precisam imitar os filtros de
categoria da Galeria. Não alterar `data/blog/*` apenas para atender a essa regra
visual.

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
