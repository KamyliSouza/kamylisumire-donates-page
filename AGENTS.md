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

## Validação

Todo PR relevante deve passar:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

Não versionar `__pycache__`, `.pyc`, `.pyo` ou resíduos temporários de
migração/hotfix.
