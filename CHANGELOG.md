# Changelog

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
- `data/content/blog.json` passa a controlar metadados/listagem;
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
