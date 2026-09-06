# CHANGELOG
## V40 — bundles CSS por página

- mantém `css/core`, `css/components` e `css/pages` como fontes modulares;
- adiciona `css/build/home.css`, `doacoes.css` e `404.css`;
- Home passa de quatro stylesheets locais bloqueantes para um;
- Doações passa de cinco stylesheets locais bloqueantes para um;
- 404 passa de quatro stylesheets locais bloqueantes para um;
- bundles são gerados e minificados de forma determinística;
- URLs relativas dos assets permanecem válidas porque `css/build` mantém a mesma profundidade dos módulos fonte;
- novo `.github/scripts/build-css.py` gera ou valida os bundles;
- CI falha se um CSS fonte mudar e o bundle correspondente não for regenerado;
- Google Fonts permanece externo nesta versão para permitir medição separada;
- nenhuma alteração em Worker, API, OAuth, KV, CORS, DNS ou SEO.

## V39.2 — corretivo mínimo de CI e documentação

- reaplica os arquivos auxiliares da V39/V39.1 que não chegaram à `main`;
- atualiza o CI para validar `avatar-192.webp` e `avatar-384.webp`;
- mantém `avatar.webp` apenas como legado, sem torná-lo requisito;
- valida `fundo.avif` e `fundo-mobile.avif`;
- workflow monitora `loader.js` e `home.js`;
- workflow executa `node --check` nos dois módulos alterados pela V39;
- atualiza README, AGENTS, DESIGN-SYSTEM e documentação de assets;
- nenhuma alteração em HTML funcional, CSS, JS de produção, Worker, API, SEO, DNS ou assets binários.

## V39.1 — hotfix de documentação e CI

- corrige a documentação para registrar `assets/fundo.avif` como asset já presente na `main`;
- documenta que o AVIF desktop pode ser reotimizado mantendo o mesmo caminho;
- CI V39 passa a exigir `avatar-192.webp` e `avatar-384.webp` em vez de depender do avatar legado;
- CI valida presença/assinatura de `fundo.avif` e `fundo-mobile.avif`;
- workflow reage a mudanças em `js/core/loader.js` e `js/pages/home/home.js`;
- workflow executa `node --check` nos dois JavaScripts alterados pela V39;
- nenhuma alteração no frontend, Worker, API, SEO ou assets.

## V39 — avatar responsivo, loader atrasado e agenda otimizada
- Home e Doações passam a usar `avatar-192.webp` e `avatar-384.webp` via `srcset`;
- o navegador escolhe automaticamente a resolução conforme tamanho e DPR;
- avatar PNG continua como fallback;
- loader começa oculto e só aparece após 180 ms se o conteúdo ainda não estiver pronto;
- visitas rápidas podem pular totalmente o loader, reduzindo competição pelo LCP;
- loader exibido por pouco tempo mantém uma janela mínima de 160 ms para evitar flash;
- fade do loader fica alinhado em 320 ms entre CSS e JavaScript;
- estado inicial passa de `site-loading` para `site-loading-pending`;
- agenda agrupa criação dos cards com `DocumentFragment`;
- métricas do carrossel são medidas em um único frame e reutilizadas durante a animação;
- eventos de scroll atualizam botões em `requestAnimationFrame` sem recalcular larguras a cada frame;
- `ResizeObserver` recalcula métricas apenas quando o carrossel muda de tamanho;
- CI valida os novos avatares e faz `node --check` nos JavaScripts alterados;
- Worker/API/OAuth/KV/CORS/DNS/SEO não alterados.

## V38 — fundo mobile AVIF e caminho crítico

- adiciona suporte a `assets/fundo-mobile.avif` para telas de até 760 px;
- mobile deixa de solicitar o AVIF desktop como primeira opção;
- mantém fallback WebP e PNG para o background;
- Save-Data continua removendo a imagem decorativa;
- remove `preferences.js` externo e síncrono do `<head>`;
- adiciona bootstrap inline mínimo para tema, blur e performance antes do CSS;
- `preferences.js` completo passa a carregar no fim do `body`, antes da navbar;
- preserva ausência de flash de tema/blur sem bloquear a descoberta do CSS;
- CI passa a validar o AVIF mobile e a posição não bloqueante de `preferences.js`;
- Home, Doações e 404 recebem o mesmo bootstrap crítico;
- Worker/API/OAuth/KV/CORS/DNS/SEO não alterados.

## V37 — entrada suave pós-loader

- adiciona uma animação mínima de entrada após o loader;
- navbar faz fade com deslocamento vertical de apenas 3 px;
- conteúdo principal e footer fazem fade com deslocamento de apenas 5 px;
- animação ocorre nos blocos principais, sem animar card por card;
- entrada começa durante o final do fade-out do loader para evitar troca abrupta;
- `site-revealing` é temporário e termina em `site-ready`;
- novo evento `kamyli:site-revealed` disponível para integrações futuras;
- `prefers-reduced-motion: reduce` remove totalmente a animação;
- 404 continua sem loader e não recebe a transição;
- Worker/API/OAuth/KV/CORS/DNS/SEO não alterados.

## V36 — performance adaptativa + fundo AVIF
- `fundo.avif` passa a ser a primeira opção do background, com WebP e PNG como fallbacks;
- loader deixa de carregar a arte pesada do fundo e usa apenas gradiente CSS + favicon;
- `preferences.js` passa a expor perfil de performance independente do override manual de blur;
- novo `data-performance="normal|reduced"` e `data-performance-reason`;
- `Save-Data` remove a imagem decorativa do fundo;
- hardware com `deviceMemory <= 2` GB ou `hardwareConcurrency <= 2` usa `background-attachment: scroll`;
- mobile continua usando `background-attachment: scroll`;
- CI passa a validar `fundo.avif`, assinatura AVIF, integração dos fallbacks e ausência do fundo no loader;
- workflow passa a reagir a alterações em `assets/*.avif` e `js/core/preferences.js`;
- nenhum preload é adicionado ao background decorativo;
- Worker/API/OAuth/KV/CORS/DNS não alterados.


## V35 — blur adaptativo

- blur passa a usar modo automático quando não existe preferência manual salva;
- nenhuma detecção baseada em User-Agent, Android/iPhone ou largura de tela;
- verifica suporte real a `backdrop-filter`;
- respeita `prefers-reduced-transparency: reduce`;
- considera `navigator.connection.saveData` quando disponível;
- desliga automaticamente em `deviceMemory <= 2` GB ou `hardwareConcurrency <= 2` quando essas APIs existem;
- APIs não suportadas são ignoradas sem penalizar o dispositivo;
- `kamyli:ui-blur=on/off` continua sendo override manual persistente;
- preferência manual pode ser removida via `KAMYLI_UI_PREFS.resetBlurToAuto()`;
- estado de diagnóstico exposto em `data-blur-mode`, `data-blur-preference` e `data-blur-reason`;
- mudanças de redução de transparência/economia de dados podem reavaliar o modo automático durante a sessão;
- controle da navbar informa estado automático/manual e fica desabilitado se blur não for suportado;
- Worker/API/OAuth/KV/CORS não alterados.

## V34 — performance com assets WebP

- `avatar.webp` passa a ser preferido com fallback para `avatar.png`;
- `fundo.webp` passa a ser preferido via `image-set`, mantendo PNG como fallback;
- `favicon.webp` usado no favicon moderno e no loader;
- `logo.webp` passa a ser a máscara exclusiva da navbar;
- preload pesado de `fundo.png` removido;
- avatar da Home recebe `fetchpriority=high`;
- loader deixa de esperar `window.load` e usa `DOMContentLoaded` + conteúdo local;
- tempo mínimo do loader reduzido de 460 ms para 280 ms;
- CI passa a validar presença e assinatura dos quatro WebP;
- `preview.png` permanece inalterado para social preview;
- Worker/API/OAuth/KV/CORS não alterados.

## V33 — estabilização pós-migração

- `CNAME` consolidado como `kamylisumire.com`;
- proteção `_headers` da V32 incorporada ao estado esperado de produção;
- `agenda.json` normalizado e limpo;
- chave duplicada de `descricao` removida;
- datas da agenda normalizadas para `AAAA-MM-DD`;
- campos de dias sem live limpos;
- `hero.json` sincronizado com fallback HTML, SEO e social preview;
- CI substituído por validação sintática + semântica com biblioteca padrão Python;
- CI detecta chaves JSON duplicadas;
- CI valida esquema/dias/datas da agenda;
- CI impede divergência Hero/SEO/preview;
- navbar adiciona `aria-current` e deixa 404 sem seção ativa;
- tabs do ranking recebem padrão ARIA completo e navegação por teclado;
- documentação atualizada para refletir migração concluída;
- Worker/API/OAuth/KV/CORS não alterados.

## V32 — proteção SEO dos previews

- `_headers` adicionado na raiz;
- `X-Robots-Tag: noindex` aplicado ao domínio padrão `*.pages.dev`;
- `X-Robots-Tag: noindex` aplicado aos deployments/aliases `*.*.pages.dev`;
- evita conteúdo duplicado entre Cloudflare Pages e `kamylisumire.com`;
- sitemap/canonical permanecem somente no domínio principal;
- nenhuma alteração em Worker, API, OAuth, KV, CORS ou DNS.

## V31 — SEO e migração

- `robots.txt` adicionado;
- `sitemap.xml` adicionado;
- `CNAME` consolidado como `kamylisumire.com`;
- títulos e descriptions SEO revisados;
- `meta robots` para Home e Doações;
- JSON-LD `WebSite` + `Person` na Home;
- JSON-LD `WebPage` em Doações;
- canonical da V30 preservado;
- social preview da V30 preservada;
- documentação de cutover, Search Console e sitemap adicionada;
- Worker/API/OAuth/KV/CORS não alterados.

## V30 — social preview

- Home recebe preview Open Graph/Twitter completa;
- título da preview da Home espelha o título do Hero;
- descrição da preview da Home espelha a descrição do Hero;
- `assets/preview.png` é usado como imagem grande;
- metadados `og:image:width`, `height`, `type` e `alt` adicionados;
- Doações preserva exatamente os textos de preview da branch `main`;
- `canonical`, `og:locale` e `og:site_name` adicionados;
- Worker/API/OAuth/KV/CORS não alterados.

## V29 — aviso global de links externos

- aviso de redirecionamento removido de `navbar.js`;
- novo `js/core/external-links.js`;
- confirmação aplicada a todos os links externos `http/https`;
- funciona também em links inseridos dinamicamente por JSON;
- preserva `target="_blank"` e intenção de nova aba;
- links internos continuam sem confirmação;
- Home, Doações e 404 carregam o mesmo módulo;
- suporte opcional a `data-external-warning="skip"` para exceções futuras;
- Worker/API/OAuth/KV/CORS não alterados.

## V28 — saneamento e documentação

- 404 atualizada;
- removido `api.js` da Home;
- removido CSS morto do fade antigo;
- breakpoints duplicados consolidados;
- seletor obsoleto `agenda-heading-actions` removido;
- fundo mobile com `background-attachment: scroll`;
- documentação reescrita;
- README principal adicionado;
- workflow para validar JSONs;
- Worker/API/OAuth/KV/CORS não alterados.

## V25–V27

- conteúdo editorial em `data/content/`;
- `KamyliContent`;
- footer global;
- loader com favicon;
- favicon da navbar em cor primária;
- toggle de blur com gota SVG.

## V18–V24

- claro/escuro;
- blur on/off;
- Doações normalizada;
- LivePix/Pixie em SVG;
- aviso alinhado.

## V10–V17

- carrossel;
- cards da agenda reorganizados;
- scrollspy;
- rolagem natural;
- correções mobile.

## Base modular

- Home/Doações isoladas;
- core/components/pages;
- agenda local;
- API encapsulada;
- Worker/KV preservados.
