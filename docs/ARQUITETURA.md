# Arquitetura atual

## Visão geral

O site é estático e não possui build.

```text
Navegador
├─ Home
│  ├─ HTML/CSS/JS vanilla
│  ├─ data/content/*.json
│  ├─ data/agenda.json
│  └─ Lives
│     ├─ Twitch → /twitch/videos → snapshot KV (24 h)
│     └─ YouTube → thumbnails + links diretos locais
└─ /doacoes/
   ├─ HTML/CSS/JS vanilla
   ├─ conteúdo local
   └─ ranking
      └─ https://api.kamylisumire.com
         └─ Cloudflare Worker
            ├─ Streamlabs API/OAuth
            └─ KV
```

A disponibilidade do backend não deve determinar a disponibilidade geral da Home: se a API falhar, apenas a aba Twitch pode ficar indisponível e o YouTube local continua acessível.

Durante a estabilização da V44.4, `workers.dev` continua disponível como
fallback de contingência.

## JavaScript compartilhado

`js/core/` contém infraestrutura global:

- `preferences.js` — tema, blur e perfil adaptativo;
- `config.js` — configuração compartilhada e caminho GitHub Pages;
- `content.js` — utilitários de conteúdo;
- `navbar.js` / `footer.js` — componentes compartilhados;
- `external-links.js` — confirmação de navegação externa;
- `page-transitions.js` — transição de página;
- `loader.js` — loader local;
- `api.js` — cliente compartilhado usado pelo ranking de Doações e pela aba Twitch em Lives.

`config.js` não deve carregar módulos de páginas.

## Home

A Home continua majoritariamente local. Desde a V47.4, ela importa `api.js`
apenas para consultar o snapshot público de `/twitch/videos`. Essa consulta não
é requisito para Hero, Agenda, Regras, Créditos, Blog ou a aba YouTube.

## Doações

O ranking possui cache local e fallback para o último cache disponível quando
a consulta remota falha.

Na V44.4, a ordem dos endpoints é:

1. `https://api.kamylisumire.com`;
2. `workers.dev`, somente se o primeiro falhar.

## Lives

O mesmo componente visual possui duas abas:

1. **Twitch (padrão):** últimas VODs obtidas pelo Worker e servidas a partir do KV;
2. **YouTube:** lista manual/local de `data/content/lives.json`.

O endpoint público `/twitch/videos` nunca chama a Twitch durante uma visita.
A sincronização de VODs respeita uma janela mínima de 24 horas. Não existe
player incorporado, iframe ou YouTube Data API.

Desde a V47.4.3, o Hero consulta também `/twitch/live`. A rota pública lê um
snapshot `twitch:live` do KV e usa Cache API por 60 segundos para reduzir
leituras repetidas. A consulta real a `helix/streams` ocorre somente no
`scheduled()`/debug, no máximo uma vez a cada 10 minutos. Online, o Hero mostra
`Sobre | Ao vivo`, um anel no avatar e o selo `AO VIVO` acoplado à borda; offline, erro ou snapshot vencido mantém
o Hero padrão.

## Backend

`workers.js` é isolado da Home e funciona como origem de
`api.kamylisumire.com`.

Rotas relevantes:

- `/` — ranking público;
- `/oauth/authorize` — início controlado do OAuth;
- `/oauth/callback` — callback OAuth do Streamlabs;
- `/debug/status` — diagnóstico protegido por `OAUTH_SETUP_TOKEN`;
- `/debug/sync` — sincronização manual protegida do ranking;
- `/twitch/videos` — snapshot público das últimas VODs da Twitch;
- `/debug/twitch-sync` — inicialização/sincronização protegida das VODs, respeitando a janela de 24 h;
- `/twitch/live` — status público ao vivo, servido de cache/KV;
- `/debug/twitch-live-sync` — sincronização protegida do status ao vivo, com `?force=1` opcional.

Configuração de produção:

```text
REDIRECT_URI=https://api.kamylisumire.com/oauth/callback
ALLOWED_ORIGINS=https://kamylisumire.com
TWITCH_CHANNEL_LOGIN=kamyli
TWITCH_MAX_VIDEOS=10
```

O binding KV continua sendo `RANKINGS`.
Credenciais sensíveis continuam como Secrets/bindings do Worker. `TWITCH_CLIENT_SECRET` deve ser Secret; `TWITCH_CLIENT_ID` pode ser variável e também permanece fora do conteúdo editorial.

## Publicação

- `main` → GitHub Pages / produção;
- `site-v2` → preview Cloudflare Pages;
- `_headers` impede indexação do preview;
- `CNAME` define `kamylisumire.com`;
- Custom Domain do Worker define `api.kamylisumire.com`.

## Assets

Avatar, favicon, fundo e preview social são servidos por
`assets.kamylisumire.com`.

Nunito permanece no próprio repositório.
