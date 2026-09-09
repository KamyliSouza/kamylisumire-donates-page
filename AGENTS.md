# Regras de manutenção

Este arquivo descreve apenas o estado vigente do projeto. Histórico de
implementações antigas deve ser consultado pelo Git, não reintroduzido como
regra atual.

## Princípios

1. Manter o projeto sem framework, bundler ou etapa de build.
2. Preferir HTML/CSS/JavaScript vanilla e conteúdo editorial em JSON.
3. Alterações devem ser localizadas: não ampliar escopo sem necessidade.
4. Home deve continuar funcional mesmo se Worker/Streamlabs estiverem fora.
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

A Home **não** deve carregar `js/core/api.js` nem o ranking.

### Blog

`/blog/` é estático e textual. A Navbar e a seção de últimas publicações da
Home só aparecem quando `data/content/blog.json` possui ao menos um post com
`published: true`.

Cada post publicado deve ter uma página estática correspondente em
`blog/<slug>/index.html`. Não carregar API/Worker no Blog.

### Doações

`/doacoes/` contém LivePix, Pixie e ranking.

Somente essa página deve carregar:

- `js/core/api.js`;
- `js/pages/doacoes/ranking.js`.

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

O modelo vigente é manual.

`data/content/lives.json` armazena:

- `videoId`;
- `title`;
- `date`;
- metadados textuais do bloco.

O frontend usa thumbnail de `i.ytimg.com` e link
`youtube.com/watch?v=...`.

Não reintroduzir sem decisão arquitetural explícita:

- iframe/player incorporado;
- `YT.Player`;
- `iframe_api`;
- playlists automáticas;
- `cuePlaylist`/`getPlaylist`;
- YouTube Data API;
- API key Google.

Títulos, IDs, datas e ordem das Lives são conteúdo editorial. Validadores
podem avisar sobre anomalias, mas não devem corrigi-los silenciosamente.

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

`api.kamylisumire.com` é o endpoint primário do ranking. `workers.dev`
permanece apenas como contingência temporária.

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
