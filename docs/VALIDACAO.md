## V48.3.32 — paginação editorial de Jogos

Smoke test recomendado:

1. abrir `/jogos/` com `jogosPorPagina: 15` e confirmar no filtro **Todos** que no máximo 15 cards aparecem por página;
2. em uma cópia de teste, mudar `data/content/jogos-config.json` para `jogosPorPagina: 3`, recarregar a página e confirmar que a paginação muda sem alterar `jogos.js` nem executar o sync;
3. bloquear temporariamente `jogos-config.json` e confirmar fallback de 15 jogos por página sem impedir o carregamento do catálogo;
4. testar busca e troca de categoria e confirmar que ambas resetam para a página 1 usando o mesmo tamanho editorial;
5. definir propositalmente `jogosPorPagina: 0` ou um valor não inteiro numa cópia de teste e confirmar rejeição por `validate-content.py`;
6. executar `python .github/scripts/validate-content.py`, checks JS/MJS/Worker e `git diff --check`.

## V48.3.31 — manutenção de consistência

Smoke test recomendado:

1. bloquear temporariamente `data/content/navbar.json` e confirmar que a Navbar fallback mantém a mesma ordem editorial e que **Jogos** continua apontando para `/jogos/`; repetir para `data/blog/config.json` e confirmar `Buscar publicações...`;
2. na Agenda, testar uma live curta, uma única live com descrição longa e duas lives no mesmo dia; somente os conteúdos que realmente excederem 210 px devem receber foco/scroll vertical por teclado; redimensionar a janela e confirmar recálculo;
3. disparar manualmente os workflows de Jogos e Agenda próximos um do outro e confirmar serialização pelo grupo `editorial-sync-*`, rebase sem force push e publicação sem conflito;
4. confirmar que a CI executa `node --check` para `sync-jogos.mjs` e `sync-agenda.mjs`;
5. com uma arte HTTPS externa em cópia de teste, confirmar `Referrer-Policy: no-referrer` nas requisições de preview e imagem completa;
6. confirmar que `sitemap.xml` não possui `lastmod`, contém somente URLs esperadas e que Jogos/Privacidade/Uso de IA mantêm canonical + `index, follow`;
7. executar `python .github/scripts/validate-content.py`, os checks de sintaxe JS/MJS/Worker e `git diff --check`.

## V48.3.11 — Contenção de nomes longos no ranking

Smoke test recomendado:

1. abrir `/doacoes/` e simular um identificador curto, um com espaços e outro sem espaços com pelo menos 150 caracteres;
2. confirmar que o card e a página mantêm a mesma largura e não criam scroll horizontal;
3. confirmar que o identificador longo termina visualmente em `...`, enquanto posição e valor permanecem totalmente visíveis;
4. repetir em desktop, 920 px, 760 px e viewport móvel estreito;
5. confirmar que o texto completo continua no DOM para acessibilidade e que apenas a apresentação visual é truncada;
6. executar `python .github/scripts/validate-content.py` e os checks de sintaxe JS/Worker.

## V48.3.10 — Blur da borda externa dos painéis de busca

Smoke test recomendado:

1. abrir `/artes/` e `/blog/` com **Blur ligado** e confirmar que o fundo atrás de toda a moldura externa — inclusive os 2 px da borda — fica desfocado de forma contínua, sem faixa nítida no contorno;
2. repetir nos quatro cantos arredondados e nas laterais em tema claro/escuro, desktop/mobile;
3. confirmar que o fundo translúcido e a borda continuam geometricamente coincidentes, sem o recuo visual corrigido na V48.3.9;
4. abrir **Buscar em**, rolar/redimensionar com o menu aberto e confirmar que portal, blur próprio do menu e navegação por teclado continuam inalterados;
5. com **Blur desligado**, confirmar ausência de `backdrop-filter` no painel/campo/menu e leitura normal da superfície;
6. executar `python .github/scripts/validate-content.py` e os checks de sintaxe JS/Worker.

## V48.3.9 — Geometria da moldura de busca

Smoke test recomendado:

1. abrir `/artes/` e `/blog/` em tema claro e escuro e confirmar que a borda externa do painel de busca acompanha exatamente o fundo translúcido, sem faixa/recuo adicional de 2 px;
2. repetir com **Blur ligado** e **Blur desligado**;
3. abrir o seletor **Buscar em** e confirmar que o portal, o blur do menu e o posicionamento continuam inalterados;
4. repetir em viewport móvel e desktop;
5. executar `python .github/scripts/validate-content.py` e confirmar zero erros/avisos.

## V48.3.8 — Privacidade, ranking e LGPD

Antes de publicar:

1. abrir `/privacidade/` e confirmar que **Kamyli Souza** e `contato@kamylisumire.com` aparecem como identificação/canal público, sem exposição do endereço Gmail de destino ou de dados civis privados;
2. confirmar que a política chama `donation.name` de **identificador de exibição autodeclarado/não autenticado**, explica que textos iguais podem pertencer a pessoas diferentes e não trata o ranking como cadastro de identidades verificadas;
3. abrir `/doacoes/` e confirmar o aviso junto ao ranking sobre identificador não verificado, valor acumulado, exibição como **Anônimo** e contestação de possível personificação;
4. confirmar em `docs/PRIVACIDADE-RANKING.md` que contestação pública não concede acesso aos dados internos e que coincidência de nome/pseudônimo, isoladamente, não autoriza correção ou exclusão de totais;
5. com cache do ranking novo, confirmar que uma segunda visita dentro de 30 minutos pode reutilizá-lo; após simular `savedAt` com mais de 30 minutos, confirmar remoção da chave e nova consulta à API;
6. confirmar que `kamyli-ranking-cache-v3` é removida e que não existe fallback de cache expirado;
7. executar `python .github/scripts/validate-content.py` e os checks de sintaxe JS/Worker;
8. confirmar SEO editorial: Galeria com obras deve estar `index, follow` e no sitemap; Blog sem posts publicados deve permanecer `noindex, follow` e fora do sitemap.

# Validação

## V48.3.7 — CSP, contraste e indexação condicional

Smoke test recomendado:

1. executar `python .github/scripts/validate-content.py` e confirmar zero erros/avisos;
2. com `data/blog/posts.json` sem post `published: true`, confirmar `/blog/` com `noindex, follow` e ausência de `/blog/` no sitemap; ao adicionar um post público em uma cópia de teste, a CI deve exigir `index, follow`, a rota base no sitemap e a URL do post;
3. com `data/content/artes.json` sem itens, confirmar `/artes/` com `noindex, follow` e ausência de `/artes/` no sitemap; ao adicionar uma arte válida em uma cópia de teste, a CI deve exigir `index, follow` e a rota base no sitemap;
4. confirmar que Home, Galeria, Blog e demais títulos grandes mantêm `--primary-color`, enquanto links/tags/labels pequenos alterados usam `--primary-text`; repetir em tema claro e escuro;
5. confirmar no console do navegador ausência de violações CSP nas sete páginas públicas; alterar propositalmente um byte de um script inline em uma cópia de teste e confirmar que a CI acusa hash desatualizado;
6. validar o card Twitch ao vivo com thumbnail HTTPS e confirmar que valores ausentes/não-string não quebram o módulo.

## V48.3.5 — Blur real do drop-down de busca

Smoke test recomendado:

1. com **Blur ligado**, abrir `/artes/` e `/blog/` e abrir **Buscar em**; inspecionar o DOM e confirmar que o listbox aberto foi movido temporariamente para `document.body`;
2. confirmar visualmente que conteúdo/cores atrás do menu ficam desfocados, inclusive quando o menu ultrapassa a área do painel de ferramentas;
3. rolar a página e redimensionar a janela com o menu aberto e confirmar que ele continua ancorado ao seletor;
4. usar mouse e teclado (`ArrowUp`, `ArrowDown`, `Home`, `End`, `Escape`, `Tab`) e confirmar que seleção/foco continuam corretos;
5. fechar o menu e confirmar que o mesmo nó retorna ao wrapper interno, sem duplicata no DOM;
6. alternar **Blur desligado** e confirmar ausência de `backdrop-filter`, com fundo reforçado por `--card-bg`;
7. repetir em tema claro/escuro e em viewport móvel.

A V48.3.4 moveu o blur do painel externo para `::before`; a V48.3.5 não depende apenas dessa composição e tira o listbox aberto da hierarquia do painel para que seu backdrop seja a página real.

## V44.4 — domínio próprio da API

A API pública de produção é:

`https://api.kamylisumire.com`

Durante a estabilização, `workers.dev` permanece como fallback.

Validação manual obrigatória:

1. abrir `https://api.kamylisumire.com/`;
2. confirmar resposta JSON do ranking;
3. confirmar CORS para `https://kamylisumire.com`;
4. confirmar que Streamlabs e Cloudflare usam
   `https://api.kamylisumire.com/oauth/callback`;
5. reautorizar o OAuth no domínio novo;
6. abrir `/doacoes/` e confirmar no console:
   `API atendida por: https://api.kamylisumire.com`;
7. confirmar ranking e fallback/cache.

## CI automática

Execute:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
node --check workers.js
git diff --check
```

O validador estrutural anterior pode emitir um aviso ao detectar
`useCustomDomain: true`. Esse aviso é esperado nesta migração e não é erro.

## Limites da validação estática

A CI não prova disponibilidade do Cloudflare Worker, Streamlabs ou KV.
A migração do domínio exige smoke test real em navegador.

A Home deve continuar funcionando mesmo que todos os endpoints do ranking
estejam indisponíveis.

## V45.2 — blur pós-loader

Contrato:

1. `body > main` não fica `opacity: 0` durante o loader;
2. `.site-loader` não usa `backdrop-filter` fullscreen;
3. o loader opaco cobre conteúdo que continua paintable atrás dele;
4. o fundo AVIF apropriado é preloaded somente com blur ligado/performance normal;
5. `loader.js` tenta decodificar esse fundo antes do reveal, com timeout;
6. `.glass-panel`, `.site-nav` e `.site-footer` são aquecidos antes do reveal;
7. blur off/Save-Data/performance reduzida não antecipam o fundo.

A CI contém guardas para os principais itens acima.


## V45.2.1 — loader com blur

O loader volta a usar a superfície translúcida do site:

- `background-color: var(--card-bg)`;
- `backdrop-filter: blur(var(--blur-card))`;
- tema claro/escuro continua vindo dos tokens globais;
- `data-blur="off"` remove o filtro do loader;
- a página continua renderizável atrás do loader.

Limitação conhecida e aceita: em alguns navegadores/dispositivos pode existir
um curto intervalo até a composição final do blur dos painéis depois do
reveal. A V45.2.1 não tenta eliminar completamente esse comportamento.

## V45.2.2 — loader separado da página

Sequência:

1. loader translúcido permanece visível;
2. Navbar, `main` e Footer permanecem invisíveis;
3. loader faz fade-out por 320 ms;
4. o loader é removido;
5. há um intervalo adicional de 150 ms;
6. só então `site-revealing` inicia a entrada da página.

A página não deve aparecer por trás do loader.

A pequena diferença de composição do blur dos cards após o reveal permanece
como limitação conhecida e aceita.

## V47.4 — Twitch em Lives

Além da validação estática, confirmar em produção:

1. `/debug/status` protegido mostra `twitch.configured: true`;
2. primeira chamada protegida a `/debug/twitch-sync` cria o snapshot;
3. `/twitch/videos` responde sem autenticação e sem expor credenciais;
4. nova chamada a `/debug/twitch-sync` antes de 24 h retorna `cache_fresh`;
5. Twitch é a aba primária da Home;
6. YouTube continua funcionando se `/twitch/videos` falhar;
7. o endpoint público não dispara consultas a `api.twitch.tv`.

A CI valida a presença da trava de 24 horas, das rotas Twitch e dos elementos do
seletor, mas o comportamento temporal real deve ser confirmado pelo smoke test.

## V47.4.3 — status ao vivo e Hero dinâmico

Além da validação V47.4, confirmar em produção:

1. configurar o Cron como `*/10 * * * *`;
2. executar `/debug/twitch-live-sync?force=1` com Bearer e confirmar `status: ok`;
3. offline: `/twitch/live` responde `200` com `live: false` e a Home mantém o Hero padrão;
4. online: `/twitch/live` responde `200` com `live: true`, título, categoria, espectadores e thumbnail;
5. online: o avatar recebe o anel de live e o Hero exibe `Sobre | Ao vivo`, iniciando em `Ao vivo`;
6. a aba `Sobre` restaura o conteúdo normal do Hero sem ocultar avatar/redes;
7. uma segunda sincronização antes de 10 min retorna `cache_fresh` e não chama novamente `helix/streams`;
8. após 20 min sem snapshot válido, `/twitch/live` responde `503` e o Hero volta ao padrão;
9. requisições repetidas a `/twitch/live` no mesmo data center podem ser atendidas por `caches.default`, reduzindo leituras KV;
10. uma sincronização do ranking sem novas doações não deve regravar snapshots idênticos no KV.

O smoke test deve confirmar também que a thumbnail da live/VOD recebe uma nova
revisão quando `checkedAt`/`updatedAt` muda, sem aumentar a quantidade de
consultas aos endpoints Helix.

## V47.4.8 — referências locais e cobertura da CI

O validador percorre toda página HTML versionada e resolve `src`/`href` locais a
partir do diretório real de cada documento. Isso impede regressões como uma
página em `/privacidade/` tentar carregar `privacidade/css/...` por engano.

A CI deve disparar para qualquer `*.html`, `data/**/*.md` e `workers.js`, além
dos arquivos já cobertos. A sintaxe do Worker é verificada separadamente com
`node --check workers.js`.

O status ao vivo da Twitch mantém a janela nominal de 10 minutos com tolerância
intencional de até 2 minutos. Essa tolerância faz parte do comportamento atual e
não deve ser reduzida apenas para coincidir com documentação histórica.

## V48.0/V48.0.1 — Galeria de Artes

A CI valida `artes/index.html`, `css/pages/artes.css`, `js/pages/artes/artes.js` e
`data/content/artes.json`. Na V48.0.1 o documento usa `version: 2`. Cada arte deve usar ID único em kebab-case, URLs HTTPS obrigatórias em `preview` e `imagem`, `alt` não vazio, data ISO `YYYY-MM-DD`, categoria e artista.
`creditoUrl` é opcional, mas quando informado deve usar HTTPS. `largura` e
`altura` são opcionais e precisam ser inteiros positivos.

## V48.1.0 — Busca por campo na Galeria e no Blog

A V48.1.0 adiciona escopo explícito de busca sem alterar os schemas editoriais.
Na Galeria, os campos são Todos, Artista, Título, Categoria e Tags. No Blog,
Todos, Título, Resumo e Tags. Prefixos digitados têm precedência sobre o seletor.

Smoke test manual recomendado:

1. abrir `/artes/` e confirmar Navbar/Footer compartilhados;
2. confirmar que `Artes` aparece ativo na Navbar;
3. confirmar masonry com imagens verticais/horizontais sem corte;
4. confirmar o logo pulsante do loader global enquanto uma imagem carrega;
5. confirmar busca/filtros e abertura do dialog;
6. selecionar `Artista`, pesquisar um nome que também apareça em título/tag e confirmar que somente o campo artista é considerado;
7. testar `artista:nome`, `titulo:texto`, `categoria:fanart` e `tag:comunidade`;
8. confirmar que erro de uma imagem não bloqueia as demais;
9. confirmar que a página funciona com Worker/API indisponíveis.

Para o Blog, confirmar também o mesmo padrão de busca por campo com `Título`,
`Resumo` e `Tags`, além dos prefixos `titulo:`, `resumo:` e `tag:`. A busca deve
ser insensível a maiúsculas/minúsculas e acentos. Alterações nessa UI não devem
exigir campos novos em `data/blog/posts.json` ou no front matter.

## V48.3.3 — Hotfix dos seletores de busca e cabeçalho do Blog

O drop-down **Buscar em** da Galeria e do Blog mantém o rótulo e o controle dentro
do mesmo campo visual, mas o menu absoluto deve ser ancorado a um wrapper interno
que contém somente o valor/chevron. Assim a borda do campo continua única e o menu
abre alinhado ao seletor real em desktop e mobile. O título principal do Blog deve
usar `--primary-color`, como na Galeria.

Smoke test adicional:

1. abrir `/artes/` e `/blog/` (com ao menos um post para exibir as ferramentas) e abrir **Buscar em**;
2. confirmar que o menu começa/termina alinhado ao controle do valor, sem usar a largura do rótulo **Buscar em** como âncora;
3. repetir em 1440 px, 760 px e 390 px, nos temas claro/escuro e com blur ligado/desligado;
4. testar seleção por mouse e teclado (`ArrowUp`/`ArrowDown`, `Home`/`End`, `Escape`, `Enter`/`Space`) e clique externo;
5. confirmar que o menu continua acima da masonry/lista e não é cortado pelo painel externo;
6. confirmar no Blog que eyebrow/título/descrição usam a mesma hierarquia cromática da Galeria, com o `h1` em `--primary-color`;
7. confirmar que nenhum arquivo em `data/content/` ou `data/blog/` foi alterado.

## V48.1.1 — Drop-down da Galeria e metadados da preview

A V48.1.1 é uma alteração exclusivamente de frontend/documentação. O schema e o
conteúdo de `data/content/artes.json` permanecem intactos, portanto não há patch
de compatibilidade para Helpers.

Smoke test adicional:

1. abrir o drop-down **Buscar em** e confirmar aparência coerente em tema claro/escuro e com blur ligado/desligado;
2. navegar pelas opções com `ArrowUp`/`ArrowDown`, `Home`/`End`, fechar com `Escape` e selecionar com teclado;
3. confirmar que clicar fora fecha o menu e que `aria-expanded`/`aria-selected` acompanham o estado visual;
4. confirmar que cada card da grade mostra somente título e artista — sem categoria, data ou tags;
5. abrir uma obra e confirmar categoria, data, tags e crédito no dialog, sem provocar download da imagem full antes da abertura;
6. confirmar que o patch não modifica arquivos sob `data/content/` ou `data/blog/`.

## V48.1.2 — Hotfix de stacking do drop-down

O `backdrop-filter` de `.glass-panel` cria um contexto de empilhamento. Por isso,
`artes-tools` deve manter um `z-index` explícito acima de `artes-grid`; elevar
apenas `artes-search-field-menu` não é suficiente.

Smoke test adicional:

1. abrir **Buscar em** com a primeira linha da masonry já carregada;
2. confirmar que todas as opções do menu ficam visualmente acima das imagens/cards;
3. repetir em viewport desktop e mobile, nos temas claro/escuro e com blur ligado/desligado;
4. confirmar que o painel e a grade não mudaram de posição quando o menu está fechado.


## V48.1.4 — Painel externo da busca do Blog

Além dos controles internos, `.blog-tools` deve usar `glass-panel`, assim como
`.artes-tools`. Filtros de tags, seletor **Buscar em** e campo textual devem ficar
dentro da mesma superfície translúcida, com padding/gap/margem equivalentes ao
painel da Galeria.

Smoke test adicional:

1. abrir `/blog/` com pelo menos um post publicado;
2. confirmar que tags, seletor e campo de busca aparecem dentro de um único painel de fundo;
3. comparar esse painel com `/artes/`, incluindo borda, radius, sombra, blur, padding e espaçamento;
4. repetir em claro/escuro, blur ligado/desligado e viewport mobile;
5. confirmar que o drop-down continua acima da lista de posts;
6. confirmar que nenhum arquivo editorial foi alterado.

## V48.1.3 — Paridade visual da busca do Blog

A busca por campo do Blog deve usar o mesmo padrão visual/interativo da Galeria:
drop-down customizado, foco rosa via tokens do design system, chevron/check em CSS
e navegação por teclado. O `<select>` nativo não faz mais parte do contrato visual.

Smoke test adicional:

1. abrir `/blog/` com ao menos um post publicado e comparar o conjunto **Buscar em + busca textual** com `/artes/`;
2. confirmar mesma altura, radius, bordas, estados de foco/hover e aparência do menu nos temas claro/escuro;
3. testar `ArrowUp`/`ArrowDown`, `Home`/`End`, `Escape`, seleção pelo teclado e fechamento por clique externo;
4. confirmar que o menu fica acima da lista de posts e não é cortado por painéis subsequentes;
5. repetir em viewport mobile e com blur ligado/desligado;
6. confirmar que `titulo:`, `resumo:` e `tag:` continuam tendo precedência sobre o escopo visual;
7. confirmar que nenhum arquivo em `data/blog/` ou `data/content/` foi modificado.

## CSP V48.0.2 e sanitização compartilhada

`validate-content.py` também verifica que toda página HTML versionada contém a CSP mínima da V48.0.2; que `frame-ancestors` e `upgrade-insecure-requests` não são declarados via meta CSP; que qualquer página com `footer.js` carrega `js/core/sanitize.js` antes dele; e que os consumidores conhecidos usam o `escapeHtml` compartilhado em vez de reintroduzir cópias locais. A ausência de `upgrade-insecure-requests` é intencional para manter o site testável via servidor HTTP local; produção continua servida em HTTPS. O validador também confirma a presença do caminho timing-safe usado na autenticação administrativa do Worker.
## V48.2.0 — Navbar editorial e Blog permanente

Confirmar que `data/content/navbar.json` está em `version: 2` e contém os nove itens obrigatórios, cada um com `texto`, `icone` e `url`. Ícones precisam pertencer à allowlist do site e URLs devem ser caminho interno iniciado por `/` ou HTTP(S).

Smoke test:

1. editar texto, ícone e URL de pelo menos um item interno e confirmar a atualização sem alterar HTML;
2. editar **Jogos** para outra URL externa e confirmar nova aba + aviso global de link externo;
3. editar **Apoiar** e confirmar que continua com o estilo primário à direita;
4. manter `data/blog/posts.json` vazio e confirmar que **Blog** continua na Navbar, a seção do Blog permanece visível na Home com mensagem vazia e `/blog/` continua no sitemap;
5. confirmar que links configurados para `/#lives`, `/#agenda`, `/#regras` ou `/#creditos` continuam usando a navegação suave da Home.

### Cards da Home

O mesmo release adiciona `data/content/home-cards.json` `version: 1`. A CI exige os sete tipos nativos exatamente uma vez, IDs únicos, no máximo 24 cards, tamanhos/variantes allowlisted e conteúdo personalizado sem HTML/SVG bruto/CSS arbitrário.

Smoke test recomendado:

1. reordenar Hero, Lives e Agenda e confirmar que a ordem visual/DOM acompanha o array sem quebrar IDs, scrollspy ou integrações;
2. ocultar um card nativo e confirmar que ele deixa de aparecer sem remover seu conteúdo editorial; reexibi-lo em seguida;
3. alternar Regras/Créditos para `grande` e Hero/Agenda para `compacto`, verificando a grade de duas colunas no desktop e uma coluna no mobile;
4. testar `padrao`, `suave` e `destaque` e confirmar que só usam tokens do Design System;
5. adicionar card `personalizado` compacto e grande, com alinhamento esquerdo/central, ícone e CTA interno;
6. testar CTA HTTP(S) externo e confirmar nova aba + proteção `noopener noreferrer`/aviso global;
7. testar card personalizado sem CTA (texto e URL vazios) e confirmar ausência do botão;
8. tentar ID duplicado, tipo nativo ausente/duplicado, ícone inválido, URL `//host`, HTML/SVG bruto e mais de 24 cards; todos devem ser rejeitados pelo validador;
9. manter `data/blog/posts.json` vazio e confirmar que o card Blog continua no estado vazio quando `visivel: true`, podendo ser ocultado apenas pela configuração explícita da Home.


### Navbar reordenável — V48.3.0

`data/content/navbar.json` mantém as nove chaves estáveis em `links` e adiciona `ordem`, uma lista sem duplicatas que determina a sequência visual dos nove itens. O runtime completa uma ordem ausente/incompleta com o padrão para compatibilidade, mas o conteúdo versionado atual deve listar todos os itens exatamente uma vez. **Apoiar** continua com estilo de CTA, porém participa do mesmo fluxo reordenável.

### Hotfix Apoiar fixo — V48.3.1

1. com `apoioFixoNoFim: true`, mover `apoio` para o meio de `ordem` e confirmar que o CTA continua renderizado por último;
2. reordenar os outros oito itens e confirmar que a ordem visual muda sem deslocar o CTA do final;
3. com `apoioFixoNoFim: false`, confirmar que `apoio` passa a ocupar exatamente a posição declarada em `ordem`;
4. remover `apoioFixoNoFim` e confirmar o fallback compatível: **Apoiar** permanece no final;
5. informar valor não booleano e confirmar que `.github/scripts/validate-content.py` rejeita o contrato.

### Hotfix slot histórico de Apoiar — V48.3.2

A validação exige o wrapper/divisor dedicados e o runtime dual-mode. Teste `apoioFixoNoFim` nos dois valores: `true` deve manter Apoiar no slot à direita; `false` deve respeitar exatamente a posição de `apoio` em `ordem`.

### Smoke test de performance/âncoras — V48.3.6

1. abrir `/` e confirmar que o loader não espera a Agenda nem o decode do fundo;
2. abrir diretamente `/#creditos`, `/#agenda` e `/#regras` em nova navegação e confirmar chegada à seção correta após o reveal;
3. durante os primeiros segundos, confirmar que a montagem de Navbar/Footer mantém textos/ícones editoriais;
4. alternar `apoioFixoNoFim` e confirmar que a ordem/slot do CTA continuam corretos;
5. confirmar que botões inseridos pelo Footer e diálogo externo recebem seus ícones/textos;
6. verificar que o console não mostra loop contínuo de mutações/reaplicações.


### Navegação mobile — V48.3.36

1. em viewport de até 767 px, confirmar `Logo / título atual / Apoiar` no topo quando `apoioFixoNoFim` estiver ativo;
2. confirmar `Menu` flutuante à esquerda e `@ Redes` à direita, ambos respeitando safe area e sem scroll horizontal da Navbar;
3. abrir Menu e confirmar todos os links na ordem editorial, item atual destacado, fechamento por seleção, clique externo e Escape;
4. abrir Redes com Menu aberto (e o inverso) e confirmar exclusividade entre os painéis;
5. testar `apoioFixoNoFim: false` e confirmar que Apoiar entra no Menu na posição definida por `ordem`;
6. acima de 767 px, confirmar que a Navbar tradicional e o dock social de desktop permanecem inalterados.

### Hotfix mobile — V48.3.37

No mobile, `Menu` e o painel de navegação são movidos em runtime para `.site-nav-mobile-layer`, fora de `.site-nav`, para que `position: fixed` permaneça relativo à viewport mesmo em Chromium/Brave com `backdrop-filter`. Ao voltar ao desktop, os mesmos nós retornam à Navbar. O título contextual usa `--primary-color`, alinhamento à esquerda e truncamento seguro entre Logo e Apoiar.

### Refinamento mobile — V48.3.38

No viewport <= 767 px, conferir: (1) `Logo | título | Apoiar` com as duas divisórias e título centralizado; (2) troca vertical do título ao alternar seções e entre páginas iniciadas pela Navbar; (3) com movimento reduzido, troca imediata sem animação; (4) Menu e Redes com escala equivalente; (5) lista do Menu rolando sem mover o CTA Apoiar do rodapé; (6) Android/Brave mantendo Menu preso ao canto inferior esquerdo. Acima de 767 px, confirmar que a Navbar tradicional não mudou.

### Hotfix de proporção — V48.3.39

No mobile, conferir que `Menu` e `@ Redes` compartilham largura-base de 188 px e métricas de item, que os rótulos do Menu ficam alinhados à esquerda e que o título contextual também fica alinhado à esquerda entre as divisórias. Confirmar que a animação vertical, o CTA `Apoiar` fixo e o desktop permanecem inalterados.

### Geometria do Menu — V48.3.40

No mobile, conferir painel com largura-base de 220 px e todos os itens comuns ocupando a mesma largura útil do CTA `Apoiar`, separados da borda externa apenas pelo padding de 8 px.

### Geometria real do Menu — V48.3.41

No mobile, confirmar que cada `.site-nav-link` filho direto ocupa toda a largura útil da lista e alinha lateralmente com `Apoiar`. O CSS não deve depender de `.site-nav-item`, pois esse wrapper não existe no DOM.

### Rótulos do Menu — V48.3.42

No mobile, validar que itens sem ícone visível mostram o rótulo completo quando houver espaço e que itens com ícone continuam alinhados à esquerda. O ellipsis só deve aparecer quando a largura realmente for insuficiente.

### Drawer mobile — V48.3.43

Em viewport <= 767 px, validar: drawer deslizando pela esquerda; backdrop cobrindo o restante da página; botão Fechar, Escape e toque fora funcionando; Tab permanecendo dentro do drawer; lista rolando sem mover `Apoiar`; scroll da página bloqueado enquanto aberto; `@ Redes` e Menu mutuamente exclusivos; `prefers-reduced-motion` sem transição.

### Drawer refinado — V48.3.44

Em viewport <= 767 px, validar: drawer iniciando abaixo da Navbar; largura entre 248 e 288 px conforme a viewport; links compactos no topo sem bordas individuais; ícones genéricos aparecendo somente quando não existe ícone editorial; `Apoiar` fixo embaixo; swipe da borda esquerda abrindo e swipe para a esquerda fechando; movimento predominantemente vertical mantendo o scroll da lista. Confirmar também fechamento por backdrop/×/Escape e `prefers-reduced-motion`.

### Fechamento do drawer — V48.3.45

No mobile, validar ausência do cabeçalho `Menu`/`×`; abertura por botão e swipe; fechamento por swipe à esquerda, backdrop, Escape e Voltar do navegador/Android. Após fechar, Voltar novamente deve recuperar seu comportamento normal, sem etapa fantasma do drawer.

### Coordenação Menu/Redes — V48.3.46

No mobile, validar: (1) abrir Redes e tocar Menu troca diretamente para o drawer; (2) abrir Menu e tocar Redes troca diretamente para o popup; (3) Voltar fecha primeiro a camada ativa; (4) `Escape` fecha e devolve foco ao gatilho; (5) toque fora fecha Redes e backdrop fecha Menu; (6) popup de Redes anima sem hover preso no Android/Brave; (7) ao abrir teclado virtual em um input, os dois gatilhos somem e retornam ao fechar o teclado; (8) desktop permanece inalterado.
