# Produção

Runbook de publicação e configuração. Para entender como as peças se encaixam, veja
[`ARQUITETURA.md`](ARQUITETURA.md); para as regras de código do Worker, a seção "Worker" de
[`AGENTS.md`](../AGENTS.md).

## 1. Ambientes

| Ambiente | Endereço | Origem |
| --- | --- | --- |
| Site | `https://kamylisumire.com/` | branch `main` → GitHub Pages (`CNAME`) |
| API | `https://api.kamylisumire.com/` | Cloudflare Worker (`workers.js`) com Custom Domain |
| Preview | domínios `pages.dev` | branch `site-v2` → Cloudflare Pages |
| Gráficos | `https://assets.kamylisumire.com` | avatar, favicon, fundo e preview social |

- `_headers` aplica `X-Robots-Tag: noindex` aos domínios `pages.dev`; mantenha.
- Se o preview precisar consumir o ranking real, adicione a origem dele a `ALLOWED_ORIGINS`.
- Não existe `wrangler.toml`: variáveis, secrets, binding KV e Cron são configurados no painel
  (ou CLI) da Cloudflare.

## 2. Configuração do Worker

### Binding e Cron

| Item | Valor |
| --- | --- |
| Binding KV | `RANKINGS` (namespace do ranking e dos snapshots Twitch). **Não apague o namespace.** |
| Cron Trigger | `*/10 * * * *` (a cada 10 minutos; independe de fuso) |
| Custom Domain | `api.kamylisumire.com` |

O mesmo `scheduled()` roda o ranking de doações e as rotinas Twitch. Snapshots idênticos não são
regravados no KV, para preservar a cota diária de writes do plano Free.

### Variáveis (não secretas)

| Nome | Valor / observação |
| --- | --- |
| `REDIRECT_URI` | `https://api.kamylisumire.com/oauth/callback` (idêntico à Redirect URI da aplicação Streamlabs) |
| `ALLOWED_ORIGINS` | `https://kamylisumire.com` (lista separada por vírgula; `ALLOWED_ORIGIN` é aceita por compatibilidade). Sem nenhuma das duas, o Worker permite apenas `https://kamylisumire.com` e `https://www.kamylisumire.com`. Não use `*` em produção. |
| `TWITCH_CLIENT_ID` | Client ID da aplicação Twitch (não é segredo) |
| `TWITCH_CHANNEL_LOGIN` | `kamyli` |
| `TWITCH_MAX_VIDEOS` | `10` (opcional) |
| `RANKING_PRIVACY_LABEL` | rótulo público para nomes anonimizados; padrão `Anônimo` (opcional) |

### Segredos (nunca no Git)

| Nome | Observação |
| --- | --- |
| `STREAMLABS_CLIENT_ID` / `STREAMLABS_CLIENT_SECRET` | credenciais da aplicação Streamlabs |
| `TWITCH_CLIENT_SECRET` | secret da aplicação Twitch |
| `OAUTH_SETUP_TOKEN` | token administrativo; **mínimo de 32 caracteres** |
| `OAUTH_STATE_SECRET` | assina o `state` OAuth; **mínimo de 32 caracteres e diferente do token administrativo** |
| `RANKING_PRIVATE_NAMES` | nomes a anonimizar no ranking, separados por vírgula (ver [`PRIVACIDADE-RANKING.md`](PRIVACIDADE-RANKING.md)); fica fora do Git por conter dados de terceiros |
| Tokens OAuth | armazenados no KV; nunca os exponha |

Valores de segredos nunca devem ser colados em issues, commits, logs ou conversas.

### Configuração do frontend

`js/core/config.js` define a API: `useCustomDomain: true`,
`customDomainUrl: "https://api.kamylisumire.com"` e `fallbackToWorkersDev: true`. O validador exige
`useCustomDomain: true`. O `workers.dev` é contingência de transporte (falha de rede/timeout), não
repetição de erros HTTP.

## 3. Streamlabs OAuth

1. A aplicação Streamlabs deve usar **exatamente** `https://api.kamylisumire.com/oauth/callback` como
   Redirect URI, igual a `REDIRECT_URI` no Cloudflare (o Worker usa o mesmo valor na autorização e na
   troca/renovação de tokens).
2. Autorize (ou reautorize) apenas quando precisar criar/renovar a autorização:

   ```text
   https://api.kamylisumire.com/oauth/authorize?key=SEU_OAUTH_SETUP_TOKEN
   ```

   `?key=` só é aceito nesta rota. Nunca publique o valor real do token.
3. `/oauth/authorize` gera um `state` assinado por HMAC (`OAUTH_STATE_SECRET`), válido por 10 minutos,
   e grava um nonce `oauth:state:nonce:*` no KV. O callback consome o nonce **antes** de trocar o
   `code`; por isso o mesmo `state` não pode ser reutilizado. Fluxos iniciados antes de um deploy que
   mude esse mecanismo devem ser reiniciados.
4. Tokens já armazenados no KV não são apagados nem exigem nova autorização por mudanças de código
   do Worker; os estados legados são migrados automaticamente para chaves consolidadas.

## 4. Operação da Twitch

A aba Twitch da Home consulta `GET /twitch/videos` e o Hero consulta `GET /twitch/live`. Os dois
endpoints leem apenas cache/KV e **não chamam a Twitch durante a visita**.

| Dado | Renovação | Validade máxima |
| --- | --- | --- |
| VODs (`twitch:videos`) | após 20 h (Cron ou `/debug/twitch-sync`) | 24 h; vencido → `503` |
| Status ao vivo (`twitch:live`) | janela de 10 min (tolerância de até 2 min) | 20 min como "válido"; TTL do KV 30 min |
| App Access Token | revalidado em `/oauth2/validate` a cada 50 min | até expirar |
| `user_id` / login do canal | — | 24 h (TTL no KV) |

Primeiro preenchimento: chame `/debug/twitch-sync` com `Authorization: Bearer <OAUTH_SETUP_TOKEN>`.
Chamadas seguintes (e o Cron) são ignoradas até completarem 20 h. Passo a passo de implantação,
endpoints de diagnóstico e solução de problemas: [`TWITCH.md`](TWITCH.md).

## 5. Galeria de Artes e mídia

`/artes/` é estática e não usa Worker, KV, Streamlabs nem Twitch. Cada obra aponta para duas URLs
HTTPS externas (`preview` para a grade e `imagem` full, pedida apenas ao abrir o lightbox).

- Prefira um host de mídia estático controlado pelo projeto (por exemplo, `media.kamylisumire.com`);
  o contrato exige só URL HTTPS absoluta.
- **Não** use `workers.dev`, a API pública ou rotas do Worker como origem de imagens.
- `largura` e `altura` são opcionais, mas recomendadas para reduzir mudança de layout.
- Não publique previews, fulls, logos ou avatares dentro deste repositório.

## 6. Publicar uma alteração

1. Rode a validação completa ([`VALIDACAO.md`](VALIDACAO.md#1-comandos-locais)).
2. Faça o merge/push em `main` (site) ou `site-v2` (preview). A CI "Validate public site" roda em
   push e PR.
3. Se mudou `workers.js`, publique o Worker no Cloudflare (o GitHub Pages **não** o implanta) e
   confira `/debug/status`.
4. Se mudou segredos ou variáveis, faça um novo deploy do Worker para aplicá-los.
5. Rode o smoke test abaixo.

### Smoke test pós-deploy

1. A Home abre normalmente e a Navbar mostra os itens configurados.
2. `/doacoes/` abre LivePix/Pixie e o ranking mensal/geral aparece.
3. `https://api.kamylisumire.com/` retorna JSON de ranking.
4. DevTools (aba Network) mostra requisições a `api.kamylisumire.com` apenas em Doações e na Twitch da Home.
5. `/twitch/videos` e `/twitch/live` respondem sem autenticação e sem expor credenciais.
6. `/artes/`, `/agenda/`, `/jogos/` e `/blog/` abrem sem depender da API.
7. Com a API fora do ar (ou bloqueada no DevTools), a Home continua utilizável e o ranking
   mostra indisponibilidade em vez de dados vencidos.
