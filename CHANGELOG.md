# Changelog

## V48.3.61 — Fallback e timeout do cliente API

- limita o fallback `workers.dev` a falhas de transporte/timeout; respostas HTTP 4xx/5xx do domínio principal passam a ser devolvidas como erro sem repetir a mesma requisição no host de contingência;
- mantém o `AbortController` ativo até `response.json()` terminar, permitindo interromper também um corpo que trave depois de os headers já terem chegado;
- trata JSON inválido como erro da resposta recebida, sem mascará-lo com fallback para outro host;
- atualiza o cache-buster de `api.js` na Home e em Doações e adiciona testes dedicados do cliente API à CI.

## V48.3.60 — Segurança de URLs e retenção local do ranking

- centraliza a validação de URLs HTTP(S) em `KamyliSanitize.safeHttpUrl()` e faz Créditos, Footer, Steam e links da Twitch passarem pelo helper antes de chegar a `href`;
- restringe links de Steam a HTTPS em `store.steampowered.com` e links vindos da Twitch a HTTPS em `twitch.tv`/`www.twitch.tv`, mantendo thumbnails remotas apenas em HTTPS;
- mantém o cache `kamyli-ranking-cache-v4` com TTL de 30 minutos, mas agora agenda remoção proativa em todas as páginas e revalida expiração em `pageshow`, foco, visibilidade e mudanças de storage;
- faz `ranking.js` notificar cada gravação/remoção do cache para que o temporizador global seja rearmado sem depender de nova visita a `/doacoes/`;
- atualiza a Política de Privacidade e a documentação para descrever corretamente a retomada após suspensão do navegador e adiciona testes de regressão para URLs e retenção.

## V48.3.59 — Acessibilidade semântica de navegação e resultados

- adiciona “Pular para o conteúdo” nas oito páginas, apontando diretamente para o `<main>` focável sem alterar os IDs já usados por Artes, Blog e Jogos;
- adiciona os utilitários globais `.skip-link` e `.sr-only`, com foco visível, tokens de ação AA e respeito aos estados bloqueantes do loader;
- remove `aria-live` das grades inteiras de Artes e Jogos e cria regiões `role="status"` curtas para anunciar somente a quantidade de resultados;
- faz filtros e busca anunciarem contagens como “1 arte encontrada”/“12 jogos encontrados”, evitando releitura completa das grades por leitores de tela;
- adiciona `.github/tests/accessibility-semantics.test.mjs` à CI para proteger skip links, alvos focáveis e regiões live reduzidas.

## V48.3.58 — Contraste AA em superfícies de ação

- separa a cor de marca dos fundos de botões por meio de `--button-bg`, `--button-bg-hover` e `--button-text`;
- mantém branco sobre rosa escuro no tema claro e usa texto escuro sobre rosa claro no tema escuro, garantindo contraste WCAG AA para texto normal;
- aplica os novos tokens aos CTAs, filtros/abas ativos, seletores, controles do rodapé, carrosséis e botão Apoiar, sem alterar títulos, ícones e detalhes decorativos;
- troca textos pequenos de marca que não atingiam 4,5:1 no tema claro para `--primary-text`;
- adiciona `.github/tests/color-contrast.test.mjs` à CI para calcular contraste e proteger os componentes primários contra regressão.

## V48.3.57 — Fail-safe e latência do loader

- adiciona um fail-safe inline de 6 s em todas as páginas para liberar conteúdo, interação e rolagem caso `loader.js` não carregue ou falhe antes do reveal;
- impede que um `loader.js` tardio ressuscite o overlay depois de o fail-safe já ter liberado a página e cancela o timer quando o fluxo normal assume o reveal;
- reduz o mínimo do loader inicial de 500 ms para 320 ms, preservando o teto de 2,5 s e os timings próprios da navegação interna;
- atualiza o cache-buster do loader e os hashes CSP do bootstrap inline em todas as páginas;
- adiciona `.github/tests/loader-failsafe.test.mjs` à CI para verificar o fail-safe, CSP e contratos de timing.

## V48.3.56 — Robustez do Worker

- envolve o roteamento HTTP em tratamento global de exceções, devolvendo JSON `500` com CORS e `Cache-Control: no-store` em vez de erro 1101 sem cabeçalhos úteis;
- protege o callback OAuth contra resposta de token com JSON inválido;
- limita a paginação de doações da Streamlabs a 50 páginas e detecta cursor `before` sem progresso, falhando antes de qualquer persistência parcial;
- passa a renovar VODs da Twitch após 20 h, mantendo o snapshot público/KV válido por no máximo 24 h e eliminando a janela diária esperada de 503 entre expiração e próximo Cron;
- envia `Vary: Origin` em todas as respostas com CORS restrito, inclusive para requisições sem origem permitida;
- adiciona `.github/tests/worker-robustness.test.mjs` à CI para cobrir erro global, CORS, paginação e janela de VODs.

## V48.3.55 — Ledger atômico do ranking

- introduz `ledger:v1` como fonte primária do estado do ranking (`lastId`, mês, totais geral e mensal) em uma única chave KV, eliminando avanço parcial entre totais e cursor de deduplicação;
- migra automaticamente das chaves legadas somente após uma consulta bem-sucedida à Streamlabs e mantém essas chaves como espelhos de compatibilidade, sem apagá-las nesta versão;
- deriva `ranking:monthly` e `ranking:allTime` em toda sincronização bem-sucedida com `putKVIfChanged`, permitindo autorreparo no cron seguinte se um snapshot falhar depois do commit do ledger;
- trata `ledger:v1` inválido de forma fail-closed, sem recuar silenciosamente para estado legado possivelmente obsoleto;
- expande a suíte do Worker para 14 testes, incluindo migração, prioridade do ledger, commit fail-closed, reparo dos espelhos e retry sem dupla contagem após falha de snapshot.

## V48.3.54 — Testes automatizados do Worker e ranking

- adiciona uma suíte `node:test` sem dependências externas para exercitar diretamente a lógica real de `workers.js` em memória, sem alterar o módulo publicado em produção;
- cobre virada mensal em `America/Sao_Paulo`, parsing de datas, ordenação Top 5, anonimização, deduplicação entre sincronizações, reset mensal, paginação e falhas fechadas da API/JSON;
- integra a suíte ao workflow `Validate public site` e faz o validador exigir tanto o arquivo de testes quanto sua execução na CI;
- estabelece uma rede de segurança antes da futura migração atômica do estado do ranking.

## V48.3.53 — Ranking mensal no fuso de Brasília

- calcula a chave mensal do ranking em `America/Sao_Paulo`, em vez de UTC, para que a virada ocorra à meia-noite de Brasília;
- aplica o mesmo critério tanto ao mês corrente quanto à data de cada doação durante a sincronização;
- protege o contrato no validador para impedir regressão silenciosa para `getUTCFullYear()`/`getUTCMonth()` ou remoção do timezone explícito.

## V48.3.52 — Estado assíncrono do ranking e diálogo da Galeria

- mantém o ranking na aba atualmente selecionada quando a resposta da API/cache chega, em vez de forçar novamente “Este mês”;
- durante a carga, trocar entre “Este mês” e “Todos os tempos” preserva o estado “Carregando ranking...” em vez de exibir uma lista vazia como se não houvesse doações;
- invalida carregamentos full antigos da Galeria quando o diálogo é fechado ou uma nova obra assume o estado, impedindo que uma imagem atrasada sobrescreva título/legenda de outra obra;
- atualiza cache-busters de `ranking.js`/`artes.js` e adiciona contratos de regressão ao validador.

## V48.3.51 — Consistência de doações, loader de Jogos e SEO runtime

- alinha o fallback estático do Pixie ao valor editorial atual de R$ 1,00 e remove do HTML o aviso legado de mínimo de R$ 6,00;
- valida na CI que descrições e aviso estáticos de Doações repetem `data/content/doacoes.json`, evitando nova divergência entre fallback e conteúdo carregado;
- faz `/jogos/` sinalizar `KAMYLI_PAGE_CONTENT_READY` ao concluir `init()`, inclusive em falha tratada, permitindo que o loader libere a página sem esperar o teto de 2,5 s;
- impede `applyRuntimeSeo()` de usar os metadados da Home como fallback em páginas sem entrada própria, preservando os títulos e descriptions estáticos de Jogos, Privacidade e Uso de IA;
- atualiza os cache-busters dos scripts alterados e adiciona contratos de regressão ao validador.

## V48.3.50 — Hotfix: alinhamento dos controles do Blog

- reorganiza a barra de ferramentas do Blog para seguir a mesma ordem visual da Galeria: tags/filtros à esquerda e busca + seletor à direita no desktop;
- no mobile, mantém a faixa de tags antes dos controles de busca, preservando a mesma hierarquia da Galeria;
- não altera filtros, pesquisa, dropdown, rolagem horizontal, conteúdo editorial ou comportamento responsivo existente.

## V48.3.49 — Hotfix: estado aberto e scroll de Redes

- mantém `@ Redes` com a superfície `--card-bg` quando aberto, evitando que `--primary-soft` translúcido + blur deixe o gatilho visualmente lavado;
- indica o estado aberto por borda primária e halo suave, preservando as cores do `@` e do rótulo;
- troca o fechamento externo de `click` para `pointerdown`, fazendo um gesto de scroll iniciado fora do popup fechá-lo antes que a página role;
- mantém links internos, exclusão mútua com Menu, Voltar/Escape, History API e desktop inalterados.

## V48.3.48 — Hotfix: Menu oculto durante o loader

- oculta toda a camada mobile do Menu enquanto `site-loading-pending`, `site-loading-visible`, `site-navigation-loading` ou `site-page-leaving` estiver ativo;
- replica no drawer, que vive fora de `.site-nav`, o mesmo contrato de visibilidade já usado por `@ Redes`;
- usa `visibility: hidden` e `pointer-events: none` além de opacidade zero, impedindo que gatilho, backdrop ou faixa de swipe recebam interação durante o carregamento;
- não altera o comportamento normal do drawer, Redes ou Navbar desktop.

## V48.3.47 — Hotfix: Redes não reabre na Home

- torna o estado de Menu/Redes no History API estritamente temporário e vinculado ao documento atual, impedindo que `socials` seja restaurado após reload, navegação ou retorno via BFCache;
- limpa qualquer marcador de overlay herdado de versões anteriores na inicialização e ao sair/restaurar a página;
- preserva `history.state` quando a Home altera apenas o hash da seção, evitando apagar o estado do controlador durante navegação interna;
- mantém Voltar do Android, Escape, exclusão mútua Menu/Redes e restauração de foco da V48.3.46.

## V48.3.46 — Polimento coordenado de Menu e Redes no mobile

- adiciona `mobile-overlay.js` como controlador único das camadas temporárias mobile, garantindo que apenas `Menu` ou `Redes` possa ficar aberto por vez;
- unifica o comportamento do botão/gesto Voltar, `Escape`, troca entre overlays e restauração de foco sem acumular entradas artificiais no histórico;
- converte `@ Redes` de `<details>` autônomo para popup controlado, com `aria-expanded`, `inert` e animação curta de opacidade/deslocamento;
- harmoniza os estados abertos de `Menu` e `Redes` com `--primary-soft`, mantendo dimensões/safe areas equivalentes e sem hover persistente em touch;
- oculta temporariamente os dois gatilhos quando um campo de texto abre o teclado virtual e reduz significativamente a viewport;
- preserva drawer por gesto, backdrop, foco confinado no Menu, navbar desktop e comportamento editorial existentes.

## V48.3.45 — Hotfix: drawer mobile sem cabeçalho e integrado ao Voltar

- remove do drawer mobile o cabeçalho visual `Menu` e o botão `×`, reduzindo carga visual sem retirar os demais meios de fechamento;
- mantém fechamento por swipe para a esquerda, toque no backdrop e `Esc`, com foco inicial transferido para o primeiro link do drawer;
- integra a abertura do drawer ao histórico do navegador: no Android/navegador, o botão ou gesto `Voltar` fecha primeiro o drawer antes de navegar para a página anterior;
- consome a entrada temporária do histórico antes de executar links do drawer, evitando uma etapa fantasma ao voltar;
- preserva acessibilidade com `role="dialog"`, `aria-modal` e `aria-label="Navegação principal"`, além de `inert` quando fechado.

## V48.3.44 — Drawer mobile refinado, ícones e gestos

- reduz o drawer para `clamp(248px, 74vw, 288px)`, mantendo uma faixa visível do site e proporção mais natural para rótulos curtos;
- posiciona o drawer explicitamente abaixo da Navbar mobile, removendo a separação superior redundante e mantendo apenas a borda lateral;
- agrupa os links no topo com espaçamento constante e mantém `Apoiar` fixo no rodapé, sem distribuir itens verticalmente em telas altas;
- aproxima os links do estilo da Navbar desktop: sem bordas individuais, fundo transparente e destaque suave apenas em ativo/foco/hover;
- adiciona SVGs genéricos locais para Lives, Artes, Blog, Jogos, Regras e Créditos e usa fallbacks visuais apenas no drawer mobile; ícones editoriais continuam tendo prioridade;
- adiciona gesto pela faixa de 24 px da borda esquerda para abrir e swipe do drawer para a esquerda para fechar, acompanhando o dedo com painel/backdrop e preservando scroll vertical;
- mantém botão `Menu`, `@ Redes`, teclado, foco, `prefers-reduced-motion`, safe areas, conteúdo editorial e Navbar desktop.

## V48.3.43 — Navegação mobile em drawer lateral

- substitui a caixa flutuante do `Menu` por um drawer retrátil que desliza da lateral esquerda, com largura responsiva de até 320 px e backdrop sobre o conteúdo;
- mantém a lista de páginas rolável e o CTA `Apoiar` fixo no rodapé, agora com alvos de toque de 48 px;
- adiciona cabeçalho próprio com botão de fechar, fechamento por backdrop/Escape/seleção, foco inicial e ciclo de Tab dentro do drawer;
- bloqueia o scroll do documento enquanto o drawer está aberto e respeita `prefers-reduced-motion` e a preferência global de blur;
- preserva `@ Redes` como popup rápido e corrige a exclusão mútua para que abrir Redes feche o drawer;
- mantém Header mobile, animação do título, conteúdo editorial e Navbar desktop inalterados.

## V48.3.42 — Hotfix: rótulos completos no Menu mobile

- troca o layout interno dos links do Menu de Grid para Flex, evitando que rótulos caiam na coluna fixa de 24 px quando o ícone está `hidden`;
- mantém ícones visíveis ao lado do texto quando existirem e permite que o rótulo use todo o espaço restante quando o ícone estiver oculto;
- preserva largura integral dos botões, alinhamento à esquerda, truncamento apenas quando realmente faltar espaço, CTA `Apoiar` fixo e Navbar desktop.

## V48.3.41 — Hotfix: itens do Menu ocupam a largura útil real

- corrige a regra da V48.3.40 que mirava `.site-nav-item`, wrapper que não existe no markup da Navbar;
- aplica a geometria diretamente aos links filhos de `.site-nav-links`, com `justify-self: stretch`, largura inline de 100% e sem `max-width`;
- mantém lista e rodapé com o mesmo recuo lateral de 8 px, fazendo os botões comuns e `Apoiar` compartilharem as mesmas bordas úteis;
- preserva painel de 220 px, alinhamento esquerdo, scroll interno, título animado, comportamento Android/Brave e Navbar desktop.

## V48.3.40 — Hotfix: largura útil dos itens do Menu mobile

- restaura o painel `Menu` para 220 px de largura-base, mantendo limite responsivo pela viewport;
- força a grade rolável e cada `.site-nav-item` a ocupar toda a largura útil do painel, eliminando o aspecto de botões estreitos/centralizados;
- mantém a margem interna de 8 px, fazendo os botões comuns acompanharem a mesma geometria lateral do CTA `Apoiar`;
- preserva alinhamento esquerdo, animação do título, rodapé fixo, comportamento Android/Brave e Navbar desktop.

## V48.3.39 — Hotfix: proporção do Menu e alinhamento do título mobile

- reduz o painel `Menu` mobile para a mesma largura-base de `@ Redes` e usa a mesma grade `ícone + texto`, deixando a escala dos controles coerente;
- força os rótulos dos itens do Menu a permanecerem alinhados à esquerda, com truncamento seguro quando necessário;
- alinha novamente à esquerda o título contextual entre as divisórias de Logo e Apoiar, mantendo cor, tamanho, truncamento e animação vertical da V48.3.38;
- mantém `Apoiar` fixo no rodapé do Menu, agora com a mesma altura-base dos demais itens, sem alterar Navbar desktop ou o contrato editorial.

## V48.3.38 — Menu mobile refinado e título animado

- harmoniza a escala do botão/painel `Menu` com `@ Redes`, incluindo dimensões, cartões internos, ícones, bordas e estados de interação;
- separa o painel mobile em uma área de navegação rolável e um rodapé fixo, mantendo uma representação sincronizada de `Apoiar` sempre acessível no fim do Menu;
- centraliza novamente o título contextual no topo e preserva as divisórias visuais entre Logo, título e Apoiar;
- anima verticalmente a troca do título entre seções e, ao navegar pela Navbar entre páginas, transporta temporariamente o título anterior via `sessionStorage` para completar a transição no destino;
- mantém `navbar.json` funcional mesmo com os nós mobile fora de `.site-nav`, respeita `prefers-reduced-motion`, preserva o workaround de viewport para Chromium/Brave Android e não altera a Navbar de desktop.

## V48.3.37 — Hotfix: Menu mobile no viewport e título contextual

- corrige no Chromium/Brave Android o botão `Menu` que podia aparecer junto ao topo porque `backdrop-filter` da Navbar cria um containing block para descendentes com `position: fixed`;
- move, somente no breakpoint mobile, o gatilho e o painel de Menu para uma camada irmã da Navbar, mantendo os mesmos nós/links e restaurando-os à estrutura desktop ao sair do breakpoint;
- preserva blur da Navbar, safe areas, fechamento Menu/Redes, Escape, clique externo, navegação editorial, estado ativo e todas as rotas/seções existentes;
- altera o título contextual mobile para rosa, maior e alinhado à esquerda entre Logo e Apoiar, com `ellipsis` para não deslocar o CTA;
- atualiza cache-buster e CI da Navbar para proteger a correção.

## V48.3.36 — Navegação mobile por menu flutuante

- substitui apenas no mobile a antiga faixa horizontal rolável por um botão flutuante `Menu` no canto inferior esquerdo, reaproveitando os mesmos links e a mesma ordem editorial da Navbar;
- reorganiza o topo mobile para `Logo / título da página atual / Apoiar`, mantendo o CTA no slot superior quando `apoioFixoNoFim: true` e preservando o modo livre quando `false`;
- mantém `@ Redes` flutuante à direita e torna Menu/Redes mutuamente exclusivos, com fechamento por seleção, clique externo, Escape e mudança para viewport desktop;
- preserva scroll animado/estabilizado das seções da Home, estado ativo, transições, links externos, ícones/URLs editoriais, safe areas, teclado, touch e `prefers-reduced-motion`;
- mantém desktop/tablet largo com a Navbar tradicional e atualiza cache-busters, documentação e CI para proteger o novo contrato responsivo.

## V48.3.35 — Hotfix: estado touch do botão de redes no Android

- corrige o gatilho mobile `@ Redes` que podia permanecer visualmente translúcido após toque em navegadores Chromium/Brave no Android por causa de `:hover` persistente;
- restringe o efeito de hover do gatilho a dispositivos que realmente suportam hover e ponteiro fino, sem alterar o hover de desktop;
- mantém o estado aberto/foco do botão sobre a superfície `--card-bg`, preservando borda de destaque e legibilidade enquanto o menu está aberto;
- adiciona `touch-action: manipulation` e remove o highlight de toque do WebKit/Chromium para estabilizar a resposta visual sem JavaScript adicional;
- atualiza cache-buster do CSS social e amplia a CI para impedir o retorno do hover mobile global.

## V48.3.34 — Hotfix: posição do dock social e clareza no mobile

- move o dock social de desktop/tablet da direita para a esquerda da viewport, preservando safe area, posição fixa e independência da geometria do conteúdo;
- move os tooltips para o lado interno do conteúdo, à direita do dock, e ajusta o microdeslocamento de hover/foco para acompanhar a nova lateral;
- substitui no mobile o glyph ambíguo de compartilhamento por uma cápsula textual `@ Redes`, mantendo o menu expansível nativo e o `aria-label` editorial;
- preserva fechamento por Escape/clique externo, navegação por teclado, `prefers-reduced-motion`, links editoriais e z-index abaixo da Navbar/listboxes;
- atualiza cache-busters, documentação e CI para impedir regressão à lateral direita ou ao ícone de compartilhamento no gatilho mobile.

## V48.3.33 — Redes sociais globais editoriais

- centraliza as redes sociais em `data/content/redes.json`, com ordem, nome, URL, ícone e visibilidade editoriais;
- adiciona um dock vertical fixo para desktop/tablet e um botão expansível nativo no mobile, disponível em todas as páginas públicas;
- remove a lista social hardcoded do Hero para evitar duplicidade visual e manter uma única fonte editorial global;
- amplia a biblioteca segura de ícones com Twitch, TikTok, X, Instagram, Discord e o glyph genérico de compartilhamento, sem aceitar SVG/HTML bruto no JSON;
- mantém links externos em HTTPS, `noopener noreferrer`, foco por teclado, fechamento por Escape/clique externo e `prefers-reduced-motion`;
- mantém o dock abaixo da Navbar/listboxes no empilhamento e oculta o componente durante loader/transição de página;
- amplia CI, documentação e cache-busters para proteger o novo contrato editorial e garantir o carregamento do componente em todas as páginas públicas.

## V48.3.32 — Paginação editorial de Jogos

- altera a página de Jogos de 12 para 15 cards por página;
- adiciona `data/content/jogos-config.json` com `jogosPorPagina`, permitindo alterar a quantidade editorialmente sem editar JavaScript ou sincronizar Trello/Steam;
- valida `jogosPorPagina` como inteiro entre 1 e 60 e mantém fallback resiliente de 15 no frontend caso a configuração não possa ser carregada;
- faz busca, filtros e paginação reutilizarem o mesmo valor editorial, preservando o limite visual de até cinco botões numéricos;
- atualiza cache-buster, documentação e CI para impedir o retorno do limite fixo legado de 12 jogos.

## V48.3.31 — Manutenção: fallbacks, CI, Agenda, sync e privacidade de mídia

- sincroniza os fallbacks embutidos de Navbar e Blog em `js/core/content.js` com `navbar.json`/`config.json` e faz a CI exigir paridade exata, evitando retorno silencioso de ordem, link ou placeholder antigos quando um JSON editorial falhar;
- torna o conteúdo interno da Agenda focável somente quando houver overflow vertical real, inclusive com uma única live longa, recalculando após render, resize e carregamento de fontes sem alterar a altura fixa de 210 px;
- serializa `Sync games from Trello` e `Sync agenda from Trello` no mesmo grupo editorial e adiciona `git pull --rebase` antes do push, reduzindo colisões entre commits automáticos sem force push;
- inclui `sync-jogos.mjs` nos checks explícitos de sintaxe da CI e nas validações do próprio workflow de Jogos;
- aplica `referrerPolicy = "no-referrer"` às imagens e ao preload da Galeria e documenta na Política de Privacidade que hosts editoriais externos ainda podem receber metadados de rede necessários à entrega do arquivo;
- remove `lastmod` manual do `sitemap.xml`, amplia a CI para canonicals/indexação de Jogos, Privacidade e Uso de IA e rejeita URLs obsoletas ou `lastmod` não automatizado;
- corrige a documentação do ranking para deixar explícito que cache local expirado é removido, nunca reutilizado como fallback;
- endurece a agregação interna do ranking com objetos sem protótipo, evitando colisões de chaves especiais em identificadores de exibição autodeclarados;
- atualiza cache-busters dos JavaScripts alterados e a matriz de manutenção/validação.

## V48.3.30 — Hotfix: aviso Steam expansível e alinhamento da Navbar

- transforma o aviso local da Steam abaixo da Agenda em um disclosure nativo `<details>`/`<summary>`, mantendo `Dados e ícones da Steam · Aviso legal` sempre visível;
- preserva integralmente o texto de disponibilidade/garantias, limitação de responsabilidade e independência/não afiliação dentro da área expansível;
- usa interação nativa acessível por teclado, sem JavaScript adicional e sem alterar a geometria dos cards da Agenda;
- corrige o posicionamento horizontal da Navbar após a aplicação assíncrona da ordem editorial de `navbar.json`, realinhando o item ativo depois de `kamyli:global-ui-ready`;
- evita que Artes/Galeria, Blog e Jogos abram com a Navbar centralizada na posição fallback anterior ao reordenamento;
- atualiza os cache-busters públicos da Navbar, as regras de manutenção e a validação arquitetural para impedir regressões.

## V48.3.29 — Hotfix: aviso Steam na Agenda

- adiciona um aviso compacto imediatamente abaixo da Agenda para cobrir os ícones e dados de jogos provenientes da Steam sem depender de o visitante abrir a página de Jogos;
- informa apresentação conforme disponível/sem garantias, limitação de responsabilidade na extensão permitida pela lei e independência/não afiliação com Valve/Steam;
- mantém o aviso fora dos cards e das lives individuais para preservar a geometria de 210 px e evitar repetição visual;
- atualiza somente o CSS/cache-buster e a validação necessários para tornar o aviso um requisito de manutenção da Home.

## V48.3.28 — Hotfix: ícones da Steam na Agenda

- troca a miniatura vertical da Library Capsule na Agenda por um ícone quadrado oficial da Steam, mantendo as capas verticais exclusivamente na página de Jogos;
- enriquece `data/content/jogos.json` com `icon` opcional derivado de `community_icon` nos metadados oficiais da Steam, sem expor novas credenciais no frontend;
- faz o sincronizador da Agenda reutilizar somente esse ícone pelo `SteamAppID:`, sem realizar chamadas próprias à Steam e sem duplicar cache;
- mantém compatibilidade transitória com `agenda.json` anterior, mas deixa de renderizar a capa vertical antiga na Home após a migração;
- reduz a mídia da Agenda para 48 × 48 px, preservando o hotfix de altura fixa de 210 px e removendo o ícone visualmente caso o asset externo falhe;
- atualiza validação, documentação, privacidade e cache-busters da Home para o novo asset compacto.

## V48.3.27 — Hotfix: tamanho estável dos cards da Agenda

- fixa os cards da Agenda na altura visual original de 210 px, evitando que um dia com várias lives aumente a altura dos demais cards do carrossel;
- move o conteúdo excedente para rolagem vertical interna, mantendo cabeçalho, largura e geometria do carrossel estáveis;
- mantém a região com múltiplas lives acessível por teclado e preserva capas, ordem cronológica, click + arrasta, touch e scroll-snap existentes;
- atualiza apenas os cache-busters da Home afetados pelo hotfix.

## V48.3.26 — Agenda no Trello e múltiplas lives por dia

- adiciona sincronização independente da Agenda por GitHub Actions usando um quadro Trello dedicado, sem chamadas à API do Trello feitas pelo navegador;
- usa sete listas de dias da semana e um card por live, permitindo zero, uma ou várias transmissões no mesmo dia;
- introduz o campo aditivo `lives` em cada dia de `data/agenda.json`, preservando `temLive`, `horario`, `titulo`, `descricao` e `plataformas` como espelho da primeira live para compatibilidade com Helpers antigos;
- mantém o frontend compatível com o JSON legado sem `lives` e passa a exibir várias lives dentro do mesmo card diário, em ordem cronológica e com fallback para a ordem do Trello;
- permite `Semana: YYYY-MM-DD` e `Observacao:` na descrição do quadro, além de `Horario:`, `Plataformas:`, `Descricao:`, `Data:` e `SteamAppID:` opcionais/estruturados nos cards, com validação estrita antes de qualquer commit;
- quando `SteamAppID:` é informado, reutiliza exclusivamente a Library Capsule oficial já resolvida em `data/content/jogos.json`, sem fazer uma segunda consulta à Steam e sem duplicar cache/credenciais; a ausência de capa não impede a publicação da live;
- exibe a capa opcional ao lado da live na Agenda, inclusive quando há várias transmissões no mesmo dia, usando `loading=lazy` e `referrerpolicy=no-referrer`;
- adiciona o workflow `Sync agenda from Trello`, reutiliza `TRELLO_API_KEY`/`TRELLO_TOKEN` e lê o quadro pela Repository Variable `TRELLO_AGENDA_BOARD_ID`;
- atualiza README, regras de manutenção, validação CI, cache-busters da Home e Política de Privacidade para refletir a nova sincronização server-side.

## V48.3.25 — Migração: catálogo de Jogos com Steam Web API

- remove o SteamGridDB da sincronização e substitui a identificação automática pelo método documentado `IStoreService/GetAppList` da Steam Web API;
- usa `STEAM_WEB_API_KEY` apenas no GitHub Actions e envia a chave pelo header `x-webapi-key`, sem expô-la no frontend ou em URLs/logs;
- mantém `SteamAppID:` na descrição do Trello como override autoritativo para títulos ambíguos ou com nome editorial diferente;
- migra o cache de artwork para V3, preservando somente associações já confirmadas com Steam App ID e asset oficial e descartando dependências/proveniência do SteamGridDB;
- mantém somente Library Capsules oficiais da Steam, tentando caminhos determinísticos antes do fallback de metadados para assets modernos com hash;
- atualiza o workflow, a Política de Privacidade e o aviso da página Jogos para a arquitetura Steam-only e adiciona os avisos de disponibilidade/garantia e não afiliação previstos nos termos da Steam Web API.

## V48.3.24 — Hotfix: Library Capsules modernas da Steam

- passa a consultar os metadados oficiais de assets da Steam antes do caminho CDN legado, suportando Library Capsules recentes armazenadas em caminhos versionados/hash;
- prefere a variante vertical 2x quando publicada e mantém `library_600x900_2x.jpg`/`library_600x900.jpg` como fallback para jogos no formato legado;
- preserva a política de usar somente assets originais da Steam, sem voltar a selecionar grids comunitários do SteamGridDB;
- invalida apenas falhas antigas de `no-original-steam-portrait` para que jogos afetados sejam reavaliados na próxima sincronização, sem limpar todo o cache;
- permite ignorar somente um ano editorial final, como `(2026)`, durante a identificação automática, preservando integralmente o nome exibido vindo do Trello;
- amplia a validação de `jogos.json` para aceitar somente Library Capsules oficiais nos hosts/caminhos esperados da Steam.

## V48.3.23 — Hotfix: Steam App ID gratuito pela descrição do Trello

- substitui o override por Custom Field pago por uma linha opcional `SteamAppID: 123456` na descrição do card do Trello;
- o marcador da descrição continua tendo prioridade sobre a resolução automática pelo nome e alimenta tanto **Ver na Steam** quanto a tentativa de capa vertical original;
- aceita `SteamAppID`/`Steam App ID` sem diferenciar maiúsculas e minúsculas, mas rejeita valores inválidos ou IDs conflitantes e mantém o fallback automático nesses casos;
- remove a consulta a `/customFields` e `customFieldItems`, reduzindo uma chamada ao Trello e eliminando a dependência de Campos Personalizados;
- a descrição completa do card nunca é publicada em `jogos.json` nem registrada nos logs; somente o App ID validado é utilizado.

## V48.3.22 — Hotfix: fade sem recorte nos filtros

- substitui as camadas de degradê sobrepostas das faixas de Jogos, Blog e Galeria por máscaras de borda aplicadas diretamente ao conteúdo rolável, eliminando o recorte retangular visível sobre superfícies translúcidas;
- mantém as setas laterais flutuantes e contextuais sem reservar espaço quando somem;
- torna o realce do filtro selecionado autocontido no próprio botão, com sombra compacta e anel interno, preservando legibilidade sem depender de uma sombra espalhada sob o fade;
- preserva click + arrasta, touch/trackpad, teclado, animações e `prefers-reduced-motion`, sem alterar busca, paginação ou integrações externas.

## V48.3.21 — Hotfix: fades dos filtros, Steam App ID no Trello e privacidade

- transforma as setas laterais de Jogos, Blog e Galeria em controles sobrepostos, sem reservar espaço quando uma direção deixa de estar disponível;
- adiciona degradês contextuais nas extremidades das faixas para indicar conteúdo oculto sem recorte brusco entre tag e seta;
- amplia o respiro vertical das faixas para preservar por completo a sombra do chip selecionado e mantém click + arrasta, touch, teclado e `prefers-reduced-motion`;
- permite usar o Custom Field opcional `Steam App ID` do Trello como override prioritário por card, mantendo a resolução automática pelo nome quando o campo estiver ausente, vazio ou inválido;
- usa o App ID informado no Trello para o link **Ver na Steam** e para a capa vertical original quando ela existir, sem publicar outros Custom Fields no JSON;
- atualiza a Política de Privacidade para explicar a sincronização server-side de Jogos e o carregamento direto de capas pela infraestrutura da Steam com `no-referrer`;
- corrige o aviso da página Jogos para refletir que o SteamGridDB auxilia a identificação, enquanto as capas exibidas são assets originais da Steam.

## V48.3.20 — Hotfix: sombras e setas dos filtros horizontais

- amplia o respiro interno das faixas de filtros para que a sombra do chip selecionado não seja recortada;
- adiciona setas laterais contextuais em Jogos, Blog e Galeria, exibidas somente quando há mais filtros ocultos naquela direção;
- as setas rolam apenas a própria faixa horizontal e desaparecem quando não há overflow, preservando o layout quando todos os filtros cabem;
- mantém click + arrasta com mouse/caneta, touch nativo, teclado, seleção animada e `prefers-reduced-motion`;
- aplica o mesmo padrão visual e funcional às listas de Jogos, tags do Blog e categorias da Galeria;
- não altera busca, paginação de Jogos, cards, Trello, Steam, Worker nem dados editoriais.

## V48.3.19 — Hotfix: filtros móveis e click + arrasta

- corrige a faixa horizontal de filtros de Jogos, Blog e Galeria para preservar respiro interno dos chips, evitando que bordas/realces sejam cortados nas extremidades;
- reforça a contenção de largura do painel de ferramentas no mobile e evita que a própria faixa horizontal desloque/alargue o layout da página;
- substitui `scrollIntoView()` dos chips por rolagem horizontal local, mantendo o item escolhido visível sem movimentar ancestrais ou a viewport;
- aplica às três faixas o mesmo padrão de click + arrasta com mouse/caneta usado em Lives e Agenda, preservando touch nativo, teclado e clique comum;
- suprime o clique imediatamente após um arraste para impedir seleção acidental de tag/categoria;
- não altera busca, paginação, cards, Trello, Steam, Worker nem dados editoriais.

## V48.3.18 — Hotfix: filtros roláveis, paginação compacta e transições

- mantém categorias/listas de Jogos em uma única linha horizontal rolável, impedindo que o painel de ferramentas cresça verticalmente quando o Trello ganha novas listas;
- aplica o mesmo padrão aos filtros de tags do Blog e de categorias da Galeria, preservando consistência visual entre as três páginas;
- limita o seletor de Jogos a cinco números visíveis por vez: primeira e última página permanecem fixas, enquanto as páginas intermediárias acompanham a posição atual;
- acrescenta setas de página anterior/próxima nas laterais, desabilitadas quando não há navegação possível, e reticências para indicar saltos entre faixas;
- adiciona uma transição curta ao trocar categoria/tag ou página, além de realce suave no controle selecionado, sempre respeitando `prefers-reduced-motion`;
- em telas menores, filtros e busca continuam ocupando linhas próprias e a paginação fica mais compacta para evitar estouro horizontal;
- não altera dados editoriais, cards, Worker ou integrações externas.

## V48.3.17 — Hotfix: resolução Steam e paginação de Jogos

- desacopla `steamAppId`/`steamUrl` da existência de capa: jogos identificados com segurança na Steam passam a exibir **Ver na Steam ↗** mesmo quando usam o placeholder;
- mantém o Original Steam Asset somente quando a cápsula vertical oficial está disponível, sem reintroduzir grids comunitários;
- torna o link Steam mais perceptível e acessível dentro da sobreposição do card;
- limita a grade a 12 jogos por página e adiciona paginação local abaixo dos cards, respeitando busca e filtros sem novas chamadas externas;
- ao alterar busca ou categoria, retorna à página 1; o seletor some quando há no máximo uma página de resultados.

## V48.3.16 — Hotfix: cards de Jogos e link Steam

- aproxima os cards de `/jogos/` da linguagem visual da Galeria, com borda/sombra, elevação discreta e zoom suave da capa;
- move título e categoria/lista para uma sobreposição no rodapé da imagem com gradiente/sombra, preservando legibilidade;
- remove a borda interna do placeholder, mantendo apenas o fallback visual integrado ao site;
- publica `steamUrl` somente quando a sincronização já confirmou um `steamAppId`, e exibe **Ver na Steam** apenas nesses casos;
- mantém Trello, Original Steam Assets, Worker e demais páginas sem mudanças de contrato ou comportamento.

## V48.3.15 — Hotfix: assets originais e placeholder de Jogos

- deixa de publicar automaticamente grids comunitários do SteamGridDB: a busca passa a servir somente para confirmar uma correspondência Steam exata e inequívoca;
- usa a cápsula vertical `library_600x900.jpg` da Steam CDN quando o título também possui uma correspondência exata e única na loja Steam; na ausência de confirmação ou do asset original, mantém o jogo sem imagem;
- invalida o cache de artwork V48.3.14 para impedir que grids comunitários já resolvidos continuem sendo reutilizados;
- substitui o emoji genérico do fallback por um placeholder integrado ao design do site, usando tokens existentes e a marca já hospedada em `assets.kamylisumire.com`;
- não altera Trello, Navbar, Worker, Blog, Galeria, Ranking nem contratos editoriais alheios à página Jogos.

## V48.3.14 — Jogos das Lives

- adiciona `/jogos/` sem alterar o sistema visual global, reutilizando Navbar, footer, tokens, glass, preferências e padrões de acessibilidade existentes;
- troca somente o destino do item **Jogos** da Navbar para a nova página interna;
- adiciona sincronização somente-leitura Trello → `jogos.json` via GitHub Actions, com listas/cards dinâmicos e preservação de ordem;
- usa SteamGridDB apenas como enriquecimento visual, com cache, filtros 600×900/estático/sem NSFW/humor, fallback local e sem expor chaves no frontend;
- mantém o Worker fora do fluxo de Jogos e inclui validações de contrato na CI.

## V48.3.11 — Hotfix: nomes longos no ranking

- impede identificadores de exibição muito longos de aumentarem a largura do card de ranking ou da página;
- reforça a contenção horizontal em `.ranking-list` e `.ranking-item` e torna `.ranking-name` explicitamente encolhível com `flex: 1 1 0` + `width: 0`;
- preserva o nome completo no DOM e exibe visualmente `...` quando o espaço disponível termina, sem alterar valor, posição ou dados recebidos da API;
- atualiza o cache-buster de `ranking.css` para `48.3.11` e adiciona guarda de CI contra regressão de overflow.

## V48.3.10 — Hotfix: blur contínuo sob a borda externa

- corrige Galeria e Blog para que a borda externa de 2 px participe da mesma superfície com `backdrop-filter`, eliminando trechos da moldura que ainda mostravam o fundo sem desfoque;
- mantém `.artes-tools`/`.blog-tools` sem `backdrop-filter` para preservar a arquitetura sem Backdrop Root ancestral, mas torna a borda original transparente e move borda + vidro para o `::before`, que passa a usar `inset: -2px`;
- preserva o raio externo de 24 px, sombra, transparência, portal do seletor, filtros, busca e preferência **Blur desligado**;
- atualiza os cache-busters de `artes.css` e `blog.css` para `48.3.10` e fortalece a CI para impedir que a moldura volte a ficar fora da superfície desfocada.

## V48.3.9 — Hotfix visual da moldura de busca

- corrige a geometria do fundo translúcido dos painéis de ferramentas da Galeria e do Blog: `::before` passa de `inset: 2px` para `inset: 0`, eliminando o recuo duplo que fazia a borda parecer maior que a caixa;
- preserva `border-radius`, blur, transparência, stacking e o portal do seletor **Buscar em**, sem alterar comportamento de busca, tags ou dados editoriais;
- atualiza os cache-busters de `artes.css` e `blog.css` para `48.3.9` e a CI passa a exigir `inset: 0` nas duas superfícies.

## V48.3.8 — Privacidade LGPD e retenção do ranking

- identifica publicamente a responsável pelo tratamento como **Kamyli Souza** (nome social) e estabelece `contato@kamylisumire.com` como canal de privacidade e exercício de direitos, sem expor e-mail pessoal de destino, nome civil, endereço ou telefone;
- reescreve `/privacidade/` a partir do mapa técnico de dados: infraestrutura, preferências locais, ranking, créditos editoriais, provedores externos, transferências internacionais, retenção, direitos LGPD, segurança e incidentes;
- esclarece que LivePix/Pixie processam a contribuição fora do site e que o ranking usa um **identificador de exibição autodeclarado e não autenticado** + valor acumulado; documenta que Pixie possui ranking público nativo e LivePix oferece alertas/integrações de exibição, reforçando a expectativa contextual sem tratar os termos de terceiros como consentimento específico ao ranking deste site; textos iguais podem ser agregados sem provar que pertencem à mesma pessoa;
- transforma os 30 minutos do cache local do ranking em limite real de retenção: cache vencido é apagado, não há fallback expirado e a chave `v3` é removida ao carregar a nova `v4`, preservando a economia de API dentro da janela válida;
- mantém no card do ranking apenas um aviso contextual curto, com link para a Política de Privacidade; a explicação completa sobre identificador não verificado, contestação/personificação e pedidos internos fica centralizada na Política e no procedimento de governança;
- preserva o SEO condicional de Blog e Galeria sem forçar indexação: rotas vazias permanecem `noindex, follow` e fora do sitemap, e a CI passa a exigir `index, follow` somente quando houver conteúdo editorial público;
- adiciona `docs/PRIVACIDADE-RANKING.md` com o procedimento interno simplificado de moderação e atendimento, e amplia a CI para impedir regressão da política, do canal de contato, da semântica de identidade, do hard TTL e do aviso junto à funcionalidade.

## V48.3.7 — Hardening de segurança, contraste AA e indexação condicional

- remove `unsafe-inline` da CSP e autoriza apenas os blocos inline atuais por hashes SHA-256; a CI recalcula os hashes a partir dos bytes reais e bloqueia atributos `style=`/`on*=` incompatíveis com essa política;
- adiciona `--primary-text` para texto normal no tema claro, preservando `--primary-color` em fundos, bordas, ícones e títulos grandes;
- mantém a hierarquia cromática dos títulos principais de Home, Galeria e Blog sem escurecimento desnecessário;
- endurece `twitch-live.js` para aceitar thumbnail apenas quando o valor é string HTTPS;
- deixa `/artes/` e `/blog/` em `noindex, follow` e fora do sitemap enquanto não houver conteúdo público; a CI exige automaticamente `index, follow` + sitemap quando surgir a primeira arte ou o primeiro post publicado;
- remove os patches V48.3.5/V48.3.6 já incorporados que haviam ficado como resíduos na raiz;
- atualiza cache-busters dos assets CSS/JS alterados e documentação de manutenção.

## V48.3.6 — Hotfix: carregamento e observers sem perder navegação por seção

- reduz reaplicações de DOM: o observer editorial reage apenas à montagem de Navbar, Footer e diálogo externo, em vez de qualquer `childList` do documento;
- torna a ordenação da Navbar idempotente, evitando `appendChild()` quando links/slot Apoiar já estão na posição correta;
- filtra o observer de botões para reagir apenas quando novos elementos `[data-button-key]` são realmente inseridos;
- mantém integralmente `runAfterSiteReveal`, `hashchange`, scrollspy e estabilização de seção, preservando links diretos como `/#creditos`;
- reduz o mínimo do loader inicial para 500 ms e o fallback para 2500 ms, remove Agenda e decode do fundo do caminho crítico e rebaixa o preload do fundo para prioridade baixa;
- não altera contratos editoriais, JSONs, Workers, Helpers ou comportamento de navegação interna.

## V48.3.5 — Hotfix: menu de busca fora da Backdrop Root

- corrige definitivamente o blur do drop-down **Buscar em** da Galeria e do Blog movendo o menu aberto temporariamente para `document.body`;
- posiciona o menu por `getBoundingClientRect()`, acompanha resize/scroll e devolve o nó ao wrapper original ao fechar, preservando ARIA e teclado;
- torna campo/menu mais translúcidos e reforça blur/saturação sem alterar os tokens globais de tema;
- mantém **Blur desligado** sem `backdrop-filter` e com superfície `--card-bg`;
- atualiza cache-busters, Design System e CI sem alterar dados editoriais.

## V48.3.4 — Hotfix: blur real nos seletores de busca

- corrige Galeria e Blog para que o `backdrop-filter` dos seletores e menus não fique limitado pela Backdrop Root do `glass-panel` externo;
- move o blur visual do painel de ferramentas para uma camada `::before`, preservando fundo, borda e stacking sem bloquear os filtros descendentes;
- usa `--nav-bg` nos seletores/menus enquanto o blur está ativo e reforça `--card-bg` quando o usuário desliga o blur;
- atualiza cache-busters, Design System e validação arquitetural.

## V48.3.3 — Hotfix: seletores de busca e cabeçalho do Blog

- corrige o drop-down **Buscar em** da Galeria e do Blog para ancorar o menu ao controle do valor selecionado, evitando desalinhamento causado pelo rótulo lateral;
- preserva o componente customizado, ARIA, teclado, stacking e identidade visual já estabelecidos;
- faz o título principal do Blog usar `--primary-color`, seguindo a hierarquia cromática da Galeria e do restante do site;
- atualiza cache-busters, Design System e validação arquitetural sem alterar arquivos editoriais ou contratos dos Helpers.

## V48.3.2 — Hotfix: slot histórico real do CTA Apoiar

- corrige `apoioFixoNoFim: true` para restaurar o slot dedicado à direita, em vez de apenas colocar Apoiar por último no grupo central;
- mantém `apoioFixoNoFim: false` com reordenação livre via `ordem`;
- usa um único nó do CTA e o move entre o wrapper fixo e `.site-nav-links`;
- atualiza validação, documentação e cache-busters para V48.3.2.

## V48.3.1 — Hotfix: Apoiar fixo opcional na Navbar

- adiciona `apoioFixoNoFim` a `data/content/navbar.json`; quando `true` (ou ausente por compatibilidade), o CTA **Apoiar** é renderizado por último, preservando sua posição histórica à direita;
- quando `apoioFixoNoFim: false`, **Apoiar** volta a obedecer integralmente a posição declarada em `ordem`;
- os demais oito itens continuam totalmente reordenáveis e o CTA mantém seu estilo visual;
- mantém `version: 2` e não altera as nove chaves estáveis, URLs, ícones ou estrutura DOM da Navbar;
- atualiza validação, documentação e o cache-buster de `content.js` para V48.3.1.


## V48.3.0 — Ordem editorial da Navbar

- adiciona `ordem` a `data/content/navbar.json`, mantendo as nove chaves estáveis e permitindo reorganizar todos os itens, inclusive **Apoiar**;
- o runtime normaliza a ordem, ignora duplicatas/chaves desconhecidas em fallback e completa itens ausentes com a ordem padrão antes de reorganizar o DOM;
- o CTA Apoiar passa a participar do mesmo fluxo horizontal de `.site-nav-links`, preservando seu estilo visual e permitindo qualquer posição;
- mantém `version: 2`, `texto`/`icone`/`url`, Blog permanente e compatibilidade de leitura com dados V48.2.0 sem `ordem`;
- atualiza validação, documentação e cache-busters de Navbar para V48.3.0.


## V48.2.0 — Navbar editorial completa e Blog sempre visível

- evolui `data/content/navbar.json` para `version: 2`; cada item da navbar passa a ter `texto`, `icone` e `url` editáveis, mantendo chaves estáveis para Início, Lives, Agenda, Artes, Blog, Jogos, Regras, Créditos e Apoiar;
- move o botão **Apoiar** para o mesmo contrato da navbar e remove a dependência de `navbarSupport` em `data/content/buttons.json`;
- usa somente a biblioteca interna de ícones SVG construída por código (`button-icons.js`), sem adicionar assets gráficos locais; URLs editoriais aceitam caminhos internos iniciados por `/` ou HTTP(S);
- mantém links externos em nova aba e preserva o aviso global de saída; links da Home continuam usando scroll/scrollspy quando a URL configurada aponta para uma seção da Home;
- torna o Blog permanentemente visível: o link permanece na navbar, a seção da Home exibe o estado vazio quando não há posts e `/blog/` permanece no sitemap mesmo com zero publicações;
- adiciona `data/content/home-cards.json` como contrato de composição da Home: os sete cards nativos podem ser reordenados, ocultados/exibidos, alternados entre `compacto` e `grande` e usar as variantes `padrao`, `suave` ou `destaque`;
- permite adicionar até 17 cards `personalizado` além dos sete nativos (máximo de 24 cards), com eyebrow, título, descrição, ícone allowlisted, alinhamento e CTA interno/HTTP(S), sem HTML/SVG bruto, CSS arbitrário ou assets gráficos;
- mantém os conteúdos dos cards nativos em seus JSONs existentes; `home-cards.json` controla composição/apresentação, evitando duplicar contratos de Hero, Lives, Agenda, Blog, Regras, Créditos e Apoio;
- substitui a composição fixa da Home por uma grade editorial responsiva de duas colunas: `grande` ocupa toda a largura, `compacto` ocupa uma coluna e ambos voltam a largura total no mobile;
- atualiza CI, documentação e cache-busters para proteger os contratos V48.2.0;
- esta versão altera contratos editoriais e requer Helpers Web/Desktop compatíveis com `navbar.json` v2 e `home-cards.json` v1.

## V48.1.4 — Hotfix do painel externo da busca do Blog

- completa a paridade visual com a Galeria aplicando `glass-panel` ao bloco `.blog-tools`, para que filtros de tags, seletor **Buscar em** e campo textual compartilhem o mesmo fundo translúcido;
- padroniza padding, gap, margem inferior, alinhamento e comportamento mobile do painel externo com `.artes-tools`;
- mantém o drop-down customizado, filtros de tags, lógica de busca e campos editoriais introduzidos anteriormente;
- atualiza somente o cache-buster de `blog.css` para `v=48.1.4`; `blog.js` permanece em `v=48.1.3`;
- reforça Design System e validação para impedir que o Blog volte a exibir controles soltos sem o painel compartilhado;
- não modifica `data/blog/*`, `data/content/*`, schemas editoriais, Worker/KV ou contratos consumidos pelos Helpers.

## V48.1.3 — Hotfix de paridade visual da busca do Blog

- padroniza a busca por campo do Blog com o componente visual já adotado pela Galeria: mesmo desenho de superfície, borda, radius, foco, drop-down e estados de seleção;
- substitui o `<select>` nativo do Blog pelo mesmo padrão acessível de `listbox`/`option`, com navegação por teclado, fechamento por `Escape`/clique externo e chevron/check desenhados apenas em CSS;
- simplifica o campo textual do Blog para a mesma linguagem visual da Galeria, removendo o wrapper/ícone de busca exclusivo que produzia uma aparência divergente;
- protege o menu do Blog contra sobreposição por painéis subsequentes com stacking explícito em `.blog-tools`;
- documenta em `DESIGN-SYSTEM.md` que Galeria e Blog devem manter paridade visual nos controles de busca por campo, preservando campos editoriais e filtros próprios de cada página;
- atualiza cache-busters de `blog.css` e `blog.js` para `v=48.1.3`;
- não modifica `data/blog/*`, `data/content/*`, schemas editoriais, Worker/KV ou contratos consumidos pelos Helpers.

## V48.1.2 — Hotfix de empilhamento do drop-down da Galeria

- corrige o drop-down **Buscar em** que podia aparecer atrás dos cards/imagens da masonry;
- eleva o `stacking context` de `.artes-tools` acima de `.artes-grid`, necessário porque o `backdrop-filter` de `.glass-panel` cria um contexto de empilhamento próprio;
- mantém `overflow: visible` no painel de ferramentas para o menu poder ultrapassar seus limites visuais sem corte;
- atualiza somente o cache-buster do CSS da Galeria para `v=48.1.2`; o JavaScript continua em `v=48.1.1` porque não foi alterado;
- não modifica nenhum arquivo editorial, schema, Worker/KV ou contrato consumido pelos Helpers.

## V48.1.1 — Refinamento visual da Galeria e documentação

- substitui o `<select>` nativo do escopo de busca da Galeria por um drop-down acessível próprio, desenhado apenas com HTML/CSS/JS e os tokens visuais já existentes; nenhum SVG, PNG, logo ou outro asset gráfico é adicionado;
- preserva os mesmos valores de busca (`todos`, `artista`, `titulo`, `categoria`, `tags`) e a precedência dos prefixos textuais introduzida na V48.1.0;
- simplifica os cards da grade: a preview exibe somente título e artista, removendo categoria e data da sobreposição;
- move categoria, data e tags para o dialog da obra, junto ao crédito já existente, mantendo a imagem full carregada apenas sob demanda;
- reforça `validate-content.py` para proteger o drop-down customizado, o cache-buster V48.1.1 e a separação entre metadados da preview e detalhes do dialog;
- sincroniza README, AGENTS, DESIGN-SYSTEM e documentação de arquitetura/produção/validação com o comportamento atual;
- não modifica `data/content/artes.json`, `data/blog/*`, schemas editoriais, Worker/KV, endpoints ou contratos dos Helpers.

## V48.0.2 — Hardening de segurança (sem mudança funcional esperada)

- adiciona `Content-Security-Policy` via `<meta http-equiv>` às páginas HTML públicas atuais, restringindo fontes de script/estilo/conexão, bloqueando objetos e frames carregados pela página e preservando apenas os hosts já usados pelo frontend; `frame-ancestors` não é declarado porque exige cabeçalho HTTP, e `upgrade-insecure-requests` é deliberadamente omitido para preservar desenvolvimento/testes locais via HTTP sem reduzir a segurança do deploy HTTPS atual;
- `workers.js`: `isAdminAuthorized` passa a usar `crypto.subtle.timingSafeEqual`, disponível no runtime Cloudflare Workers, sem retorno antecipado apenas por diferença de comprimento; rotas, payloads e forma de fornecer o token permanecem inalterados;
- extrai `escapeHtml` para `js/core/sanitize.js` (`window.KamyliSanitize.escapeHtml`) e mantém consumidores com falha explícita caso a dependência não tenha sido carregada;
- amplia `.github/scripts/validate-content.py` para exigir CSP nas páginas HTML versionadas, impedir `frame-ancestors` e `upgrade-insecure-requests` em meta CSP, garantir `sanitize.js` antes de `footer.js`, impedir o retorno de implementações duplicadas de `escapeHtml` e verificar o hardening timing-safe do Worker;
- não modifica `data/content/artes.json`, o contrato `preview`/`imagem`, conteúdo editorial, endpoints, payloads, OAuth, KV, CORS ou frequências de sincronização;
- o patch V48.0.2 é independente e não adiciona/remove patches históricos ou outros artefatos de processo do repositório.

## V48.0.1 — Preview otimizada da Galeria

- evolui `data/content/artes.json` para `version: 2`, separando `preview` (imagem leve usada na grade) de `imagem` (arquivo em alta qualidade usado no lightbox);
- a grade passa a baixar somente `preview`, com `loading="lazy"` e o mesmo loader visual do site; a imagem em alta qualidade só é solicitada quando a obra é aberta;
- o lightbox abre imediatamente com a preview já disponível e exibe o loader Kamyli enquanto a versão full é carregada, fazendo a troca ao concluir;
- mantém fallback de runtime para entradas V48.0 sem `preview`, evitando quebra visual durante uma migração, embora o validador V48.0.1 exija os dois campos;
- atualiza contrato editorial, documentação e validação sem alterar outras páginas, navbar, footer ou `workers.js`.
- inclui `.github/scripts/migrate-artes-v2.py` para migrar instalações V48.0 sem sobrescrever obras já cadastradas; o patch incremental não modifica diretamente `data/content/artes.json`.

## V48.0 — Galeria de Artes

- adiciona a nova página pública `/artes/`, integrada ao design system atual, com Navbar e Footer compartilhados e sem duplicação manual de componentes;
- adiciona `data/content/artes.json` como fonte editorial da galeria, com metadados da página e lista de obras contendo ID, título, artista, crédito opcional, URL HTTPS da imagem, texto alternativo, data, categoria, tags e dimensões opcionais;
- organiza imagens de proporções variadas em grade fluida estilo masonry, preservando a proporção original e exibindo informações sobrepostas na base com gradiente/sombra para contraste;
- reutiliza o mesmo símbolo visual do loader global (`.site-loader-logo`) durante o carregamento individual das imagens, com tratamento de erro e `loading=lazy`;
- adiciona filtros por categoria, busca textual e visualização ampliada em dialog nativo, mantendo créditos externos sujeitos ao aviso global de links externos;
- adiciona `Artes` à Navbar compartilhada e ao conteúdo editorial de `navbar.json`, sem alterar o conteúdo das demais páginas;
- adiciona SEO/canonical/Open Graph/JSON-LD próprios para `/artes/` e inclui a rota no `sitemap.xml`;
- amplia `validate-content.py` para validar o contrato de `artes.json`, URLs HTTPS, IDs únicos, datas, tags, dimensões e arquivos obrigatórios da nova página;
- a galeria permanece 100% estática no frontend: imagens externas não usam Worker, KV, Twitch ou Streamlabs.
- sincroniza `README.md`, `AGENTS.md`, `DESIGN-SYSTEM.md`, `docs/ARQUITETURA.md`, `docs/PRODUCAO.md`, `docs/VALIDACAO.md` e `data/content/README.md` com a arquitetura e o contrato editorial da Galeria V48.0.

## V47.4.8 — Correções estruturais e cobertura de validação

- corrige os caminhos locais de assets em `/privacidade/` e `/uso-de-ia/`, que agora resolvem `../assets`, `../css` e `../js` corretamente a partir das páginas aninhadas;
- amplia `validate-content.py` para validar referências locais de toda página HTML versionada, incluindo páginas institucionais e futuros artigos estáticos, e passa a exigir as rotas institucionais como arquivos públicos;
- inclui `/privacidade/` e `/uso-de-ia/` no conjunto obrigatório do `sitemap.xml`;
- amplia os gatilhos do GitHub Actions para qualquer HTML, Markdown editorial do Blog e `workers.js`;
- adiciona `node --check workers.js` à CI, cobrindo explicitamente a sintaxe do backend além dos scripts em `js/**`;
- sincroniza `AGENTS.md`, `README.md` e documentação operacional com a arquitetura vigente de Blog em `data/blog/*`;
- documenta a tolerância intencional de até 2 minutos do Twitch Live, mantendo o código V47.4.7 como fonte de verdade e sem regredir o código para o valor documental anterior;
- não altera endpoints, payloads, OAuth, KV, cache, frequências de sincronização, frontend funcional ou Helpers.

## V47.4.7 — Otimização de quota sem alteração funcional

- mantém as frequências operacionais existentes: Streamlabs e status ao vivo da Twitch continuam na janela de aproximadamente 10 minutos, a validação do App Access Token da Twitch permanece em intervalos menores que 1 hora (50 min) e os VODs continuam com atualização mínima de 24 horas;
- torna o roteamento do Worker explícito: somente `/` atende o ranking e caminhos desconhecidos passam a responder `404` antes de qualquer leitura do KV, impedindo scanners/bots de consumirem duas leituras de ranking por URL inválida;
- restringe o Worker a `GET` e `OPTIONS` nas rotas HTTP existentes; outros métodos respondem `405` sem acessar integrações ou KV;
- adiciona `caches.default` ao ranking e a `/twitch/videos`, com cache keys canônicas sem query string, preservando os payloads públicos e reduzindo leituras repetidas do KV por data center; `/twitch/live` mantém o cache de 60 s já existente;
- preserva os mesmos cabeçalhos/contratos públicos do ranking, Twitch Live e Twitch VOD para o frontend;
- deduplica a gravação de mensagens de erro recorrentes no KV, trocando writes repetidos por uma leitura de comparação quando a mensagem não mudou;
- consolida o estado OAuth da Streamlabs em `tokens:streamlabs_state`, reduzindo três leituras recorrentes para uma; a primeira leitura após o deploy aceita e migra automaticamente `tokens:access`, `tokens:refresh` e `tokens:expires_at`;
- consolida token, expiração e última validação da Twitch em `twitch:app_access_token_state`, mantendo validação oficial a cada 50 min e retry único após Helix `401`; as chaves V47.4.6 continuam aceitas para migração automática;
- consolida login/ID do canal em `twitch:user_state`; as chaves V47.4.6 continuam aceitas até o TTL original terminar, sem renová-lo artificialmente, preservando o limite de 24 h para resolução do canal;
- mantém KV como snapshot persistente, não move Twitch/Streamlabs para polling por visitante e não altera o Helpers;
- deixa preparada uma arquitetura mais resistente a tráfego elevado sem adicionar R2 ou nova dependência nesta versão.

## V47.4.6 — Robustez do status ao vivo da Twitch

- corrige a janela de atualização do status ao vivo: o Cron continua em 10 minutos, mas `syncTwitchLiveIfDue()` passa a aceitar uma tolerância de até 2 minutos para compensar a latência entre o disparo agendado e a gravação de `checkedAt`, evitando que um ciclo seja pulado e a consulta real caia para aproximadamente 20 minutos;
- centraliza chamadas Helix em um helper com retry único: se `/users`, `/videos` ou `/streams` responder `401`, o Worker invalida o App Access Token, obtém e valida um token novo e repete a mesma chamada uma única vez; um segundo `401` limpa novamente o token e a operação falha normalmente;
- mantém inalterados os TTLs, o cache público, o Hero, o frontend e a frequência recomendada do Cron (`*/10 * * * *`);
- não adiciona variáveis de ambiente nem exige nova autorização da Streamlabs.

**Cloudflare:** manter somente o Cron de 10 minutos (`*/10 * * * *`). O trigger legado de 30 minutos é redundante e deve permanecer removido.

## V47.4.5 — Conformidade das APIs Twitch e Streamlabs

- adiciona `state` assinado por HMAC ao OAuth da Streamlabs e valida o valor no callback, reduzindo risco de CSRF sem criar estado temporário no KV;
- o `state` usa `OAUTH_SETUP_TOKEN` apenas como chave de assinatura, expira em 10 minutos e não expõe o segredo na URL;
- adiciona validação periódica do App Access Token da Twitch em `https://id.twitch.tv/oauth2/validate`; tokens novos são validados imediatamente e tokens reutilizados são revalidados em janelas de 50 minutos, mantendo margem para a exigência horária da Twitch;
- registra `twitch:app_access_token_validated_at` no KV e expõe o estado da validação em `/debug/status`; respostas `401` do Helix também invalidam imediatamente o token local para impedir reutilização;
- `twitch:user_id` e `twitch:user_login` passam a expirar automaticamente após 24 horas e são resolvidos novamente por `helix/users` quando necessário;
- CORS deixa de usar `*` como fallback implícito: sem `ALLOWED_ORIGINS`/`ALLOWED_ORIGIN`, o Worker permite por padrão apenas `https://kamylisumire.com` e `https://www.kamylisumire.com`; wildcard continua possível apenas quando configurado explicitamente;
- a Política de Privacidade esclarece que miniaturas da Twitch podem ser carregadas diretamente da infraestrutura da plataforma pelo navegador;
- atualiza documentação e validação automatizada para os novos invariantes de OAuth, retenção e CORS.

**Compatibilidade:** tokens Streamlabs já existentes continuam válidos e não exigem nova autorização apenas por causa deste patch. Na próxima autorização manual, o fluxo deve ser iniciado novamente por `/oauth/authorize` para que o callback receba o novo `state`. As variáveis existentes do Cloudflare permanecem compatíveis.

## V47.4.4 — Âncoras estáveis após carregamento assíncrono

- corrige a abertura direta de URLs com hash, como `/#creditos`, `/#regras`, `/#agenda` e `/#lives`, quando seções anteriores mudam de altura durante o carregamento assíncrono;
- a navegação inicial aguarda `kamyli:site-revealed` antes de calcular a posição final da seção, com fallback temporizado caso o evento não seja emitido;
- após o scroll, `navbar.js` estabiliza temporariamente a âncora com `ResizeObserver` e verificações leves, recalculando o offset quando Hero, Lives, imagens ou outros conteúdos alteram o layout;
- a estabilização é cancelada imediatamente se o usuário usar roda do mouse, toque, ponteiro ou teclas de rolagem, evitando disputar o controle da página;
- adiciona tratamento de `hashchange` para mudanças de âncora realizadas depois que a Home já está carregada;
- durante a estabilização, o scrollspy mantém o destino selecionado para não alternar a navbar enquanto o layout ainda está se acomodando;
- atualiza o cache-buster de `js/core/navbar.js` para `?v=47.4.4` em todas as páginas públicas que carregam a navbar.

## V47.4.3 — Status ao vivo da Twitch e Hero dinâmico

- adiciona `GET /twitch/live`, que lê somente um snapshot no KV e nunca consulta a Twitch durante a visita do usuário;
- adiciona `/debug/twitch-live-sync`, protegido por `OAUTH_SETUP_TOKEN`, com `?force=1` opcional para diagnóstico manual;
- consulta `helix/streams` no máximo uma vez a cada 10 minutos e reutiliza o mesmo App Access Token e `user_id` já usados pela integração de VODs;
- grava o status ao vivo em um único snapshot `twitch:live` com TTL de 30 minutos e considera o dado indisponível após 20 minutos sem atualização válida;
- usa `caches.default` por 60 segundos em `/twitch/live`, reduzindo leituras repetidas do KV no mesmo data center sem transformar visitas em chamadas à Twitch;
- otimiza `syncDonations()`: snapshots idênticos deixam de ser regravados, e o marcador legado `ranking:updated_at` deixa de gerar writes sem consumidor; isso preserva a cota de KV Free com Cron a cada 10 minutos;
- corrige a virada mensal do ranking para persistir `totals:monthly` vazio mesmo quando o novo mês começa sem doações;
- quando o canal está ao vivo, o Hero exibe as abas acessíveis `Sobre | Ao vivo`, abre `Ao vivo` por padrão e mostra thumbnail, título, categoria e espectadores;
- quando o canal está offline ou o status está indisponível, o Hero permanece exatamente no modo `Sobre` atual e as abas ficam ocultas;
- adiciona um anel visual de status ao vivo ao redor do avatar com o selo `AO VIVO` acoplado à borda, respeitando `prefers-reduced-motion`;
- as thumbnails da Twitch recebem uma revisão baseada em `updatedAt`/`checkedAt`, evitando reutilização de imagem antiga após uma nova sincronização sem aumentar consultas à API Helix;
- atualiza `home.css`, `lives.js` e o novo `twitch-live.js` para cache-buster `?v=47.4.3`.

**Cloudflare:** configurar o Cron Trigger como `*/10 * * * *` para que o status possa ser atualizado a cada 10 minutos. A trava interna impede consulta mais frequente ao endpoint `helix/streams`. As variáveis `TWITCH_*` e o binding `RANKINGS` permanecem os mesmos da V47.4.

## V47.4.2 — Políticas institucionais simplificadas

- simplifica `/privacidade/` para concentrar a página nas informações tratadas, finalidades, integrações, armazenamento, controle e segurança do visitante;
- simplifica `/uso-de-ia/` preservando a proibição expressa de uso dos conteúdos e assets próprios para treinamento, fine-tuning, desenvolvimento ou aprimoramento de IA;
- mantém a distinção entre assets próprios, conteúdos de terceiros e código sujeito a licença própria;
- corrige a cor do botão primário `Voltar ao início`: a regra editorial de links passa a ignorar elementos `.button`, permitindo que `button-primary` mantenha texto branco sobre o fundo da marca;
- atualiza o cache-buster de `css/pages/privacidade.css` para `?v=47.4.2` nas duas páginas.

## V47.4.1 — Conformidade, Privacidade e Uso de IA

**Twitch e conformidade:** o snapshot público de VODs passa a expirar automaticamente no KV após 24 horas (`expirationTtl: 86400`). A rota `/twitch/videos` não serve conteúdo vencido; se não houver snapshot válido, responde `503` com `Cache-Control: no-store`, preservando a aba YouTube como alternativa independente.

**Política de Privacidade:** adicionada a rota pública `/privacidade/`, acessível pelo footer global. O documento é centrado nas informações relacionadas ao usuário e explica quais dados podem ser tratados, finalidades, armazenamento no navegador, doações/ranking via Streamlabs, infraestrutura Cloudflare, Lives/Twitch/YouTube, serviços externos, retenção, segurança, escolhas e solicitações.

**Uso de IA:** adicionada a rota pública `/uso-de-ia/`, também acessível pelo footer, com proibição expressa do uso de conteúdos e assets próprios do site para treinamento, fine-tuning, desenvolvimento, avaliação ou aprimoramento de modelos de inteligência artificial, aprendizado de máquina e sistemas generativos. A política distingue assets próprios de conteúdos de terceiros e de código sujeito a licença própria, sem oferecer exceção de autorização para treinamento de IA.

**Sinalização técnica e SEO:** `robots.txt` passa a incluir diretivas complementares para crawlers de IA conhecidos, sem tratar o protocolo como barreira técnica absoluta. `sitemap.xml` inclui `/privacidade/` e `/uso-de-ia/`.

**Footer:** o conteúdo global passa a incluir `Política de Privacidade` e `Uso de IA`. `footer.js` também corrige a leitura de `creditos.codigoFonte` e recebe cache-buster `?v=47.4.1` nas páginas públicas.

## V47.4 — Twitch automática em Lives com cache de 24 horas

- mantém o design atual de Lives e adiciona o seletor acessível `Twitch | YouTube`;
- torna **Twitch** a aba primária ao abrir a Home;
- preserva a aba YouTube como lista editorial/local, sem YouTube Data API;
- adiciona `GET /twitch/videos` ao Worker para servir somente o snapshot salvo no KV;
- adiciona `/debug/twitch-sync`, protegido pelo mesmo `OAUTH_SETUP_TOKEN`, para inicializar/testar a integração;
- a consulta pública nunca chama `api.twitch.tv`; somente a sincronização agendada/admin pode atualizar o snapshot;
- `syncTwitchVideosIfDue()` impõe intervalo mínimo de 24 horas entre atualizações bem-sucedidas;
- reutiliza App Access Token da Twitch e `user_id` do canal no KV para reduzir chamadas auxiliares;
- consulta `helix/videos` com `type=archive`, `sort=time` e limite configurável de 1 a 20 itens;
- mantém o último snapshot válido em caso de falha da Twitch;
- a resposta pública usa cache HTTP até a próxima janela de atualização para reduzir novas invocações no mesmo navegador;
- adiciona diagnóstico Twitch em `/debug/status`;
- atualiza `lives.js` e `lives.css` para `?v=47.4`;
- atualiza documentação e validador para a nova exceção controlada: a Home usa `api.js` apenas na aba Twitch.

**Cloudflare:** configurar `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`,
`TWITCH_CHANNEL_LOGIN=kamyli` e, opcionalmente, `TWITCH_MAX_VIDEOS=10` antes
do deploy do Worker. O binding KV continua sendo `RANKINGS`.

## V47.3 — Auditoria consolidada: conteúdo global, Worker, CORS e privacidade do ranking

Consolida as duas auditorias preparadas após a V47.2 em uma única atualização,
sem alterar a arquitetura do site ou o contrato público do ranking.

- `data/content/interface.json` e o fallback de `js/core/content.js` ganham
  `configuracoes.fecharAriaLabel`, completando o hook editorial usado em
  `applyFooter()`;
- `js/core/content.js` passa a clonar `defaults` antes do `merge`, evitando
  mutação do objeto de fallback em tempo de execução;
- remove `README-45.2.3.txt`, guia de hotfix obsoleto cujo histórico permanece
  no Git e neste changelog;
- `/oauth/authorize`, `/debug/status` e `/debug/sync` passam a aceitar
  `Authorization: Bearer <token>` como autenticação administrativa preferida,
  mantendo `?key=` como fallback compatível para navegação direta no OAuth;
- uniformiza CORS nas rotas públicas, administrativas e callback OAuth e inclui
  `Authorization` em `Access-Control-Allow-Headers`, permitindo que clientes
  cross-origin usem Bearer após o preflight;
- corrige a detecção de segundos/milissegundos em `created_at`, com guarda para
  datas inválidas;
- move a anonimização do ranking do frontend para a fronteira pública do Worker,
  via `RANKING_PRIVATE_NAMES` e, opcionalmente, `RANKING_PRIVACY_LABEL`; o KV
  preserva os nomes originais e `handleRanking()` sanitiza todo snapshot antes de
  responder, inclusive dados gravados por versões anteriores; a comparação é sem
  diferenciação de maiúsculas/minúsculas e ignora espaços nas extremidades;
- invalida o cache local legado do ranking ao trocar `kamyli-ranking-cache-v2` por
  `kamyli-ranking-cache-v3`, impedindo que nomes crus armazenados antes da migração
  sejam reutilizados pelo frontend novo;
- `created_at` presente porém inválido deixa de ser tratado silenciosamente como
  a data atual; a doação continua entrando no total global, mas não é atribuída ao
  mês corrente sem uma data válida;
- remove o `console.info` de sucesso em `js/core/api.js`;
- documenta no `AGENTS.md` a autenticação administrativa, as variáveis de
  privacidade e a convenção de cache-busting;
- atualiza para `?v=47.3` os scripts modificados por esta atualização:
  `js/core/content.js`, `js/core/api.js` e `js/pages/doacoes/ranking.js`.
  `js/core/button-icons.js?v=47.2` permanece em V47.2 porque não foi alterado.

**Ação manual necessária no Cloudflare antes de publicar o frontend:** definir
`RANKING_PRIVATE_NAMES` com os nomes privados separados por vírgula e, se
desejado, `RANKING_PRIVACY_LABEL`. `ALLOWED_ORIGINS`, `REDIRECT_URI`, bindings
KV e credenciais existentes permanecem compatíveis.

## V46 — Blog estático condicional

- adiciona `/blog/` com listagem textual simples, busca e filtros por tag;
- mantém Navbar e Footer compartilhados sem redesenho;
- o link `Blog` na Navbar é inserido apenas quando existe post publicado;
- a Home ganha uma seção de últimas publicações, também oculta quando não há posts;
- a arquitetura do Blog atualmente consolidada usa `data/blog/config.json`, `data/blog/posts.json` e `data/blog/posts/<slug>.md` para configuração, metadados e conteúdo-fonte (a implementação histórica foi posteriormente migrada para esse contrato);
- posts continuam sendo páginas HTML estáticas em `blog/<slug>/index.html`;
- não adiciona API, Worker, imagens de capa, framework ou etapa de build;
- adiciona validação de schema, slug e existência da página de cada post publicado.

Histórico resumido do projeto. O histórico detalhado de patches anteriores
permanece disponível nos commits/tags do Git.

## V45.2.3 — hotfix de timing do loader

- `PAGE_REVEAL_DELAY_MS` agora é uma pausa real medida depois de
  `loader.remove()`;
- adiciona `PAGE_REVEAL_OVERLAP_MS` para controlar entrada antes do fim do
  loader sem usar delay negativo;
- expõe versão/delay/overlap como atributos `data-*` no `<html>` para
  diagnóstico no DevTools;
- adiciona `?v=45.2.3` ao `loader.js` na Home, Doações e 404 para impedir que
  cache antigo masque mudanças;
- mantém loader translúcido com blur e o reveal atual.

## V45.2.2 — delay entre loader e página

- impede que Navbar, conteúdo e Footer fiquem visíveis por trás do loader
  translúcido;
- adiciona 150 ms entre a remoção do loader e o início do reveal da página;
- sequência: loader fade-out (320 ms) → 150 ms → página fade-in;
- mantém loader com blur e esquema claro/escuro;
- mantém preload/decode do fundo;
- deixa de exigir warm-up dos `.glass-panel`, pois a pequena diferença de
  composição do blur foi aceita como limitação conhecida;
- atualiza a CI para validar o novo contrato visual.

## V45.2.1 — blur visual do loader restaurado

- restaura o loader translúcido com `var(--card-bg)` e
  `blur(var(--blur-card))`;
- mantém o esquema de cores claro/escuro pelos mesmos tokens globais;
- com blur desligado, o loader também desliga o `backdrop-filter`;
- preserva a página renderizável atrás do loader e as demais mudanças da
  V45.2;
- registra como limitação conhecida e aceita um pequeno intervalo de
  composição do blur após o reveal em alguns navegadores/dispositivos;
- a CI deixa de tratar `backdrop-filter` no loader como erro estrutural.

## V45.2 — correção estrutural do blur pós-loader

- mantém navbar/main/footer renderizáveis atrás de um loader opaco;
- remove `opacity: 0` do ancestral que contém os `.glass-panel`;
- remove o `backdrop-filter` fullscreen do loader;
- preserva a entrada usando transformação, sem fade `0 → 1` dos contêineres;
- antecipa condicionalmente o fundo AVIF correto no `<head>` quando blur e performance permitem;
- aguarda transferência/decodificação do fundo por tempo limitado antes do reveal;
- aquece `.glass-panel`, `.site-nav` e `.site-footer` enquanto já estão paintable;
- adiciona guardas de CI contra a regressão estrutural.

## V45.1 — correção do blur pós-loader

- corrige o priming da V45 para atingir as superfícies que realmente usam
  `backdrop-filter`, especialmente `.glass-panel`;
- mantém `will-change` ativo durante todo o reveal em vez de removê-lo após
  apenas duas frames;
- usa três frames de preparação e resolve os estilos de `backdrop-filter`
  antes da saída do loader;
- mantém `main`, Navbar e Footer praticamente invisíveis atrás do loader
  durante a preparação, evitando flash visual;
- remove as dicas de composição depois da animação para não manter custo de
  GPU permanentemente;
- continua ignorando o priming quando blur está desligado, o perfil é
  reduzido ou `prefers-reduced-motion` está ativo;
- não altera conteúdo, Helper, API, Doações, Lives, Agenda, Navbar ou Footer.

## V45 — sistema editorial global e blur priming

- adiciona JSONs editoriais para Navbar, Interface global, 404 e SEO;
- amplia o Helper para praticamente todo texto humano do site;
- mantém Open Graph/Twitter estático no HTML via exportador do Helper;
- loader aguarda a UI global antes do reveal;
- prepara backdrop-filter antes da animação para reduzir o atraso do blur;
- consolida api.kamylisumire.com como API primária com fallback workers.dev.

## V44.4 — domínio próprio da API

- ativa `https://api.kamylisumire.com` como endpoint primário do ranking;
- mantém `workers.dev` como fallback temporário;
- preserva a Home totalmente estática e independente do Worker;
- documenta Custom Domain, CORS, `REDIRECT_URI` e reautorização Streamlabs;
- não altera `workers.js`, KV, Lives, Agenda ou conteúdo editorial.

## V44.3 — textos multilinha em Doações

- `subtitulo`, `livepix.descricao`, `pixie.descricao` e `aviso.texto`
  passam a respeitar `\n` visualmente;
- mantém `textContent`, sem permitir HTML editorial;
- usa `white-space: pre-line` somente nos elementos que aceitam multilinha;
- helper privado V44.3 usa o mesmo contrato: Enter → `\n` → quebra no site.

## V44.2 — fechamento do saneamento

- remove os artefatos temporários usados para aplicar V44 e V44.1;
- remove o documento residual `V43-7-3-HOTFIX.txt`;
- remove o manifesto temporário `V44-MANIFEST.json`;
- reforça `FORBIDDEN_PATHS` para impedir o retorno desses resíduos;
- os próprios arquivos de aplicação V44.2 também são proibidos após o uso;
- não altera HTML, CSS, JavaScript funcional, JSON editorial, Worker/API,
  ranking, Agenda, Lives ou assets.

## V44 — saneamento e consolidação

- remove documentação de versões/hotfixes já superados;
- remove scripts temporários de migração e cache Python versionado;
- remove duplicatas locais de assets gráficos migrados para Cloudflare;
- consolida documentação normativa em arquivos sem conflito histórico;
- substitui o validador V43.7.2 por validação neutra de versão;
- adiciona `.gitignore` para resíduos gerados;
- consolida a V43.7.3 em `home-interactions.js/css`;
- retira o bootstrap de Home de `js/core/config.js`;
- mantém coração nos CTAs e click + arrasta nos carrosséis;
- remove chaves legadas de playlist/player de `lives.json` sem alterar
  editorialmente os vídeos.

## V43.7.3 — CTAs e carrosséis

- mesmo coração da navbar nos CTAs de apoio da Home;
- CTA “Gostou das lives?” renomeado para “Apoiar”;
- click + arrasta em Lives e Agenda.

## V43.7.2 — helpers privados

- helpers públicos removidos;
- edição auxiliar transferida para ambiente privado.

## V43.7 — assets/preview

- assets gráficos migrados para domínio Cloudflare;
- preview Cloudflare Pages mantido fora de indexação.

## V43.6.1 — Lives manuais

- removido player/iframe/API do YouTube;
- Lives passam a ser cadastradas manualmente;
- cards usam thumbnail oficial e link direto.

## V42 e anteriores — base atual

Marcos consolidados:

- loader e preferências;
- performance/blur adaptativos;
- transições acessíveis;
- SEO, preview social e canonical;
- confirmação global de links externos;
- agenda em JSON;
- separação Home/Doações;
- ranking via Worker/Streamlabs.
