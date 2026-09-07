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
      └─ Cloudflare Worker
         ├─ Streamlabs API/OAuth
         └─ KV
```

A disponibilidade do backend não deve determinar a disponibilidade da Home.

## JavaScript compartilhado

`js/core/` contém infraestrutura global:

- `preferences.js` — tema, blur e perfil adaptativo;
- `config.js` — configuração compartilhada e caminho GitHub Pages;
- `content.js` — utilitários de conteúdo;
- `navbar.js` / `footer.js` — componentes compartilhados;
- `external-links.js` — confirmação de navegação externa;
- `page-transitions.js` — transição de página com regras de acessibilidade;
- `loader.js` — loader local;
- `api.js` — cliente de API usado em Doações.

`config.js` não deve carregar módulos de páginas.

## Home

`js/pages/home/`:

- `home.js` — agenda e comportamentos principais;
- `content.js` — conteúdo editorial da Home;
- `lives.js` — cards manuais do YouTube;
- `home-interactions.js` — coração dos CTAs e drag dos carrosséis.

A Home não importa `api.js`.

## Doações

`js/pages/doacoes/`:

- `doacoes.js`;
- `content.js`;
- `ranking.js`.

O ranking possui cache local e fallback para o último cache disponível quando
a consulta remota falha.

## Lives

`data/content/lives.json` contém uma lista manual.

Não existe:

- player incorporado;
- iframe;
- playlist automática;
- YouTube Data API;
- chave Google.

O `videoId` é usado para gerar:

- `https://i.ytimg.com/vi/<id>/mqdefault.jpg`;
- `https://www.youtube.com/watch?v=<id>`.

## Backend

`workers.js` é isolado da Home.
Ele atende o ranking e administra a integração necessária com Streamlabs/KV.

Mudanças nesse arquivo exigem revisão específica de backend, segredos e CORS.

## Publicação

- `main` → GitHub Pages / produção;
- `site-v2` → preview Cloudflare Pages;
- `_headers` impede indexação do preview;
- `CNAME` define `kamylisumire.com`.

## Assets

Avatar, favicon, fundo e preview social são servidos pelo domínio
`assets.kamylisumire.com`.

Nunito permanece no próprio repositório.
