# Changelog

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
