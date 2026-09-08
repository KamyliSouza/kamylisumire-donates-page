# Arquitetura atual

## Visão geral

O site é estático e não possui build.

```text
Navegador
├─ Home
│  ├─ HTML/CSS/JS vanilla
│  ├─ data/content/*.json
│  ├─ data/agenda.json
│  └─ YouTube: thumbnails + links diretos
└─ /doacoes/
   ├─ HTML/CSS/JS vanilla
   ├─ conteúdo local
   └─ ranking
      └─ https://api.kamylisumire.com
         └─ Cloudflare Worker
            ├─ Streamlabs API/OAuth
            └─ KV
```

A disponibilidade do backend não deve determinar a disponibilidade da Home.

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
- `api.js` — cliente de API usado em Doações.

`config.js` não deve carregar módulos de páginas.

## Home

A Home permanece totalmente estática/local e não importa `api.js`.

## Doações

O ranking possui cache local e fallback para o último cache disponível quando
a consulta remota falha.

Na V44.4, a ordem dos endpoints é:

1. `https://api.kamylisumire.com`;
2. `workers.dev`, somente se o primeiro falhar.

## Lives

Lives permanecem manuais, usando thumbnails oficiais e links diretos do
YouTube. Não existe player incorporado, iframe, playlist automática, YouTube
Data API ou chave Google.

## Backend

`workers.js` é isolado da Home e funciona como origem de
`api.kamylisumire.com`.

Rotas relevantes:

- `/` — ranking público;
- `/oauth/authorize` — início controlado do OAuth;
- `/oauth/callback` — callback OAuth do Streamlabs;
- `/debug/status` — diagnóstico protegido por `OAUTH_SETUP_TOKEN`;
- `/debug/sync` — sincronização manual protegida.

Configuração de produção:

```text
REDIRECT_URI=https://api.kamylisumire.com/oauth/callback
ALLOWED_ORIGINS=https://kamylisumire.com
```

O binding KV continua sendo `RANKINGS`.
Credenciais sensíveis continuam como Secrets/bindings do Worker.

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
