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
