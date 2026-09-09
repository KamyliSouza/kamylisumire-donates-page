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

A Home carrega conteúdo local e inclui:

- Hero e redes;
- Lives recentes;
- Agenda;
- Regras;
- Créditos;
- CTA de apoio.

A Home carrega `js/core/api.js` somente para as integrações públicas da Twitch:
a aba Twitch de Lives e o status ao vivo do Hero. Não deve carregar `ranking.js`;
falha do Worker deve manter o Hero padrão e as demais seções locais funcionando.

### Blog

`/blog/` é estático e textual. A Navbar e a seção de últimas publicações da
Home só aparecem quando `data/content/blog.json` possui ao menos um post com
`published: true`.

Cada post publicado deve ter uma página estática correspondente em
`blog/<slug>/index.html`. Não carregar API/Worker no Blog.

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
- `syncTwitchVideosIfDue()` deve respeitar no mínimo 24 h entre atualizações;
- `syncTwitchLiveIfDue()` deve respeitar no mínimo 10 min entre consultas a `helix/streams`;
- `twitch:live` usa TTL de 30 min e não pode ser servido como válido após 20 min sem atualização;
- o Hero só mostra `Sobre | Ao vivo` quando `live === true`; offline/erro mantém o Hero padrão;
- o snapshot e `updated_at` ficam no binding KV `RANKINGS`;
- `TWITCH_CLIENT_SECRET` nunca entra no frontend/Git;
- App Access Token e `user_id` devem ser reutilizados quando válidos;
- falha de VOD não apaga o último snapshot válido; status ao vivo vencido não deve manter indicação visual de live;
- YouTube continua sem iframe/player, `YT.Player`, `iframe_api`, playlists
automáticas, YouTube Data API ou chave Google.

Títulos/IDs/datas do YouTube continuam conteúdo editorial. Dados da Twitch são
normalizados pelo Worker e não devem ser copiados manualmente para o JSON.

## Agenda

`data/agenda.json` é local, contém sete dias e não depende de API.
Um dia com live pode ter horário vazio; a interface deve tratar como
“A definir”.

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
- `data/content/lives.json`;
- `data/content/regras.json`;
- `data/content/creditos.json`;
- `data/content/home-doacoes.json`;
- `data/content/doacoes.json`;
- `data/content/ranking.json`;
- `data/content/footer.json`;
- `data/content/blog.json`;
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

`STREAMLABS_CLIENT_SECRET`, `OAUTH_SETUP_TOKEN`, tokens OAuth e demais
credenciais continuam fora do Git.

Desde a V47.3, `/oauth/authorize`, `/debug/status` e `/debug/sync`
aceitam o token de administração via `Authorization: Bearer <token>`
(preferido, não fica em logs/histórico) além do fallback `?key=` na URL
(mantido só porque `/oauth/authorize` precisa continuar sendo um link
clicável no navegador). As três rotas administrativas e o `/oauth/callback`
agora respondem com os mesmos cabeçalhos de CORS de `handleRanking`, em vez
de um subconjunto inconsistente.

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
