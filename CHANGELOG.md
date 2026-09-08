# Changelog

Histórico resumido do projeto. O histórico detalhado de patches anteriores
permanece disponível nos commits/tags do Git.

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
