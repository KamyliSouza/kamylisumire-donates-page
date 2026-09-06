# README-MIGRACAO.md — Estado e plano

## Estado atual

A `site-v2` contém a arquitetura modular:

```text
/           → Home
/doacoes/   → Doações + ranking
```

Preview:

```text
https://site-v2.kamylisumire-site.pages.dev
```

Branches:

```text
site-v2 → preview/desenvolvimento
main    → produção
```

## Já consolidado

- Home e Doações isoladas;
- navbar/footer compartilhados;
- modo claro/escuro;
- blur ligado/desligado;
- loader com favicon;
- conteúdo editorial em JSON;
- agenda em JSON;
- Regras/Créditos editáveis;
- ranking isolado;
- 404 atualizada;
- validação automática de JSON.

## Conteúdo editável

```text
data/agenda.json
data/content/
```

Guia:

```text
data/content/README.md
```

## Preview Cloudflare Pages

Configuração esperada:

```text
Framework: None
Build command: vazio ou exit 0
Root: raiz
Output: .
Production branch: main
Preview branch: site-v2
```

## Checklist antes do merge

### Home

- [ ] navbar;
- [ ] tema e blur;
- [ ] loader;
- [ ] avatar/favicon;
- [ ] agenda/carrossel;
- [ ] Regras/Créditos;
- [ ] scroll com mais de cinco itens;
- [ ] navegação mobile para Agenda/Regras/Créditos;
- [ ] footer;
- [ ] aviso de saída em links externos das redes, créditos e footer.

### Doações

- [ ] layout desktop;
- [ ] layout mobile;
- [ ] LivePix/Pixie;
- [ ] aviso alinhado;
- [ ] ranking;
- [ ] cache/fallback do ranking;
- [ ] footer;
- [ ] aviso de saída no LivePix/Pixie e demais links externos.

### 404

- [ ] navbar;
- [ ] tema/blur;
- [ ] footer;
- [ ] botão para Home;
- [ ] URL aninhada;
- [ ] pages.dev;
- [ ] GitHub Pages de projeto, se usado.

## Migração do domínio principal

Após aprovação do preview:

1. merge `site-v2` → `main`;
2. confirmar GitHub Pages;
3. confirmar `kamylisumire.com`;
4. testar HTTPS;
5. testar `/doacoes/`;
6. só então tratar `donate.kamylisumire.com`.

Redirect desejado:

```text
https://donate.kamylisumire.com
301 →
https://kamylisumire.com/doacoes/
```


## SEO e indexação

A versão de produção deve publicar:

```text
/robots.txt
/sitemap.xml
```

Depois do cutover:

1. criar/verificar a propriedade de domínio `kamylisumire.com` no Google Search Console;
2. enviar `https://kamylisumire.com/sitemap.xml`;
3. inspecionar `/` e `/doacoes/`;
4. solicitar indexação das duas páginas;
5. monitorar indexação e canônicos escolhidos pelo Google.

O hostname legado `donate.kamylisumire.com` deve responder com 301 para
`https://kamylisumire.com/doacoes/`.


## Proteção dos ambientes de preview

O domínio oficial indexável é:

```text
https://kamylisumire.com
```

Os endereços Cloudflare Pages são ambientes técnicos e não devem competir
com a produção nos mecanismos de busca.

O arquivo:

```text
_headers
```

aplica `X-Robots-Tag: noindex` a:

```text
*.pages.dev
*.*.pages.dev
```

Cloudflare Pages já adiciona `noindex` automaticamente a preview deployments,
mas a regra explícita também protege o domínio padrão do projeto
`kamylisumire-site.pages.dev`.

Checklist:

- [ ] `kamylisumire.com` permanece indexável;
- [ ] `site-v2.kamylisumire-site.pages.dev` retorna `X-Robots-Tag: noindex`;
- [ ] `kamylisumire-site.pages.dev` retorna `X-Robots-Tag: noindex`;
- [ ] nenhuma URL `pages.dev` entra no sitemap;
- [ ] canonical continua apontando para `kamylisumire.com`.

## API / Worker

A V28 não altera:

```text
workers.js
OAuth
KV RANKINGS
CORS
REDIRECT_URI
endpoint
```

A futura migração para:

```text
https://api.kamylisumire.com
```

deve ser uma tarefa de infraestrutura separada, reutilizando o mesmo Worker e mantendo `workers.dev` durante a transição.

## Pós-migração

Depois de estabilizar `main`:

- revisar SEO/canonical;
- revisar acessibilidade avançada do ranking;
- avaliar cache dos JSONs;
- avaliar domínio customizado da API em tarefa separada.
