# Regras de manutenção

Este arquivo descreve apenas o estado vigente do projeto. Histórico de
implementações antigas deve ser consultado pelo Git, não reintroduzido como
regra atual.

## Princípios

1. Manter o projeto sem framework, bundler ou etapa de build.
2. Preferir HTML/CSS/JavaScript vanilla e conteúdo editorial em JSON.
3. Alterações devem ser localizadas: não ampliar escopo sem necessidade.
4. Home deve continuar funcional mesmo se Worker/Streamlabs/Twitch estiverem fora; falha da API pode afetar a aba Twitch e o status ao vivo, mas deve manter o Hero padrão e não bloquear a página nem a aba YouTube.
5. Não duplicar navbar/footer manualmente nas páginas.
6. Preservar acessibilidade, responsividade e preferências de performance.

## Páginas

### Home

A Home carrega conteúdo local e inclui os sete cards nativos:

- Hero;
- Lives recentes;
- Agenda;
- Blog;
- Regras;
- Créditos;
- CTA de apoio.

Desde V48.2.0, `data/content/home-cards.json` controla a ordem, visibilidade, tamanho e variante desses cards e pode adicionar cards `personalizado`. Os sete nativos são invariantes estruturais: devem existir exatamente uma vez no JSON, mas podem ser ocultados ou reordenados. O conteúdo nativo permanece em seus arquivos editoriais próprios. Não permitir HTML/SVG bruto, CSS arbitrário, cores livres ou assets no contrato de cards; ampliar o visual apenas por variantes documentadas no Design System.

A Home carrega `js/core/api.js` somente para as integrações públicas da Twitch:
a aba Twitch de Lives e o status ao vivo do Hero. Não deve carregar `ranking.js`;
falha do Worker deve manter o Hero padrão e as demais seções locais funcionando.

### Redes sociais globais

Desde V48.3.33, `data/content/redes.json` é a fonte única das redes sociais. O
frontend compartilhado fica em `js/core/socials.js` + `css/core/socials.css` e deve
ser carregado por todas as páginas públicas. Em desktop/tablet (>= 768 px) usar
dock vertical fixo à esquerda; no mobile usar uma única cápsula expansível
`@ Redes`, sem ícone de compartilhamento. Não recolocar links
sociais hardcoded no Hero/Navbar. URLs editoriais devem ser HTTPS, ícones devem
vir da allowlist segura de `button-icons.js` e HTML/SVG/CSS arbitrário não entra
no JSON. O componente deve permanecer abaixo da Navbar/listboxes em z-index e
respeitar teclado, safe area e `prefers-reduced-motion`. No gatilho mobile, efeitos
de `:hover` devem ficar restritos a `(hover: hover) and (pointer: fine)`; dispositivos
touch não podem depender de hover persistente para representar o estado aberto.

### Blog

`/blog/` é estático e textual. Desde V48.2.0, o Blog é rota pública permanente: permanece na Navbar, no sitemap e como card da Home mesmo quando `data/blog/posts.json` não possui posts publicados. A seção da Home deve exibir seu estado vazio, salvo quando o próprio card `blog` estiver editorialmente oculto por `home-cards.json`.

A configuração editorial fica em `data/blog/config.json`; o índice/metadados em
`data/blog/posts.json`; e o conteúdo-fonte em `data/blog/posts/<slug>.md`. Cada
post publicado deve ter uma página estática correspondente em
`blog/<slug>/index.html`. Não carregar API/Worker no Blog.

### Galeria de Artes

`/artes/` é uma página pública estática/editorial. A estrutura vigente é:

- shell em `artes/index.html`;
- estilos exclusivos em `css/pages/artes.css`;
- runtime em `js/pages/artes/artes.js`;
- conteúdo em `data/content/artes.json`;
- Navbar e Footer continuam compartilhados por `js/core/navbar.js` e `js/core/footer.js`.
- Desde V48.2.0, a Navbar usa `data/content/navbar.json` `version: 2`; preservar as nove chaves estáveis e o trio `texto`/`icone`/`url`. Blog é permanente e Apoiar não depende mais de `buttons.json`.

A galeria não deve depender do Worker/KV. Desde a V48.0.1, cada obra usa `preview` e `imagem`, ambas HTTPS: `preview` alimenta a grade e `imagem` é carregada apenas no lightbox. URLs podem
apontar para armazenamento externo. A grade preserva proporções variadas, usa
`loading=lazy` e o estado de carregamento de cada imagem reutiliza o símbolo
`.site-loader-logo` do loader global.

Desde a V48.1.1, os cards da grade exibem **somente título e artista** sobre a
preview. Categoria, data, tags e crédito pertencem ao dialog aberto pelo usuário
e não devem voltar para a sobreposição dos cards. O seletor de campo da busca da
Galeria é um drop-down próprio em HTML/CSS/JS, com teclado, foco e ARIA, usando
somente tokens do design system e sem introduzir asset gráfico local.

Cada item editorial usa `id`, `titulo`, `artista`, `imagem`, `alt`, `data`,
`categoria`, `tags` e opcionalmente `creditoUrl`, `largura` e `altura`. IDs são
únicos em kebab-case e `imagem`/`creditoUrl` usam HTTPS. Ajustes puramente visuais
da Galeria não devem criar, remover ou renomear campos em `data/content/artes.json`;
a compatibilidade com Helpers depende desse contrato permanecer estável.

### Jogos das Lives

`/jogos/` é uma página pública alimentada por `data/content/jogos.json`, gerado
por `.github/scripts/sync-jogos.mjs`. O Trello é a fonte editorial de listas,
nomes, ordem e cards; a Steam Web API é a fonte automática de identificação dos
jogos. O navegador do visitante não consulta a API do Trello nem a Steam Web API.

A sincronização pode usar uma linha opcional na descrição do card no formato
`SteamAppID: 123456`. O marcador é lido somente no GitHub Actions; quando contém
um inteiro positivo, tem prioridade sobre a resolução automática pelo nome e
determina o link da Steam e a tentativa de carregar a Library Capsule oficial.
Linha ausente, vazia, inválida ou com IDs conflitantes mantém o fallback automático.
A descrição completa nunca deve ser copiada para `jogos.json`; comentários,
membros, anexos e outros metadados do Trello também permanecem fora do JSON público.

A identificação automática usa `IStoreService/GetAppList` na Web API pública da
Steam com `STEAM_WEB_API_KEY` mantida somente no GitHub Actions. Correspondências
por nome devem continuar exatas e inequívocas; o marcador `SteamAppID:` permanece
como override autoritativo quando necessário. Não reintroduzir SteamGridDB, scraping
de páginas da loja ou chaves da Steam no frontend.

Capas automáticas continuam limitadas ao asset vertical original da Steam. A
sincronização tenta primeiro os caminhos oficiais determinísticos e, para Library
Capsules modernas em caminhos versionados/hash, consulta apenas metadados de assets
na infraestrutura oficial da Steam. Na ausência de asset oficial, preservar o
placeholder local mesmo quando o App ID estiver confirmado. `steamAppId` e
`steamUrl` pertencem ao jogo e não devem depender da existência de capa. O catálogo
pode publicar também `icon`, derivado do `community_icon` oficial da Steam, para
uso compacto pela Agenda; isso não substitui a Library Capsule exibida em Jogos.

A quantidade de cards por página não pertence ao JSON gerado pelo sync. Ela é
configuração editorial independente em `data/content/jogos-config.json`, no campo
inteiro `jogosPorPagina` (1 a 60). O frontend deve usar esse valor em toda a
paginação e manter 15 somente como fallback resiliente; não reintroduzir um
`PAGE_SIZE` fixo. Alterar essa configuração não deve exigir Trello, Steam ou novo sync.

### Doações

`/doacoes/` contém LivePix, Pixie e ranking.

Somente `/doacoes/` deve carregar `js/pages/doacoes/ranking.js`.

`js/core/api.js` é compartilhado por `/doacoes/` e pela aba Twitch da Home.

Mudanças em Worker, OAuth, KV, CORS ou endpoints são mudanças deliberadas de
backend e não devem acompanhar ajustes visuais incidentais.

Os campos editoriais multilinha de `data/content/doacoes.json` são:

- `subtitulo`;
- `livepix.descricao`;
- `pixie.descricao`;
- `aviso.texto`.

Neles, quebra de linha deve ser representada por `\n` no JSON (Enter no
helper privado). O frontend deve continuar usando `textContent`; não usar
`innerHTML`, `<br>` ou HTML editorial. A renderização é feita com
`white-space: pre-line` em `css/pages/doacoes.css`.

### 404

Deve permanecer `noindex`.

## Lives

Desde a V47.4, Lives mantém o mesmo carrossel visual e possui duas fontes:

- **Twitch** é a aba primária e automática;
- **YouTube** permanece manual/local e funciona como alternativa independente.

`data/content/lives.json` mantém os vídeos do YouTube (`videoId`, `title`, `date`)
e também declara `defaultPlatform: "twitch"` e `twitchCanalUrl`.

A integração Twitch deve obedecer estes invariantes:

- VODs: o navegador consulta `/twitch/videos`;
- status ao vivo: o navegador consulta `/twitch/live`;
- `/twitch/videos` e `/twitch/live` leem cache/KV e nunca chamam diretamente `api.twitch.tv` durante uma visita;
- `syncTwitchVideosIfDue()` inicia renovação após 20 h; o snapshot `twitch:videos` continua válido/publicável por no máximo 24 h e mantém TTL de 86400 s;
- `syncTwitchLiveIfDue()` usa janela nominal de 10 min entre consultas a `helix/streams`, com tolerância intencional de até 2 min para compensar latência/alinhamento do Cron;
- `twitch:live` usa TTL de 30 min e não pode ser servido como válido após 20 min sem atualização;
- o Hero só mostra `Sobre | Ao vivo` quando `live === true`; offline/erro mantém o Hero padrão;
- o snapshot e `updated_at` ficam no binding KV `RANKINGS`;
- `TWITCH_CLIENT_SECRET` nunca entra no frontend/Git;
- App Access Token deve ser reutilizado quando válido, mas revalidado em `/oauth2/validate` em intervalos menores que 1 h; qualquer `401` do Helix deve invalidar o token local e permitir no máximo um retry imediato com token novo;
- `twitch:user_id` e `twitch:user_login` podem ser reutilizados por no máximo 24 h e devem usar TTL no KV;
- falha de VOD não apaga o último snapshot válido; status ao vivo vencido não deve manter indicação visual de live;
- YouTube continua sem iframe/player, `YT.Player`, `iframe_api`, playlists
automáticas, YouTube Data API ou chave Google.

Títulos/IDs/datas do YouTube continuam conteúdo editorial. Dados da Twitch são
normalizados pelo Worker e não devem ser copiados manualmente para o JSON.

## Agenda

`data/agenda.json` continua sendo o contrato público/local consumido pela Home e
pelos Helpers existentes, com exatamente sete dias em ordem de domingo a sábado.
Desde V48.3.26, o arquivo pode ser gerado por `.github/scripts/sync-agenda.mjs` a
partir de um quadro Trello dedicado. O navegador nunca consulta a API do Trello.

No quadro, cada lista representa um dia da semana e cada card representa uma live.
A descrição do quadro pode declarar `Semana: YYYY-MM-DD` apontando para o domingo
da semana publicada e `Observacao: ...`. Em cada card, `Horario:` pode ser HH:MM
ou `A definir`, `Plataformas:` aceita YouTube/Twitch e `Descricao:` é opcional;
`Data:` também é opcional e, quando presente, deve coincidir com o dia/lista da
semana publicada. `SteamAppID:` é opcional e serve somente para associar a live
a um ícone oficial já resolvido em `data/content/jogos.json`. O sync da Agenda não
deve consultar a Steam diretamente nem manter um segundo cache de assets. Cards
arquivados não entram na agenda.

Dias podem ter zero, uma ou várias lives. O campo aditivo `lives` contém todos os
eventos do dia em ordem de horário, usando a posição do card no Trello como
desempate/fallback. Para compatibilidade com Helpers antigos, `temLive`, `horario`,
`titulo`, `descricao` e `plataformas` continuam obrigatórios no nível do dia e,
quando há live, espelham a primeira entrada de `lives`. O frontend também continua
aceitando arquivos legados sem `lives`. Dentro de cada entrada de `lives`,
`steamAppId` e `icon` são opcionais; `icon` só pode reutilizar o ícone oficial
`steam-original` do catálogo de Jogos e a Home deve carregá-lo com
`referrerpolicy="no-referrer"`. Helpers antigos continuam controlando os campos
legados da primeira live; a Home preserva o ícone enquanto o título legado continuar
igual ao de `lives[0]` e o omite se esse título for alterado, evitando associação
visual incorreta até a próxima sincronização pelo Trello. Um dia com horário vazio
deve aparecer como “A definir”.

O workflow `.github/workflows/sync-agenda.yml` usa os mesmos secrets do Trello já
existentes e lê o ID do quadro em `vars.TRELLO_AGENDA_BOARD_ID`. Se o Trello estiver
indisponível ou o quadro tiver estrutura/dados inválidos, a sincronização deve falhar
antes do commit, preservando o último `data/agenda.json` válido.

Como a Home pode exibir ícones/dados oficiais da Steam dentro da Agenda, manter o
aviso `.agenda-steam-notice` logo após a observação da Agenda. Para preservar a
interface compacta, ele deve usar o disclosure nativo `<details>`/`<summary>`, com
`Dados e ícones da Steam · Aviso legal` sempre visível e o texto completo expansível.
O conteúdo deve continuar cobrindo apresentação conforme disponível/sem garantias e
independência/não afiliação; não depender somente do aviso existente em `/jogos/`.

## CTAs de apoio e carrosséis

Na Home:

- `#heroSupportButton` e `#homeDonationButton` usam o mesmo desenho de coração
  do botão Apoiar da navbar;
- o CTA “Gostou das lives?” usa o rótulo `Apoiar`;
- `#livesTrack` e `#agendaGrid` aceitam click + arrasta com mouse/caneta;
- touch, teclado, setas, links e scroll-snap existentes devem continuar
  funcionando.

A implementação isolada fica em:

- `js/pages/home/home-interactions.js`;
- `css/components/home-interactions.css`.

## Conteúdo editorial

Editar textos nos JSON correspondentes em vez de hardcode sempre que o
campo já for editorial.

Arquivos principais:

- `data/content/hero.json`;
- `data/content/artes.json`;
- `data/content/lives.json`;
- `data/content/regras.json`;
- `data/content/creditos.json`;
- `data/content/home-doacoes.json`;
- `data/content/home-cards.json`;
- `data/content/doacoes.json`;
- `data/content/ranking.json`;
- `data/content/footer.json`;
- `data/blog/config.json`;
- `data/blog/posts.json`;
- `data/blog/posts/<slug>.md`;
- `data/agenda.json`.

Helpers de edição são privados e não pertencem ao site público.

## Assets

Assets gráficos publicados ficam em `https://assets.kamylisumire.com`.

Não manter duplicatas públicas de:

- avatar;
- favicon;
- fundo;
- preview social.

Nunito e sua licença continuam locais em `assets/fonts/`.

## Configuração de API

`js/core/config.js` deve permanecer apenas como configuração compartilhada.

Não usar `config.js` para carregar CSS/JS de páginas ou hotfixes.

Na V44.4, a configuração de produção é:

- `useCustomDomain: true`;
- `customDomainUrl: "https://api.kamylisumire.com"`;
- `fallbackToWorkersDev: true` durante a estabilização.

`api.kamylisumire.com` é o endpoint primário do ranking e da aba Twitch.
`workers.dev` permanece apenas como contingência temporária.

A V47.4 acrescenta no Worker `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`,
`TWITCH_CHANNEL_LOGIN` e, opcionalmente, `TWITCH_MAX_VIDEOS`.

A configuração OAuth do Worker deve usar exatamente:

`REDIRECT_URI=https://api.kamylisumire.com/oauth/callback`

CORS deve permitir `https://kamylisumire.com` e somente outras origens
explicitamente necessárias.

`STREAMLABS_CLIENT_SECRET`, `OAUTH_SETUP_TOKEN`, `OAUTH_STATE_SECRET`, tokens
OAuth e demais credenciais continuam fora do Git.

Desde a V48.3.62, todas as rotas `/debug/*` aceitam o token administrativo
**somente** em `Authorization: Bearer <token>`. O fallback `?key=` fica restrito
a `/oauth/authorize`, porque essa rota precisa continuar utilizável como uma
navegação simples de navegador. `OAUTH_SETUP_TOKEN` deve ter pelo menos 32
caracteres; valores menores falham fechado e não devem ser aceitos em produção.
As rotas administrativas e o `/oauth/callback` respondem com os mesmos
cabeçalhos de CORS de `handleRanking`.

O OAuth Streamlabs usa `OAUTH_STATE_SECRET`, separado de `OAUTH_SETUP_TOKEN`,
para assinar o `state` por HMAC. O segredo de state também deve ter pelo menos
32 caracteres. Cada autorização registra no KV um nonce `oauth:state:nonce:*`
com TTL de 10 minutos; o callback valida assinatura/idade e consome esse nonce
antes da troca do `code`, impedindo reutilização sequencial do mesmo state. Como
Workers KV é eventualmente consistente entre data centers, esse nonce é defesa
em profundidade e não substitui mecanismos de consistência forte se o threat
model futuro exigir proteção global estrita contra replay concorrente.
CORS sem variável configurada deve restringir-se aos domínios oficiais do site;
`*` só é aceitável quando definido explicitamente para teste.

A anonimização de nomes no ranking público passou do frontend (lista
fixa em `js/pages/doacoes/ranking.js`) para o Worker, via a variável de
ambiente `RANKING_PRIVATE_NAMES` (nomes separados por vírgula, comparação
sem diferenciar maiúsculas/minúsculas e ignorando espaços nas extremidades,
fora do Git) e, opcionalmente, `RANKING_PRIVACY_LABEL` (padrão
`"Anônimo"`). A regra deve ser aplicada em `handleRanking()` antes da resposta
pública; os snapshots no KV preservam os nomes originais. O frontend usa uma
chave de cache versionada (`kamyli-ranking-cache-v3`) para não reutilizar dados
crus gravados antes dessa migração. Configurar essas variáveis é uma etapa manual
no painel/CLI da Cloudflare — não há `wrangler.toml` neste repositório.

## Worker e quota — V47.4.7

A otimização de quota não pode reduzir a frequência funcional das integrações.
Preservar:

- Streamlabs na janela operacional atual do Cron (~10 min);
- Twitch Live na janela nominal de 10 min;
- validação de App Access Token Twitch a cada 50 min, sempre abaixo de 1 h;
- VODs Twitch com renovação após 20 h e validade/TTL máxima de 24 h (regra vigente desde V48.3.56);
- visitantes nunca chamam diretamente Twitch ou Streamlabs.

O roteamento HTTP do Worker é explícito. Somente os caminhos documentados podem
chegar aos respectivos handlers; caminho desconhecido deve responder `404` sem
ler ranking/KV. Métodos diferentes de `GET`/`OPTIONS` devem responder `405`.

As rotas públicas de ranking, Twitch Live e Twitch VOD podem usar
`caches.default` com chaves canônicas sem query string para reduzir leituras KV,
mas os payloads públicos e o comportamento de fallback devem permanecer
compatíveis com o frontend. Cache API é otimização de leitura, não fonte
autoritativa: snapshots persistentes continuam no KV `RANKINGS`.

Estados OAuth/cache consolidados vigentes:

- `tokens:streamlabs_state`;
- `twitch:app_access_token_state`;
- `twitch:user_state`.

As chaves V47.4.6 correspondentes permanecem aceitas somente como fallback de
migração. A migração de `twitch:user_login`/`twitch:user_id` não deve renovar o
TTL legado; após a expiração normal, o canal é resolvido novamente e então salvo
na chave consolidada por no máximo 24 h.

Mensagens de erro recorrentes devem evitar writes idênticos no KV quando uma
leitura de comparação for suficiente. Não sacrificar correção de ranking,
renovação OAuth ou snapshot Twitch necessário apenas para economizar quota.

## Validação estrutural — V47.4.8

Páginas HTML aninhadas devem resolver assets locais a partir da localização real
do documento (`../assets`, `../css`, `../js`) ou por caminho absoluto do domínio.
O validador percorre toda página `*.html` versionada e deve falhar quando uma
referência local não existir. Não limitar essa checagem a uma lista manual de
páginas.

A CI deve ser disparada também por Markdown do Blog, qualquer HTML público e
`workers.js`; além dos scripts em `js/**`, a sintaxe de `workers.js` deve ser
validada explicitamente com `node --check workers.js`.

## Navbar/footer e links externos

Navbar e footer são componentes compartilhados em `js/core/`.

Links externos continuam sujeitos ao fluxo global de confirmação por
delegação de eventos. Não implementar confirmadores concorrentes por página.

## Preferências e performance

Preservar:

- tema automático/claro/escuro;
- blur automático/ligado/desligado;
- `prefers-reduced-motion`;
- `prefers-reduced-transparency`;
- Save-Data;
- perfil adaptativo por memória/CPU quando disponível.

Não substituir isso por detecção de user-agent.

## SEO e publicação

Preservar:

- canonical;
- Open Graph;
- Twitter Cards;
- JSON-LD;
- `robots.txt`;
- `sitemap.xml`;
- `CNAME`;
- `noindex` de preview Cloudflare Pages.

## Cache-busting de scripts

Sem bundler (ver Princípios), cada `<script src="...">` carrega o
cache-buster `?v=` manualmente. Convenção:

- todo arquivo em `js/core/` e os `js/pages/**` carregados por cada
  página devem ter `?v=`;
- ao editar um arquivo, incrementar o `?v=` dele em **todas** as páginas
  que o carregam, para não depender de cache expirar sozinho;
- não é necessário sincronizar o número entre arquivos que não mudaram
  juntos — versões podem divergir entre arquivos por design.

Estado atual (a corrigir apenas quando esses arquivos forem tocados de
novo, não em PRs não relacionados): `js/core/preferences.js` e
`js/core/config.js` ainda não têm `?v=`.

## Validação

Todo PR relevante deve passar:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
node --check workers.js
git diff --check
```

Não versionar `__pycache__`, `.pyc`, `.pyo` ou resíduos temporários de
migração/hotfix.

### V47.4.1 — conformidade, privacidade e Uso de IA

- A rota `/privacidade/` é pública e deve permanecer acessível pelo footer global.
- A Política de Privacidade deve permanecer centrada nas informações relacionadas ao usuário: quais dados podem ser tratados, finalidades, armazenamento no navegador, integrações, retenção, escolhas e solicitações.
- O snapshot `twitch:videos` não pode ser servido após 24 h e usa TTL de 86400 s no KV.
- Falha de atualização após a expiração deve resultar em indisponibilidade temporária da aba Twitch, nunca em exposição de snapshot vencido.
- Mudanças em integrações, armazenamento local ou dados públicos devem ser refletidas na Política de Privacidade.
- A rota `/uso-de-ia/` é pública e deve permanecer acessível pelo footer global.
- A política proíbe o uso de conteúdos e assets próprios do site para treinamento, fine-tuning, desenvolvimento, avaliação ou aprimoramento de sistemas de IA.
- Não introduzir texto que apresente autorização excepcional para treinamento de IA sem uma decisão editorial explícita em versão futura.
- Conteúdo de terceiros e código com licença própria devem continuar claramente distinguidos dos assets autorais abrangidos pela política.
- `robots.txt` contém sinalização complementar para crawlers de IA conhecidos; não descrever esse mecanismo como bloqueio técnico absoluto.

### V47.4.4 — navegação por hash

- Links diretos da Home com hash devem aguardar `kamyli:site-revealed` antes do scroll inicial.
- A estabilização pós-scroll em `navbar.js` existe para absorver mudanças de altura de conteúdo assíncrono; não substituí-la por um `setTimeout` fixo sem observar o layout.
- Qualquer estabilização automática deve ser cancelada assim que o usuário iniciar interação de rolagem.
- Mudanças em `js/core/navbar.js` exigem atualização do `?v=` em todas as páginas públicas que carregam a navbar.


## CSP V48.0.2

Toda página HTML pública versionada deve manter a CSP mínima validada por `.github/scripts/validate-content.py`. Ao adicionar um novo host usado por `fetch`, imagens, fontes ou outros recursos, atualizar a política deliberadamente e validar o repositório. Não adicionar `frame-ancestors` à CSP via `<meta>`; esse diretivo exige cabeçalho HTTP. Também não adicionar `upgrade-insecure-requests` à meta CSP: o repositório deve continuar testável por servidor HTTP local, enquanto produção já opera em HTTPS. Páginas que carregam `js/core/footer.js` devem carregar `js/core/sanitize.js` antes dele.


### Navbar reordenável — V48.3.0

`data/content/navbar.json` mantém as nove chaves estáveis em `links` e adiciona `ordem`, uma lista sem duplicatas que determina a sequência visual dos nove itens. O runtime completa uma ordem ausente/incompleta com o padrão para compatibilidade, mas o conteúdo versionado atual deve listar todos os itens exatamente uma vez. **Apoiar** continua com estilo de CTA, porém participa do mesmo fluxo reordenável.
### Apoiar fixo opcional — V48.3.1

`data/content/navbar.json` aceita `apoioFixoNoFim`. Com `true` — e também quando a chave está ausente, por compatibilidade — o runtime aplica `ordem` aos itens e força **Apoiar** para o final, mantendo a posição histórica do CTA. Com `false`, `apoio` participa livremente da posição definida em `ordem`. As outras oito chaves continuam reordenáveis nos dois modos.

### Navbar Apoiar dual-mode — V48.3.2

Preserve os dois modos de `apoioFixoNoFim`: `true` deve manter `apoio` no wrapper dedicado `.site-nav-support-wrap` à direita; `false` deve mover o mesmo nó para `.site-nav-links` e obedecer `ordem`. Não duplique o link Apoiar no DOM.

### Invariante de performance e âncoras — V48.3.6

Não remover `runAfterSiteReveal`, o tratamento de `hashchange`, o scrollspy nem `startSectionStabilization`: eles preservam navegação direta para seções enquanto a Home muda de altura. Para performance, observers de conteúdo/botões devem filtrar mutações relevantes e `applyNavbarOrder()` deve permanecer idempotente. Agenda e assets decorativos não devem voltar ao caminho crítico do loader inicial.

### Alinhamento após ordem editorial — V48.3.30

A Navbar marca a página ativa antes de `navbar.json` terminar de carregar. Como a ordem editorial pode diferir da ordem fallback do HTML/JS, preservar o realinhamento do item `.is-active` após `kamyli:global-ui-ready`; sem esse passo, Artes/Galeria, Blog ou Jogos podem abrir com o scroll horizontal da Navbar calculado para a posição antiga. O realinhamento deve usar comportamento `auto`, sem animação adicional na chegada da página.
### V48.3.7 — CSP, contraste e indexação condicional

- Não reintroduzir `unsafe-inline`. Blocos `<script>`/`<style>` inline permitidos pela CSP usam hash SHA-256 e `.github/scripts/validate-content.py` recalcula os hashes reais; qualquer alteração de whitespace exige atualização da meta CSP correspondente.
- Não adicionar atributos `style=` ou handlers `on*=` aos HTMLs públicos enquanto a CSP permanecer sem `unsafe-inline`.
- `--primary-text` é para texto normal/pequeno no tema claro; `--primary-color` continua em fundos, bordas, ícones e títulos grandes. Galeria e Blog devem manter títulos principais no mesmo token `--primary-color`.
- `/artes/` permanece pública, mas só é indexável e incluída no sitemap quando `data/content/artes.json` contém ao menos um item.
- `/blog/` permanece pública, mas só é indexável e incluída no sitemap quando `data/blog/posts.json` contém ao menos um post com `published: true`. Drafts não contam.
- Não usar JavaScript para trocar `robots` em runtime; meta robots e sitemap são artefatos estáticos validados contra os JSONs editoriais.

## Privacidade e ranking — V48.3.8

- A identificação pública de privacidade é **Kamyli Souza** (nome social) e o canal é `contato@kamylisumire.com`; não adicionar nome civil, Gmail de destino, endereço residencial, telefone ou documentos ao repositório.
- O valor recebido em `donation.name` é **identificador de exibição autodeclarado e não autenticado**, não "nome verificado do doador". Pessoas diferentes podem usar o mesmo texto e o ranking agrega textos idênticos por design.
- O ranking pode publicar somente esse identificador e o valor acumulado necessários à finalidade; não enriquecer o identificador com outras bases nem inferir identidade civil.
- Uma contestação plausível pode levar o identificador público a **Anônimo** via `RANKING_PRIVATE_NAMES`, sem alterar valor/posição e sem reconhecer o solicitante como titular das contribuições.
- Nunca fornecer, corrigir ou excluir registros internos apenas porque o solicitante conhece ou usa o mesmo identificador exibido. Pedidos formais exigem avaliação proporcional da relação com os dados; não coletar documento civil por padrão.
- `RANKING_CACHE_TTL_MS` é limite máximo de retenção local: cache expirado deve ser removido e nunca usado como fallback.
- O aviso de privacidade do ranking deve permanecer próximo à própria funcionalidade, não apenas na Política de Privacidade.
- A indexação de `/artes/` e `/blog/` continua derivada do conteúdo editorial real e validada pela CI.

### Manutenção de consistência — V48.3.31

- `defaults.navbar` e `defaults.blogConfig` em `js/core/content.js` são fallbacks de contingência e devem permanecer semanticamente idênticos a `data/content/navbar.json` e `data/blog/config.json`; alterar um JSON exige atualizar o fallback no mesmo patch.
- `.agenda-card-content` só deve entrar na ordem de foco quando `scrollHeight > clientHeight`; uma live única também pode gerar overflow. Preserve o recálculo após renderização, resize e carregamento de fontes.
- `sync-jogos.yml` e `sync-agenda.yml` compartilham `editorial-sync-${{ github.ref }}` e não usam force push. Preserve o `git pull --rebase` antes do push para absorver commits remotos compatíveis.
- Todo script `.mjs` de sincronização deve passar `node --check` na CI geral.
- Imagens HTTPS editoriais da Galeria devem usar `referrerPolicy = "no-referrer"` tanto na grade quanto no dialog/preload; mudanças no fluxo de mídia externa exigem revisão da Política de Privacidade.
- `sitemap.xml` não deve conter `lastmod` mantido manualmente. A CI exige as rotas estáveis, cruza Blog/Galeria com o conteúdo publicado e rejeita URLs obsoletas.
- Totais internos do ranking devem continuar normalizados em objetos sem protótipo antes de usar identificadores autodeclarados como chaves.


### Navbar mobile V48.3.36

No mobile, não restaurar a faixa horizontal rolável nem duplicar os links editoriais. `Menu` reutiliza `.site-nav-links`, fica no canto inferior esquerdo e é mutuamente exclusivo com `@ Redes`. O topo preserva logo, contexto atual e o slot de Apoiar conforme `apoioFixoNoFim`; desktop mantém a Navbar tradicional.

### Navbar mobile V48.3.37

No mobile, `Menu` e o painel de navegação são movidos em runtime para `.site-nav-mobile-layer`, fora de `.site-nav`, para que `position: fixed` permaneça relativo à viewport mesmo em Chromium/Brave com `backdrop-filter`. Ao voltar ao desktop, os mesmos nós retornam à Navbar. O título contextual usa `--primary-color`, alinhamento à esquerda e truncamento seguro entre Logo e Apoiar.

### Navbar mobile V48.3.38

Preservar no mobile a composição `Logo | título | Apoiar` com as duas divisórias visíveis e título centralizado. `Menu` e `@ Redes` devem manter escala equivalente. Dentro de Menu, `.site-nav-links` é a única área rolável e `.site-nav-mobile-footer` mantém uma cópia sincronizada de Apoiar fora do scroll. A troca de título usa animação vertical e deve respeitar `prefers-reduced-motion`; não reintroduzir links duplicados como fonte editorial nem alterar a Navbar desktop.

### Navbar mobile V48.3.39

Preservar a largura-base de 188 px do `Menu`, equivalente a `@ Redes`, com itens em grade `24px + texto`, rótulos alinhados à esquerda e `Apoiar` fixo fora da área rolável. O título contextual deve permanecer alinhado à esquerda entre as divisórias, sem remover a animação vertical nem alterar o layout desktop.

### Navbar mobile V48.3.40

Preservar `Menu` com largura-base de 220 px e itens esticados por toda a largura útil (`justify-items: stretch` + wrapper em 100%); não reintroduzir largura intrínseca/centralização dos itens.

### Navbar mobile V48.3.41

Não usar `.site-nav-item`: esse wrapper não existe. A largura dos botões deve ser protegida por `.site-nav-links > .site-nav-link`, com stretch e 100% da largura útil; lista e footer compartilham padding lateral de 8 px.

### Navbar mobile V48.3.42

Os links do Menu devem usar Flex (`justify-content: flex-start`) e o `[data-nav-label]` deve crescer com `flex: 1 1 auto`; não reintroduzir Grid fixa de 24 px para ícones ocultos.

### Navbar mobile V48.3.43

Preservar o `Menu` como drawer lateral (`.site-nav-mobile-panel`) com backdrop, cabeçalho/fechar, lista rolável e `Apoiar` fixo. O drawer deve ser inerte quando fechado, prender o foco por Tab quando aberto, fechar `@ Redes` ao abrir e ser fechado quando `@ Redes` abrir. Não converter Redes em drawer nem alterar a Navbar desktop.

### Navbar mobile V48.3.44

Preservar o drawer abaixo da Navbar, com largura máxima de 288 px, links agrupados no topo e `Apoiar` fixo no rodapé. Links comuns não usam borda/cartão: normal é transparente e ativo/foco/hover usa `--primary-soft`. Fallbacks mobile são nós próprios (`[data-mobile-nav-fallback]`) e nunca substituem o slot editorial `[data-nav-icon]`. O gesto de borda usa 24 px, diferencia eixo horizontal/vertical e não deve bloquear o scroll vertical.

### Navbar mobile V48.3.45

Não reintroduzir título ou botão `×` no drawer. O diálogo deve manter `aria-label="Navegação principal"`, foco no primeiro link, fechamento por swipe/backdrop/Escape e integração temporária com History API para que Voltar feche a camada antes de navegar.

### Overlays mobile V48.3.46

Preservar `window.KamyliMobileOverlay` como coordenador único de `menu` e `socials`; componentes não devem voltar a manipular diretamente o estado um do outro nem criar históricos independentes. O controller deve manter exclusão mútua, `popstate`, `Escape`, restauração de foco e fila de abertura durante fechamento. `@ Redes` usa `.is-open`, `aria-expanded` e `inert`; o Menu mantém o drawer e o focus trap próprios.

### Overlays mobile V48.3.47

Não persistir Menu/Redes entre documentos ou restaurações BFCache. O marcador de histórico deve ser associado ao documento atual, e mudanças de hash da Home devem preservar `history.state`.

### Loader e Menu mobile — V48.3.48

Preservar a ocultação de `.site-nav-mobile-layer` para `site-loading-pending`, `site-loading-visible`, `site-navigation-loading` e `site-page-leaving`; o drawer vive fora de `.site-nav` e não herda automaticamente o contrato visual do loader.


### Hardening da CI — V48.3.63

- Todo job versionado em `.github/workflows/` deve manter `timeout-minutes` explícito; o contrato atual é 10 min para validação e 20 min para os syncs editoriais.
- `actions/checkout` deve permanecer fixado no SHA completo documentado como v4.2.2; não voltar a `@v4`, `@main` ou outra referência flutuante sem uma atualização explícita e revisada do pin.
- O checkout do workflow de validação é somente-leitura e deve manter `persist-credentials: false`; os workflows de sync preservam credenciais porque precisam executar `git push`.
- Validações da mesma ref podem cancelar execuções obsoletas; Jogos e Agenda continuam no grupo `editorial-sync-*` com `cancel-in-progress: false`, para não interromper uma publicação em andamento.
- O workflow principal executa `node --test .github/tests/*.test.mjs`; novos testes com esse sufixo entram automaticamente na CI e não devem exigir uma nova linha manual no YAML.

### Cliente API e fallback — V48.3.61

- `api.kamylisumire.com` continua primário; `workers.dev` só pode ser tentado após falha de transporte/timeout, nunca como repetição automática de HTTP 4xx/5xx ou JSON inválido.
- O timeout de `KamyliAPI.getJSON()` deve permanecer armado até `response.json()` terminar; não limpar o `AbortController` logo após os headers.
- Falhas HTTP devem preservar o status no erro e interromper a cadeia de candidatos; falhas de rede/abort podem avançar para o próximo candidato.
- Manter `.github/tests/api-client.test.mjs` na CI ao alterar `js/core/api.js` ou a estratégia de fallback.

### Segurança de URLs e retenção do ranking — V48.3.60

- URLs editoriais/API atribuídas a `href` devem passar por `KamyliSanitize.safeHttpUrl()`; não reintroduzir atribuição direta para Créditos, Steam ou links de Twitch.
- Steam exige HTTPS e host `store.steampowered.com`; Twitch exige HTTPS e host `twitch.tv`/`www.twitch.tv`. Imagens remotas continuam exigindo ao menos HTTPS e as allowlists específicas já existentes quando aplicáveis.
- `kamyli-ranking-cache-v4` tem TTL de 30 minutos. `ranking.js` deve remover cache vencido antes do uso e emitir `kamyli:ranking-cache-updated` ao gravar/remover; `preferences.js` deve programar a remoção global e revalidar em foco, `pageshow`, visibilidade e evento de storage.
- Navegador suspenso pode atrasar execução de timers; ao retomar, o cache vencido deve ser removido imediatamente e nunca reutilizado como fallback.

### Acessibilidade semântica — V48.3.59

- Todas as páginas devem preservar um `.skip-link` como primeiro controle focável após `<body>`, apontando para o `<main>` correspondente com `tabindex="-1"`; IDs de runtime existentes não devem ser trocados apenas para padronizar o alvo.
- Grades de resultados não devem usar `aria-live`; Artes e Jogos anunciam mudanças por regiões `.sr-only` com `role="status"`, `aria-live="polite"` e `aria-atomic="true"`.
- Anúncios de filtros devem ser curtos e quantitativos, sem reproduzir títulos/cards inteiros.
- Manter `.github/tests/accessibility-semantics.test.mjs` na CI ao alterar estrutura de `<main>`, grids ou estados de filtros.

### Contraste de ações — V48.3.58

- Fundos preenchidos de CTAs, filtros/abas ativos e seletores devem usar `--button-bg`/`--button-bg-hover` com `--button-text`, não combinar diretamente `--primary-color` com texto branco.
- `--primary-color` continua sendo a cor de marca para títulos grandes, ícones, bordas e detalhes decorativos; texto pequeno colorido deve preferir `--primary-text`.
- Os tokens de ação devem permanecer definidos nos temas claro, escuro explícito e fallback `prefers-color-scheme`, sempre com contraste mínimo de 4,5:1 para texto normal.
- Manter `.github/tests/color-contrast.test.mjs` na CI ao alterar tokens ou superfícies primárias.

### Fail-safe do loader — V48.3.57

- O bootstrap inline de todas as páginas deve armar `KAMYLI_LOADER_FAILSAFE_TIMER` por 6 s antes de `loader.js`; se o fluxo principal não assumir o reveal, o fail-safe precisa remover estados bloqueantes e restaurar `site-ready`.
- `loader.js` deve cancelar o timer somente quando o reveal normal assumir o controle; se `KAMYLI_LOADER_FAILSAFE_FIRED` já estiver ativo, o loader tardio não pode reabrir o overlay.
- O mínimo inicial vigente é 320 ms; o teto de 2,5 s e os timings de navegação interna permanecem separados.
- Qualquer mudança no bootstrap inline exige atualizar o hash CSP correspondente nas oito páginas e manter `.github/tests/loader-failsafe.test.mjs` passando.

### Redes mobile — V48.3.49

Preservar `--card-bg` no gatilho `@ Redes` quando aberto; não voltar a usar `--primary-soft` como única superfície do botão. Fechamento externo usa `pointerdown` para que gestos de rolagem iniciados fora do popup o descartem antes do scroll.

### Blog/Galeria — V48.3.50

Preservar a mesma ordem estrutural das ferramentas nas duas páginas: faixa de filtros/tags primeiro e busca + seletor depois. No desktop isso mantém filtros à esquerda e busca à direita; no mobile, filtros permanecem acima da busca.

### Conteúdo/loader/SEO — V48.3.51

- O fallback estático de `doacoes/index.html` deve repetir os textos correspondentes de `data/content/doacoes.json`; o mínimo atual do Pixie é R$ 1,00.
- Toda mudança em `js/pages/jogos/jogos.js` deve preservar o sinal `KAMYLI_PAGE_CONTENT_READY`/`kamyli:loader-ready` após `init()`, inclusive quando a carga falhar de forma tratada.
- `applyRuntimeSeo()` só pode aplicar `data.home` quando o documento for de fato a Home; páginas sem entrada própria em `seo.json` devem preservar seus metadados estáticos.

### Estado assíncrono de Ranking/Galeria — V48.3.52

- `js/pages/doacoes/ranking.js` deve renderizar a aba atualmente ativa quando cache/API concluírem; durante `loading`, trocar de aba mantém a mensagem de carregamento e não deve simular ranking vazio.
- `js/pages/artes/artes.js` deve invalidar callbacks de imagem full quando o diálogo fecha ou quando outro item assume o diálogo; callbacks obsoletos não podem alterar imagem, loader ou estado visual da obra atual.

### Fuso mensal do Ranking — V48.3.53

- A chave mensal do Worker deve usar explicitamente `America/Sao_Paulo`; não voltar a `getUTCFullYear()`/`getUTCMonth()`.
- O mesmo `monthKey()` deve classificar tanto o instante atual quanto `created_at` de cada doação, para que a virada aconteça à meia-noite de Brasília.


### Testes do Worker/Ranking — V48.3.54

- Preservar `.github/tests/worker-ranking.test.mjs` como suíte sem dependências externas, executada por `node --test` no workflow principal de validação.
- Os testes devem usar a implementação real de `workers.js` carregada/instrumentada apenas em memória; não adicionar exports, rotas ou flags de teste ao Worker de produção só para facilitar a suíte.
- Antes de alterar persistência, deduplicação, paginação, privacidade ou a virada mensal do ranking, atualizar/adicionar o teste correspondente e manter o comportamento fail-closed para JSON corrompido e falhas da API.

### Ledger atômico do Ranking — V48.3.55

- `ledger:v1` é a fonte primária de `lastId`, `month`, `global` e `monthly`; não voltar a usar `totals:*`/`state:*` como fonte quando o ledger existir.
- A migração do legado deve ser construída em memória e o primeiro `ledger:v1` só pode ser gravado depois de a leitura da Streamlabs terminar com sucesso.
- Persistir primeiro o ledger e somente depois snapshots/espelhos derivados. Se uma escrita derivada falhar, a execução seguinte deve reconstruí-la a partir do ledger sem dupla contagem.
- Manter `totals:global`, `totals:monthly`, `state:last_donation_id` e `state:current_month` como espelhos de compatibilidade nesta fase; não apagá-los nem tratá-los como transação.
- `ledger:v1` inválido/corrompido deve falhar fechado. Não fazer fallback silencioso para as chaves legadas quando a chave do ledger já existe.

### Robustez do Worker — V48.3.56

- Toda exceção inesperada do roteamento HTTP deve ser convertida em resposta JSON `500` com CORS e `Cache-Control: no-store`; não remover o `try/catch` global de `fetch()`.
- A paginação de doações deve permanecer limitada a 50 páginas e falhar fechado se o cursor `before` não avançar; nunca persistir resultado parcial nesses casos.
- Em CORS restrito, `Vary: Origin` deve existir mesmo quando a origem recebida não é permitida ou está ausente.
- VODs entram em renovação após 20 h, mas `twitch:videos` continua com TTL/validade pública máxima de 24 h; não servir snapshot com 24 h ou mais.
- A suíte `.github/tests/worker-robustness.test.mjs` deve permanecer na CI ao lado dos testes de ranking.
