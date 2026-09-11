# Validação

## V44.4 — domínio próprio da API

A API pública de produção é:

`https://api.kamylisumire.com`

Durante a estabilização, `workers.dev` permanece como fallback.

Validação manual obrigatória:

1. abrir `https://api.kamylisumire.com/`;
2. confirmar resposta JSON do ranking;
3. confirmar CORS para `https://kamylisumire.com`;
4. confirmar que Streamlabs e Cloudflare usam
   `https://api.kamylisumire.com/oauth/callback`;
5. reautorizar o OAuth no domínio novo;
6. abrir `/doacoes/` e confirmar no console:
   `API atendida por: https://api.kamylisumire.com`;
7. confirmar ranking e fallback/cache.

## CI automática

Execute:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
node --check workers.js
git diff --check
```

O validador estrutural anterior pode emitir um aviso ao detectar
`useCustomDomain: true`. Esse aviso é esperado nesta migração e não é erro.

## Limites da validação estática

A CI não prova disponibilidade do Cloudflare Worker, Streamlabs ou KV.
A migração do domínio exige smoke test real em navegador.

A Home deve continuar funcionando mesmo que todos os endpoints do ranking
estejam indisponíveis.

## V45.2 — blur pós-loader

Contrato:

1. `body > main` não fica `opacity: 0` durante o loader;
2. `.site-loader` não usa `backdrop-filter` fullscreen;
3. o loader opaco cobre conteúdo que continua paintable atrás dele;
4. o fundo AVIF apropriado é preloaded somente com blur ligado/performance normal;
5. `loader.js` tenta decodificar esse fundo antes do reveal, com timeout;
6. `.glass-panel`, `.site-nav` e `.site-footer` são aquecidos antes do reveal;
7. blur off/Save-Data/performance reduzida não antecipam o fundo.

A CI contém guardas para os principais itens acima.


## V45.2.1 — loader com blur

O loader volta a usar a superfície translúcida do site:

- `background-color: var(--card-bg)`;
- `backdrop-filter: blur(var(--blur-card))`;
- tema claro/escuro continua vindo dos tokens globais;
- `data-blur="off"` remove o filtro do loader;
- a página continua renderizável atrás do loader.

Limitação conhecida e aceita: em alguns navegadores/dispositivos pode existir
um curto intervalo até a composição final do blur dos painéis depois do
reveal. A V45.2.1 não tenta eliminar completamente esse comportamento.

## V45.2.2 — loader separado da página

Sequência:

1. loader translúcido permanece visível;
2. Navbar, `main` e Footer permanecem invisíveis;
3. loader faz fade-out por 320 ms;
4. o loader é removido;
5. há um intervalo adicional de 150 ms;
6. só então `site-revealing` inicia a entrada da página.

A página não deve aparecer por trás do loader.

A pequena diferença de composição do blur dos cards após o reveal permanece
como limitação conhecida e aceita.

## V47.4 — Twitch em Lives

Além da validação estática, confirmar em produção:

1. `/debug/status` protegido mostra `twitch.configured: true`;
2. primeira chamada protegida a `/debug/twitch-sync` cria o snapshot;
3. `/twitch/videos` responde sem autenticação e sem expor credenciais;
4. nova chamada a `/debug/twitch-sync` antes de 24 h retorna `cache_fresh`;
5. Twitch é a aba primária da Home;
6. YouTube continua funcionando se `/twitch/videos` falhar;
7. o endpoint público não dispara consultas a `api.twitch.tv`.

A CI valida a presença da trava de 24 horas, das rotas Twitch e dos elementos do
seletor, mas o comportamento temporal real deve ser confirmado pelo smoke test.

## V47.4.3 — status ao vivo e Hero dinâmico

Além da validação V47.4, confirmar em produção:

1. configurar o Cron como `*/10 * * * *`;
2. executar `/debug/twitch-live-sync?force=1` com Bearer e confirmar `status: ok`;
3. offline: `/twitch/live` responde `200` com `live: false` e a Home mantém o Hero padrão;
4. online: `/twitch/live` responde `200` com `live: true`, título, categoria, espectadores e thumbnail;
5. online: o avatar recebe o anel de live e o Hero exibe `Sobre | Ao vivo`, iniciando em `Ao vivo`;
6. a aba `Sobre` restaura o conteúdo normal do Hero sem ocultar avatar/redes;
7. uma segunda sincronização antes de 10 min retorna `cache_fresh` e não chama novamente `helix/streams`;
8. após 20 min sem snapshot válido, `/twitch/live` responde `503` e o Hero volta ao padrão;
9. requisições repetidas a `/twitch/live` no mesmo data center podem ser atendidas por `caches.default`, reduzindo leituras KV;
10. uma sincronização do ranking sem novas doações não deve regravar snapshots idênticos no KV.

O smoke test deve confirmar também que a thumbnail da live/VOD recebe uma nova
revisão quando `checkedAt`/`updatedAt` muda, sem aumentar a quantidade de
consultas aos endpoints Helix.

## V47.4.8 — referências locais e cobertura da CI

O validador percorre toda página HTML versionada e resolve `src`/`href` locais a
partir do diretório real de cada documento. Isso impede regressões como uma
página em `/privacidade/` tentar carregar `privacidade/css/...` por engano.

A CI deve disparar para qualquer `*.html`, `data/**/*.md` e `workers.js`, além
dos arquivos já cobertos. A sintaxe do Worker é verificada separadamente com
`node --check workers.js`.

O status ao vivo da Twitch mantém a janela nominal de 10 minutos com tolerância
intencional de até 2 minutos. Essa tolerância faz parte do comportamento atual e
não deve ser reduzida apenas para coincidir com documentação histórica.

## V48.0/V48.0.1 — Galeria de Artes

A CI valida `artes/index.html`, `css/pages/artes.css`, `js/pages/artes/artes.js` e
`data/content/artes.json`. Na V48.0.1 o documento usa `version: 2`. Cada arte deve usar ID único em kebab-case, URLs HTTPS obrigatórias em `preview` e `imagem`, `alt` não vazio, data ISO `YYYY-MM-DD`, categoria e artista.
`creditoUrl` é opcional, mas quando informado deve usar HTTPS. `largura` e
`altura` são opcionais e precisam ser inteiros positivos.

## V48.1.0 — Busca por campo na Galeria e no Blog

A V48.1.0 adiciona escopo explícito de busca sem alterar os schemas editoriais.
Na Galeria, os campos são Todos, Artista, Título, Categoria e Tags. No Blog,
Todos, Título, Resumo e Tags. Prefixos digitados têm precedência sobre o seletor.

Smoke test manual recomendado:

1. abrir `/artes/` e confirmar Navbar/Footer compartilhados;
2. confirmar que `Artes` aparece ativo na Navbar;
3. confirmar masonry com imagens verticais/horizontais sem corte;
4. confirmar o logo pulsante do loader global enquanto uma imagem carrega;
5. confirmar busca/filtros e abertura do dialog;
6. selecionar `Artista`, pesquisar um nome que também apareça em título/tag e confirmar que somente o campo artista é considerado;
7. testar `artista:nome`, `titulo:texto`, `categoria:fanart` e `tag:comunidade`;
8. confirmar que erro de uma imagem não bloqueia as demais;
9. confirmar que a página funciona com Worker/API indisponíveis.

Para o Blog, confirmar também o mesmo padrão de busca por campo com `Título`,
`Resumo` e `Tags`, além dos prefixos `titulo:`, `resumo:` e `tag:`. A busca deve
ser insensível a maiúsculas/minúsculas e acentos. Alterações nessa UI não devem
exigir campos novos em `data/blog/posts.json` ou no front matter.


## CSP V48.0.2 e sanitização compartilhada

`validate-content.py` também verifica que toda página HTML versionada contém a CSP mínima da V48.0.2; que `frame-ancestors` e `upgrade-insecure-requests` não são declarados via meta CSP; que qualquer página com `footer.js` carrega `js/core/sanitize.js` antes dele; e que os consumidores conhecidos usam o `escapeHtml` compartilhado em vez de reintroduzir cópias locais. A ausência de `upgrade-insecure-requests` é intencional para manter o site testável via servidor HTTP local; produção continua servida em HTTPS. O validador também confirma a presença do caminho timing-safe usado na autenticação administrativa do Worker.
