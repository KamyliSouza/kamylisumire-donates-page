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

## Blog

Desde a V48.1.3, a busca por campo da listagem do Blog deve seguir o mesmo padrão
visual e de interação da busca da Galeria. Essa paridade é uma regra do design
system, não uma coincidência de implementação.

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
