# Validação

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
