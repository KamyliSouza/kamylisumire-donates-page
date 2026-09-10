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
- metadados sobrepostos somente na base da imagem, apoiados por gradiente escuro e `text-shadow` para contraste;
- `loading="lazy"` e `decoding="async"` nas imagens;
- `.site-loader-logo` reutilizado durante o carregamento individual, sem criar um segundo desenho de loader;
- estado de erro por card, sem bloquear o restante da grade;
- dialog nativo para ampliação, com foco/fechamento acessíveis;
- `alt` editorial obrigatório; crédito externo opcional e sempre HTTPS quando informado.

Desde a V48.0.1, cards usam a `preview` leve; o lightbox reaproveita essa preview enquanto carrega a `imagem` full e exibe o mesmo `site-loader-logo` do loader global durante a transição. A grade não deve baixar automaticamente a imagem full.\n\nEsse padrão pertence à Galeria e não deve ser aplicado mecanicamente a cards de
Lives, Agenda ou Blog. Não duplicar o CSS do loader global: a Galeria reutiliza
a classe compartilhada e altera apenas dimensões/posicionamento local.

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
