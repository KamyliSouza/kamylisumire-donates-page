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
O Worker tenta renovar esse snapshot após 20 horas e o guarda no KV por no máximo 24 horas. A margem evita uma janela diária de indisponibilidade entre a expiração e o próximo Cron.
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
Streamlabs (~10 min), Twitch Live (~10 min) e validação Twitch (50 min) mantêm o comportamento operacional daquela versão. Desde a V48.3.56, VODs entram em renovação após 20 h, mas continuam válidas somente até 24 h.

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

A Política de Privacidade identifica **Kamyli Souza** (nome social) como responsável pública pelo tratamento e usa `contato@kamylisumire.com` como canal para solicitações. O ranking trata o texto recebido na contribuição como **identificador de exibição autodeclarado e não autenticado**, que pode coincidir entre pessoas diferentes; ele mantém identificador + valor acumulado como proposta comunitária, permite ocultação pública como **Anônimo** em casos de privacidade/contestação e mantém o cache em `localStorage` válido por no máximo 30 minutos, com remoção programada enquanto o site executa e limpeza imediata na retomada caso o navegador tenha suspendido a página, sem fallback expirado. O identificador exibido, isoladamente, não autentica pedidos sobre registros internos.

### Manutenção de consistência — V48.3.31

Os fallbacks de `navbar` e `blogConfig` em `js/core/content.js` devem espelhar exatamente seus JSONs editoriais; a CI rejeita divergências. Os workflows de Jogos e Agenda compartilham um grupo de concorrência editorial e fazem rebase seguro antes do push, sem `force`. Imagens da Galeria usam `no-referrer` mesmo quando o host HTTPS vem do conteúdo editorial. O sitemap não publica `lastmod` manual: datas só devem retornar se houver uma fonte automatizada e confiável.

### Hotfix mobile — V48.3.37

No mobile, `Menu` e o painel de navegação são movidos em runtime para `.site-nav-mobile-layer`, fora de `.site-nav`, para que `position: fixed` permaneça relativo à viewport mesmo em Chromium/Brave com `backdrop-filter`. Ao voltar ao desktop, os mesmos nós retornam à Navbar. O título contextual usa `--primary-color`, alinhamento à esquerda e truncamento seguro entre Logo e Apoiar.

### Refinamento mobile — V48.3.38

No mobile, Logo, título contextual e Apoiar permanecem no topo separados por divisórias; o título volta a ser centralizado e usa uma transição vertical ao mudar de seção/página, desativada por `prefers-reduced-motion`. O painel `Menu` acompanha a escala visual de `@ Redes`: os links ficam numa área rolável e uma cópia sincronizada de Apoiar permanece fixa no rodapé. Desktop/tablet largo continuam com a Navbar tradicional.

### Hotfix mobile — V48.3.39

O painel `Menu` usa a mesma largura-base e a mesma grade visual do painel `@ Redes`; rótulos ficam alinhados à esquerda. O título contextual continua entre as duas divisórias, porém alinhado à esquerda para não parecer deslocado pela largura variável de `Apoiar`. A animação vertical e o rodapé fixo de apoio permanecem.

### Hotfix mobile — V48.3.40

O Menu volta a 220 px de largura-base e sua grade força cada item a preencher toda a largura útil, preservando apenas a margem interna de 8 px compartilhada com o CTA `Apoiar`.

### Hotfix mobile — V48.3.41

Os links do Menu são filhos diretos de `.site-nav-links`; a geometria agora é aplicada a esses nós reais, com 100% da largura útil e o mesmo recuo lateral de 8 px do rodapé `Apoiar`.

### Hotfix mobile — V48.3.42

Os itens do Menu usam Flex internamente; ícones ocultos deixam de reservar uma coluna de 24 px, permitindo que o rótulo use toda a largura disponível sem truncamento prematuro.

### Drawer de navegação mobile — V48.3.43

No mobile, `Menu` abre um drawer lateral pela esquerda em vez de uma caixa flutuante. A lista de páginas rola de forma independente, `Apoiar` permanece fixo no rodapé e um backdrop fecha o drawer ao tocar fora. `@ Redes` continua como popup rápido no canto inferior direito.

### Drawer refinado — V48.3.44

No mobile, o drawer usa largura `clamp(248px, 74vw, 288px)`, começa abaixo da Navbar e mantém os links agrupados no topo. Os itens seguem a linguagem da Navbar desktop, sem bordas individuais, e recebem ícones genéricos locais quando o conteúdo editorial não define um ícone. A faixa de 24 px da borda esquerda permite abrir por swipe; arrastar o drawer para a esquerda fecha. `Apoiar` permanece fixo no rodapé.

### Drawer mobile — V48.3.45

O drawer não possui mais cabeçalho interno nem botão `×`. Ele fecha por swipe à esquerda, backdrop, `Esc` e pela ação Voltar do navegador/Android; a abertura cria uma entrada temporária de histórico que é consumida ao fechar.

### Overlays mobile coordenados — V48.3.46

`Menu` e `Redes` compartilham `js/core/mobile-overlay.js`: apenas um overlay pode ficar aberto, o botão/gesto Voltar e `Escape` fecham a camada ativa antes de navegar, alternar entre Menu/Redes reutiliza a mesma entrada temporária do histórico e o foco retorna ao gatilho quando apropriado. O popup de Redes agora é controlado por botão + `aria-expanded`/`inert`, com animação curta; o drawer mantém swipe/backdrop e focus trap. Em campos de texto, os FABs somem enquanto o teclado virtual ocupa parte relevante da viewport.

### Hotfix de overlays — V48.3.47

Estados `menu`/`socials` no History API são temporários por documento e são descartados em reload/navegação/BFCache. A Home preserva `history.state` ao trocar somente o hash da seção.

### Hotfix do loader — V48.3.48

Como o Menu mobile é renderizado fora de `.site-nav`, a camada `.site-nav-mobile-layer` replica explicitamente os estados de ocultação do loader. Durante carregamento/transição, o gatilho, drawer, backdrop e faixa de swipe ficam invisíveis e não interativos.


### Cliente API resiliente — V48.3.61

A V48.3.61 restringe o `workers.dev` a contingência de transporte: timeout, falha de rede ou interrupção do stream. Respostas HTTP válidas do domínio principal, inclusive 4xx/5xx, não são repetidas no fallback. O timeout de `KamyliAPI.getJSON()` permanece ativo até o corpo JSON terminar de ser consumido, cobrindo respostas que entregam headers mas travam durante a leitura. JSON inválido também falha no host que respondeu, sem fallback silencioso.

### URLs externas e retenção local — V48.3.60

A V48.3.60 centraliza em `KamyliSanitize.safeHttpUrl()` a validação de URLs vindas de JSON/API antes de atribuí-las a `href`. Créditos aceitam somente HTTP(S); links de jogos exigem HTTPS em `store.steampowered.com`; links vindos da Twitch exigem HTTPS em `twitch.tv`/`www.twitch.tv`. O cache local do Top 5 continua com TTL de 30 minutos, mas agora `preferences.js` também agenda a remoção em qualquer página e revalida a expiração ao retomar foco/visibilidade/pageshow, enquanto `ranking.js` notifica cada atualização do cache.

### Acessibilidade semântica — V48.3.59

A V48.3.59 adiciona um link “Pular para o conteúdo” em todas as páginas. O link fica fora do fluxo visual até receber foco e aponta diretamente para o `<main>` da página, que aceita foco programático sem substituir IDs já usados pelo runtime. Artes e Jogos deixam de aplicar `aria-live` às grades completas: uma região `role="status"` visualmente oculta anuncia somente a contagem filtrada de resultados.

A suíte `.github/tests/accessibility-semantics.test.mjs` protege os oito skip links, os alvos focáveis, os utilitários `.skip-link`/`.sr-only` e o contrato de anúncios curtos.

### Contraste de ações — V48.3.58

A V48.3.58 separa a cor de marca das superfícies clicáveis primárias. `--primary-color` continua responsável por títulos, ícones e detalhes visuais, enquanto `--button-bg`, `--button-bg-hover` e `--button-text` definem CTAs, abas/filtros ativos e demais controles preenchidos. Os pares de cor são validados automaticamente para manter pelo menos 4,5:1 nos temas claro e escuro, inclusive no fallback de `prefers-color-scheme`.

A suíte `.github/tests/color-contrast.test.mjs` calcula o contraste WCAG dos tokens e verifica que os principais componentes continuam usando o contrato semântico de botões. Textos pequenos de marca devem usar `--primary-text`; `--primary-color` permanece apropriado para títulos grandes, ícones, bordas e decoração.

### Fail-safe do loader — V48.3.57

Todas as páginas armam no bootstrap inline um fail-safe de 6 s. Se `loader.js` não executar ou falhar antes de concluir o reveal, o bootstrap remove os estados bloqueantes, oculta o overlay e devolve a página ao estado `site-ready`. O fluxo normal cancela esse timer ao assumir o reveal. O mínimo visual do carregamento inicial foi reduzido de 500 ms para 320 ms; navegações internas mantêm seus próprios timings.

### Hotfix do popup Redes — V48.3.49

No mobile, `@ Redes` preserva a superfície e as cores normais enquanto aberto; o estado ativo é indicado por borda/halo da cor primária. Um toque ou gesto iniciado fora do popup fecha Redes já no `pointerdown`, então o painel não permanece aberto durante o scroll da página.

### Paridade Blog/Galeria — V48.3.50

A barra de ferramentas do Blog segue a mesma hierarquia da Galeria: tags/filtros vêm primeiro e o conjunto busca + seletor fica depois, resultando em filtros à esquerda e busca à direita no desktop e na mesma ordem vertical no mobile.

### Consistência de conteúdo e carregamento — V48.3.51

A V48.3.51 mantém o fallback estático de Doações sincronizado com `data/content/doacoes.json` (Pixie a partir de R$ 1,00), faz Jogos sinalizar conteúdo pronto ao loader e impede que páginas sem entrada em `seo.json` herdem título/description da Home em runtime. A CI protege os três contratos contra regressão.

### Estado assíncrono de Ranking/Galeria — V48.3.52

A V48.3.52 mantém o Ranking sincronizado com a aba selecionada mesmo quando o usuário troca de período durante o carregamento e protege o diálogo da Galeria contra callbacks atrasados de imagens full. Fechar ou trocar o conteúdo do diálogo invalida o carregamento anterior, evitando que uma obra antiga sobrescreva a atual.

### Fuso mensal do Ranking — V48.3.53

A V48.3.53 define `America/Sao_Paulo` como fuso explícito da chave mensal usada pelo Worker. A virada do ranking mensal passa a acontecer à meia-noite de Brasília, inclusive na passagem de dezembro para janeiro, e o mesmo critério é usado para classificar a data de cada doação.


### Testes automatizados do Worker/Ranking — V48.3.54

A V48.3.54 adiciona `.github/tests/worker-ranking.test.mjs`, executado com o runner nativo `node:test` e sem dependências adicionais. A suíte carrega a implementação real de `workers.js` apenas em memória para testes e cobre fuso mensal, parsing de datas, Top 5, privacidade, deduplicação, reset mensal, paginação e comportamento fail-closed. O código publicado do Worker não ganha exports ou caminhos especiais de teste.

### Estado atômico do Ranking — V48.3.55

A V48.3.55 passa a usar `ledger:v1` no KV como fonte primária do estado lógico do ranking. O registro reúne versão, último ID processado, mês corrente e totais geral/mensal; uma única escrita da chave evita que o cursor avance sem os totais correspondentes (ou vice-versa). Na primeira sincronização após o deploy, o Worker lê as chaves legadas, monta o ledger em memória e só o persiste depois que a consulta à Streamlabs termina com sucesso.

As chaves `totals:*` e `state:*` não são removidas: permanecem como espelhos de compatibilidade e são reparadas a partir do ledger em cada execução bem-sucedida. Os snapshots públicos `ranking:monthly` e `ranking:allTime` também são derivados a cada execução com `putKVIfChanged`; assim, uma falha posterior ao commit do ledger é corrigida no cron seguinte sem recontar doações. Um `ledger:v1` corrompido falha fechado e exige correção explícita, em vez de recuar silenciosamente para dados legados potencialmente obsoletos.

### Robustez do Worker — V48.3.56

A V48.3.56 envolve o roteamento HTTP do Worker em tratamento global de erro: exceções inesperadas passam a responder JSON `500` com CORS e `Cache-Control: no-store`, em vez de virar erro 1101 sem contexto para o navegador. A paginação de doações da Streamlabs fica limitada a 50 páginas por sincronização e também detecta cursor `before` sem progresso; ambos os casos falham antes de publicar qualquer estado parcial.

Para VODs da Twitch, a renovação passa a ser tentada após 20 horas, enquanto o snapshot continua com validade pública/KV máxima de 24 horas. Isso fornece margem para o Cron sem aumentar a retenção. Respostas com CORS restrito passam a enviar `Vary: Origin` inclusive quando a origem da requisição não é permitida, evitando reutilização incorreta por caches.
