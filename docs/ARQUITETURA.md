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
├─ /artes/
│  ├─ HTML/CSS/JS vanilla
│  ├─ data/content/artes.json
│  └─ imagens HTTPS externas, sem Worker/KV
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
- `api.js` — cliente compartilhado usado pelo ranking de Doações e pela aba Twitch em Lives;
- `sanitize.js` — `escapeHtml` compartilhado por módulos que montam HTML a partir de conteúdo editorial; páginas que carregam `footer.js` devem carregar `sanitize.js` antes dele.

`config.js` não deve carregar módulos de páginas.

## Home

A Home continua majoritariamente local. Desde a V47.4, ela importa `api.js`
apenas para consultar o snapshot público de `/twitch/videos`. Essa consulta não
é requisito para Hero, Agenda, Regras, Créditos, Blog ou a aba YouTube.


## Galeria de Artes

`/artes/` usa `data/content/artes.json` e renderiza uma grade fluida de imagens
com proporções variadas. A imagem continua em sua proporção original; título,
artista, categoria e data aparecem sobre a base com gradiente de contraste.
Durante o carregamento individual, o card reutiliza `.site-loader-logo`, o mesmo
símbolo animado do loader global. Imagens usam `loading=lazy`.

A galeria é completamente estática do ponto de vista de backend: o navegador
carrega o JSON local e as URLs HTTPS de imagem diretamente do host configurado.
Nenhuma visita à galeria executa `workers.js` ou lê KV. A grade usa somente `preview`; a `imagem` full é requisitada sob demanda quando o usuário abre a obra.

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
`scheduled()`/debug, em janela nominal de 10 minutos com tolerância intencional
de até 2 minutos para absorver latência/alinhamento do Cron. Online, o Hero
mostra `Sobre | Ao vivo`, um anel no avatar e o selo `AO VIVO` acoplado à borda;
offline, erro ou snapshot vencido mantém o Hero padrão.

## Backend

`workers.js` é isolado da Home e funciona como origem de
`api.kamylisumire.com`.

Rotas relevantes:

- `/` — ranking público;
- `/oauth/authorize` — início controlado do OAuth, com `state` assinado desde V47.4.5;
- `/oauth/callback` — callback OAuth do Streamlabs, que valida `state` antes de trocar o `code`;
- `/debug/status` — diagnóstico protegido por `OAUTH_SETUP_TOKEN`;
- `/debug/sync` — sincronização manual protegida do ranking;
- `/twitch/videos` — snapshot público das últimas VODs da Twitch, com Cache API antes do KV desde V47.4.7;
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

Desde a V47.4.7, o roteamento é explícito: `/` é a única rota do ranking e
caminhos desconhecidos retornam `404` antes de acessar KV. Métodos diferentes
de `GET`/`OPTIONS` retornam `405`. Ranking, `/twitch/videos` e `/twitch/live`
usam chaves canônicas de Cache API sem query string para reduzir leituras KV
repetidas por data center; o KV continua sendo a fonte persistente.

Os estados internos consolidados são `tokens:streamlabs_state`,
`twitch:app_access_token_state` e `twitch:user_state`. O Worker aceita as chaves
V47.4.6 correspondentes durante a migração automática, sem exigir nova
autorização OAuth. A frequência funcional das integrações não muda.

Na V47.4.5, o App Access Token da Twitch é validado periodicamente em `/oauth2/validate`, e o `user_id`/login resolvidos pelo Helix usam retenção máxima de 24 horas no KV.

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


### Segurança V48.0.2

As páginas HTML versionadas usam uma CSP mínima via `<meta http-equiv="Content-Security-Policy">`, compatível com a hospedagem estática atual. O contrato restringe scripts, estilos, conexões, objetos, formulários e frames carregados pela própria página. `frame-ancestors` não faz parte dessa CSP porque só é efetivo quando enviado como cabeçalho HTTP; eventual proteção de embedding/clickjacking deve ser configurada no host que controlar os response headers. `upgrade-insecure-requests` também é omitido deliberadamente: produção já usa HTTPS e o repositório preserva compatibilidade com servidores HTTP locais usados em desenvolvimento e validação manual.

A autenticação administrativa do Worker mantém o mesmo token e as mesmas rotas, mas compara o segredo com `crypto.subtle.timingSafeEqual`.
