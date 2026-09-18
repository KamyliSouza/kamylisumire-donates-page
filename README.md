# Kamyli Sumire — site oficial

Site público de `kamylisumire.com`, desenvolvido sem framework e sem etapa de build.

Desde a V48.2.0, `data/content/navbar.json` usa `version: 2` e centraliza texto, ícone e URL de todos os itens da Navbar, inclusive **Apoiar**. A mesma versão adiciona `data/content/home-cards.json` para ordenar, ocultar/exibir, redimensionar e variar visualmente os cards da Home, além de permitir cards personalizados limitados pelo Design System. Ícones usam apenas nomes da biblioteca segura `js/core/button-icons.js`; não há HTML/SVG bruto ou CSS arbitrário nos JSONs. Essas alterações de contrato exigem Helpers Web/Desktop compatíveis com V48.2.0.

## Arquitetura

- **Frontend:** HTML, CSS e JavaScript vanilla.
- **Conteúdo editorial:** JSON versionado em `data/`.
- **Home:** majoritariamente local; a aba Twitch de Lives e o status ao vivo do Hero leem snapshots públicos do Worker, com fallback local/visual quando a API está indisponível.
- **Blog:** página estática em `/blog/`, sempre acessível pela Navbar e pela Home; quando não há posts publicados, a interface mantém o estado vazio em vez de ocultar o Blog.
- **Galeria de Artes:** página estática em `/artes/`, alimentada por `data/content/artes.json` e imagens HTTPS externas.
- **Doações:** página independente em `/doacoes/`.
- **Backend público:** ranking de doações, snapshot diário das VODs da Twitch e status ao vivo atualizado em janelas de 10 minutos.
- **Backend:** Cloudflare Worker em `workers.js`, exposto em `https://api.kamylisumire.com`.
- **Fallback da API:** `workers.dev` mantido temporariamente para contingência.
- **Produção:** GitHub Pages pela branch `main`.
- **Preview:** Cloudflare Pages, protegido contra indexação.
- **Assets gráficos públicos:** `assets.kamylisumire.com`.
- **Fonte Nunito:** mantida localmente em `assets/fonts/`.

Não há React, Vue, bundler, npm, geração estática ou compilação.

## Conteúdo editável

### Composição da Home — V48.2.0

`data/content/home-cards.json` controla a **ordem, visibilidade, tamanho e variante visual** dos sete cards nativos da Home (`hero`, `lives`, `agenda`, `blog`, `regras`, `creditos`, `apoio`). O conteúdo desses cards continua em seus arquivos editoriais próprios; este JSON não duplica textos de Hero, Agenda etc.

Também podem ser adicionados cards `personalizado` com eyebrow, título, descrição, ícone da allowlist, alinhamento e CTA opcional. O contrato limita a apresentação a `compacto|grande` e `padrao|suave|destaque`, sem aceitar CSS, HTML/SVG bruto ou caminhos de assets. Em desktop, cards compactos ocupam uma das duas colunas e cards grandes ocupam a largura total; em mobile todos ocupam uma coluna.


Os textos e listas ficam em `data/content/*.json`.

As redes sociais globais ficam em `data/content/redes.json`. A ordem do array é a
ordem visual; cada entrada possui `id`, `nome`, `url`, `icone` e `visivel`. Em
desktop/tablet (a partir de 768 px) elas aparecem em um dock vertical fixo à
esquerda; no mobile aparecem atrás da cápsula expansível `@ Redes`. URLs devem
usar HTTPS e os ícones
precisam existir na biblioteca segura `js/core/button-icons.js`. A Home não mantém
mais uma segunda lista hardcoded de redes.

A paginação de `/jogos/` é editorial e fica em `data/content/jogos-config.json`.
O campo `jogosPorPagina` define quantos cards aparecem em cada página; a V48.3.32
usa `15`. Valores válidos vão de 1 a 60. Essa configuração é independente do
Trello/Steam e pode ser alterada sem editar JavaScript nem executar o sync de Jogos.
Se o arquivo estiver indisponível no navegador, o frontend usa 15 como fallback.

A agenda semanal continua publicada em `data/agenda.json`. Desde a V48.3.26, ela
pode ser sincronizada de um quadro Trello dedicado por GitHub Actions sem expor
a API ao navegador. O contrato legado de cada dia é preservado e o campo aditivo
`lives` permite zero, uma ou várias transmissões no mesmo dia.

Para o quadro da Agenda, use exatamente sete listas (`Domingo`, `Segunda-feira`,
`Terça-feira`, `Quarta-feira`, `Quinta-feira`, `Sexta-feira`, `Sábado`) e um card
por live. Na descrição do quadro, defina `Semana: YYYY-MM-DD` usando o domingo da
semana publicada; `Observacao: ...` é opcional. Em cada card, use por exemplo:

```text
Horario: 20:00
Plataformas: YouTube, Twitch
SteamAppID: 3357650
Descricao: Vamos jogar alguma coisa!
```

`Horario: A definir` também é aceito. `Data: YYYY-MM-DD` é opcional e funciona
como validação extra: quando informada, precisa corresponder à lista e à semana.
`SteamAppID:` também é opcional; quando presente, a Agenda procura esse App ID no
catálogo local `data/content/jogos.json` e reutiliza somente o ícone oficial da
Steam já resolvido pelo sync de Jogos. A Agenda não faz uma segunda consulta à
Steam; se o catálogo ainda não tiver ícone para o ID, a live é publicada normalmente
sem imagem. Cards no mesmo dia são ordenados pelo horário; empates e horários
indefinidos preservam a ordem do Trello. O ID/short link do quadro deve ficar na Repository
Variable `TRELLO_AGENDA_BOARD_ID`; os secrets `TRELLO_API_KEY` e `TRELLO_TOKEN`
já usados pela sincronização de Jogos são reutilizados.

As Lives usam duas abas no mesmo componente visual. **Twitch é a aba padrão** e
recebe as últimas transmissões gravadas por `https://api.kamylisumire.com/twitch/videos`.
O Worker atualiza esse snapshot no máximo uma vez a cada 24 horas e o guarda no KV.
A aba YouTube continua editorial/local em `data/content/lives.json`, com `videoId`,
`title` e `date`, sem YouTube Data API, iframe ou chave Google.

Desde a V47.4.3, o Hero também consulta `GET /twitch/live`. O endpoint lê apenas
o snapshot `twitch:live` do KV; a consulta real ao `helix/streams` ocorre no Worker
no máximo uma vez a cada 10 minutos. Se o canal estiver online, o Hero mostra
`Sobre | Ao vivo`, mantendo o avatar visível com anel de status. Offline ou sem
snapshot válido, o Hero continua no layout padrão.

Desde a V47.4.4, links diretos com hash (`/#agenda`, `/#regras`, `/#creditos` etc.)
aguardam o reveal da página e recebem uma estabilização temporária de posição.
Isso evita que conteúdo assíncrono anterior desloque a seção depois do scroll,
sem impedir que o visitante reassuma o controle ao rolar manualmente.

Desde a V47.4.5, o Worker reforça a conformidade das integrações: o OAuth da
Streamlabs usa `state` assinado e temporário; o App Access Token da Twitch é
validado periodicamente no endpoint oficial `/oauth2/validate`; `twitch:user_id`
e `twitch:user_login` expiram em 24 horas; e o CORS de produção deixa de cair
implicitamente em `*` quando nenhuma origem é configurada.

Desde a V47.4.6, a rotina de status ao vivo usa uma tolerância intencional de
até 2 minutos sobre a janela nominal de 10 minutos para não perder um ciclo do
Cron por causa da latência da chamada anterior. Respostas `401` do Helix também provocam uma
única renovação imediata do App Access Token e repetição da chamada afetada.

Desde a V47.4.7, o Worker reduz consumo de quota sem alterar as frequências das
integrações: caminhos inválidos não leem mais o ranking, ranking e VODs Twitch
usam Cache API antes do KV, erros repetidos evitam writes idênticos e estados
OAuth/cache são consolidados com migração transparente das chaves V47.4.6.
Streamlabs (~10 min), Twitch Live (~10 min), validação Twitch (50 min) e VODs
(24 h) mantêm o comportamento operacional anterior.

Desde a V48.0.1, `/artes/` integra uma galeria editorial em masonry com duas imagens HTTPS por obra: `preview` leve na grade e `imagem` em alta qualidade carregada somente ao abrir o lightbox. A página mantém créditos, filtros, busca e o mesmo símbolo de loader do site, sem consumir Worker/KV e reutilizando Navbar/Footer compartilhados.

Desde a V48.1.1, o seletor de escopo da busca da Galeria usa um drop-down próprio alinhado ao design system, sem assets gráficos locais. Os cards da grade exibem somente título e artista; categoria, data, tags e crédito ficam reservados ao dialog da obra. Essa alteração é exclusivamente de frontend e não modifica `data/content/artes.json`, schemas editoriais ou contratos consumidos pelos Helpers.

Desde a V48.1.3, a listagem do Blog reutiliza a mesma linguagem visual e interação da busca por campo da Galeria, incluindo drop-down customizado e estados de foco/seleção. Os campos continuam próprios do Blog (`title`, `summary`, `tags`) e nenhum arquivo editorial em `data/blog/` é alterado.
Desde a V48.1.4, o conjunto completo de ferramentas do Blog também usa o mesmo `glass-panel` externo da Galeria, envolvendo filtros de tags, seletor e campo de busca em uma única superfície visual.
Desde a V48.3.3, os drop-downs **Buscar em** da Galeria e do Blog ancoram seus menus diretamente ao controle do valor selecionado; o título do Blog também usa a cor primária do site, seguindo a mesma hierarquia cromática da Galeria.

Desde a V47.4.8, as páginas institucionais usam caminhos locais corretos a partir
de seus diretórios, e a validação/CI cobre qualquer HTML público, Markdown do
Blog e a sintaxe do próprio `workers.js`, evitando regressões silenciosas.

## Estrutura principal

```text
.github/                 CI e validação
assets/fonts/            Nunito local e licença
css/core/                base visual
css/components/          componentes reutilizáveis/isolados
css/pages/               estilos por página
data/                    conteúdo editorial
docs/                    documentação atual
blog/                    índice e páginas estáticas do Blog
artes/                   Galeria de Artes
privacidade/             Política de Privacidade
uso-de-ia/               política de Uso de IA
doacoes/                 página de apoio/ranking
js/core/                 infraestrutura compartilhada
js/pages/home/           lógica da Home
js/pages/blog/           lógica da listagem do Blog
js/pages/artes/          lógica da Galeria de Artes
js/pages/doacoes/        lógica de Doações
workers.js               backend do ranking
```

## API de produção

O frontend de `/doacoes/` e as integrações Twitch da Home usam
`https://api.kamylisumire.com` como endpoint primário.

Durante a estabilização da V44.4, `workers.dev` permanece como fallback.
Falhas do Worker não impedem o restante da Home nem a aba local do YouTube.

OAuth, client secret, tokens e credenciais não pertencem ao repositório
público. A configuração sensível permanece no Cloudflare Worker.

## Desenvolvimento

Como o projeto não possui build, sirva a raiz por HTTP para testes locais.

```bash
python -m http.server 8000
```

Antes de publicar:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
node --check workers.js
node --check .github/scripts/sync-jogos.mjs
node --check .github/scripts/sync-agenda.mjs
git diff --check
```

## Documentação atual

- `AGENTS.md` — regras de manutenção e invariantes.
- `DESIGN-SYSTEM.md` — sistema visual.
- `docs/ARQUITETURA.md` — componentes e fluxos.
- `docs/PRODUCAO.md` — publicação, preview e backend.
- `docs/GUIA-TWITCH-V47.4.md` — implantação da integração Twitch e cache de 24 horas.
- `docs/VALIDACAO.md` — matriz de validação.
- `docs/SANEAMENTO-V44.md` — histórico consolidado do saneamento.
- `CHANGELOG.md` — histórico resumido.

### Privacidade e Uso de IA

Desde a V47.4.1, a Política de Privacidade está publicada em `/privacidade/` com foco nas informações relacionadas ao usuário, incluindo armazenamento local, Streamlabs/ranking, Twitch, Cloudflare, retenção e escolhas. A mesma versão faz os snapshots públicos de VODs da Twitch expirarem no KV em no máximo 24 horas e impede que conteúdo vencido seja servido pela API pública.

A V47.4.1 também publica `/uso-de-ia/`, com proibição expressa do uso de conteúdos e assets próprios do site para treinamento, fine-tuning, desenvolvimento, avaliação ou aprimoramento de sistemas de IA. O `robots.txt` adiciona sinalização complementar para crawlers de IA conhecidos.


### Navbar reordenável — V48.3.0

`data/content/navbar.json` mantém as nove chaves estáveis em `links` e adiciona `ordem`, uma lista sem duplicatas que determina a sequência visual dos nove itens. O runtime completa uma ordem ausente/incompleta com o padrão para compatibilidade, mas o conteúdo versionado atual deve listar todos os itens exatamente uma vez. **Apoiar** continua com estilo de CTA, porém participa do mesmo fluxo reordenável.
### Apoiar fixo opcional — V48.3.1

`data/content/navbar.json` aceita `apoioFixoNoFim`. Com `true` — e também quando a chave está ausente, por compatibilidade — o runtime aplica `ordem` aos itens e força **Apoiar** para o final, mantendo a posição histórica do CTA. Com `false`, `apoio` participa livremente da posição definida em `ordem`. As outras oito chaves continuam reordenáveis nos dois modos.

### Apoiar no slot histórico — V48.3.2

`apoioFixoNoFim: true` agora restaura literalmente o layout histórico: o CTA **Apoiar** sai do grupo central reordenável e volta ao slot dedicado à direita, separado pelo divisor. Com `false`, o CTA entra em `.site-nav-links` e respeita sua posição em `ordem`.
### Navegação mobile sem scroll — V48.3.36

Até 767 px, a Navbar mantém logo e contexto da página no topo e reaproveita os próprios links editoriais em um menu flutuante `Menu` no canto inferior esquerdo. O componente `@ Redes` permanece à direita e os dois painéis são mutuamente exclusivos. Quando `apoioFixoNoFim: true`, **Apoiar** continua no slot superior direito; com `false`, continua participando da ordem editorial dentro do menu. Desktop/tablet largo preservam a Navbar tradicional.

### Blur dos seletores — V48.3.5

O menu aberto de **Buscar em** da Galeria e do Blog é portado temporariamente para `document.body` e posicionado sob o controle. Assim o `backdrop-filter` do listbox desfoca a página real, sem depender da composição do `glass-panel` ancestral. O mesmo nó retorna ao seu wrapper ao fechar; ARIA, teclado e preferência **Blur desligado** são preservados.

### Blur dos seletores — V48.3.4

Galeria e Blog mantêm o painel externo translúcido, mas o blur desse painel é pintado por `::before` para não criar uma Backdrop Root ancestral dos seletores. Campo e menu de **Buscar em** usam blur próprio e respeitam a preferência global de blur.

### Carregamento V48.3.6

A V48.3.6 reduz trabalho redundante durante a montagem sem remover a navegação por seção. Links diretos como `/#agenda`, `/#regras` e `/#creditos` continuam esperando o reveal e usando estabilização posterior; o hotfix apenas restringe observers globais, evita reordenação redundante da Navbar e impede Agenda/fundo decorativo de segurarem o loader inicial.
### Segurança, contraste e SEO condicional — V48.3.7

A V48.3.7 remove `unsafe-inline` da CSP em favor de hashes SHA-256 validados pela CI, introduz `--primary-text` para texto normal no tema claro e mantém `--primary-color` em títulos grandes/elementos de identidade. `twitch-live.js` aceita thumbnails apenas por HTTPS.

Blog e Galeria continuam acessíveis mesmo vazios, porém ficam `noindex, follow` e fora do `sitemap.xml` até possuírem conteúdo público. A validação cruza `posts.json`/`artes.json`, meta robots e sitemap para impedir publicação com esses sinais fora de sincronia.

### Privacidade e LGPD — V48.3.8

A Política de Privacidade identifica **Kamyli Souza** (nome social) como responsável pública pelo tratamento e usa `contato@kamylisumire.com` como canal para solicitações. O ranking trata o texto recebido na contribuição como **identificador de exibição autodeclarado e não autenticado**, que pode coincidir entre pessoas diferentes; ele mantém identificador + valor acumulado como proposta comunitária, permite ocultação pública como **Anônimo** em casos de privacidade/contestação e limita o cache em `localStorage` a 30 minutos reais, sem fallback expirado. O identificador exibido, isoladamente, não autentica pedidos sobre registros internos.

### Manutenção de consistência — V48.3.31

Os fallbacks de `navbar` e `blogConfig` em `js/core/content.js` devem espelhar exatamente seus JSONs editoriais; a CI rejeita divergências. Os workflows de Jogos e Agenda compartilham um grupo de concorrência editorial e fazem rebase seguro antes do push, sem `force`. Imagens da Galeria usam `no-referrer` mesmo quando o host HTTPS vem do conteúdo editorial. O sitemap não publica `lastmod` manual: datas só devem retornar se houver uma fonte automatizada e confiável.
