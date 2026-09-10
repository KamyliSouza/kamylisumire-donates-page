# Produção

## Produção pública

Site:

`https://kamylisumire.com/`

API:

`https://api.kamylisumire.com/`

A branch de produção é `main`, publicada pelo GitHub Pages.

## Preview

A branch `site-v2` é usada como preview Cloudflare Pages.
`_headers` deve continuar aplicando `X-Robots-Tag`/noindex aos domínios
`pages.dev`.

Se o preview precisar consumir o ranking real, adicione sua origem
explicitamente a `ALLOWED_ORIGINS`.

## Assets

Gráficos públicos usam `https://assets.kamylisumire.com`.

## Backend do ranking

A configuração do frontend está em `js/core/config.js`.

Na V44.4:

- `api.kamylisumire.com` é a origem primária;
- `workers.dev` permanece como fallback temporário;
- a Home usa a API somente para VODs da aba Twitch e status ao vivo do Hero; o restante continua independente e mantém fallback local/visual.

No Cloudflare Worker, configure:

```text
REDIRECT_URI=https://api.kamylisumire.com/oauth/callback
ALLOWED_ORIGINS=https://kamylisumire.com
TWITCH_CHANNEL_LOGIN=kamyli
TWITCH_MAX_VIDEOS=10
```

`REDIRECT_URI` e `ALLOWED_ORIGINS` não são segredos.

Na V47.4.5, se `ALLOWED_ORIGINS` e a compatibilidade `ALLOWED_ORIGIN` estiverem
ausentes, o Worker usa como fallback seguro apenas `https://kamylisumire.com`
e `https://www.kamylisumire.com`. Não use `*` em produção; wildcard só deve ser
configurado explicitamente em ambiente temporário de teste.

Continuam sensíveis e fora do Git:

- `STREAMLABS_CLIENT_SECRET`;
- `TWITCH_CLIENT_SECRET`;
- `OAUTH_SETUP_TOKEN`;
- tokens OAuth armazenados no KV;
- demais credenciais privadas.

## Streamlabs OAuth

A aplicação Streamlabs deve usar exatamente:

`https://api.kamylisumire.com/oauth/callback`

como Redirect/Redirection URI.

O Worker usa `env.REDIRECT_URI` na autorização e também na troca/renovação
de tokens, por isso Cloudflare e Streamlabs devem estar idênticos.

Desde a V47.4.5, `/oauth/authorize` também gera um `state` assinado por HMAC,
com validade de 10 minutos, e `/oauth/callback` rejeita estado ausente,
adulterado ou vencido. Não é necessária nova variável: `OAUTH_SETUP_TOKEN` é
reutilizado apenas como chave interna de assinatura.

Após a mudança, faça uma nova autorização pelo domínio novo:

```text
https://api.kamylisumire.com/oauth/authorize?key=SEU_OAUTH_SETUP_TOKEN
```

Nunca publicar ou compartilhar o valor real de `OAUTH_SETUP_TOKEN`.

## Ordem de migração V44.4

1. adicionar `api.kamylisumire.com` como Custom Domain do Worker;
2. confirmar DNS/TLS;
3. atualizar `REDIRECT_URI` no Cloudflare;
4. atualizar a Redirect URI da aplicação Streamlabs;
5. reautorizar pelo novo domínio;
6. testar ranking e diagnóstico;
7. publicar a V44.4 na `main`;
8. manter `fallbackToWorkersDev: true` durante a estabilização.

## Checklist

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check
```

O validador V44.3 pode emitir o aviso de que `useCustomDomain` não está
`false`. Na V44.4 isso é deliberado e o aviso não representa falha.

Smoke test:

1. Home abre normalmente.
2. `/doacoes/` abre LivePix/Pixie.
3. `https://api.kamylisumire.com/` retorna JSON.
4. DevTools mostra a requisição para `api.kamylisumire.com`.
5. Console registra `API atendida por: https://api.kamylisumire.com`.
6. ranking mensal/geral permanece funcional.
7. fallback/cache continua seguro em falha remota.

## Twitch V47.4

A aba Twitch da Home consulta `GET /twitch/videos`. O Hero consulta
`GET /twitch/live`. Ambos os endpoints públicos leem somente cache/KV e
**não consultam a Twitch durante a visita**.

Configure no Worker:

```text
TWITCH_CLIENT_ID=<Client ID da aplicação Twitch>
TWITCH_CLIENT_SECRET=<Secret da aplicação Twitch>
TWITCH_CHANNEL_LOGIN=kamyli
TWITCH_MAX_VIDEOS=10
```

Desde a V47.4.7, o Worker usa Cache API também para o ranking e `/twitch/videos`
antes de consultar o KV. Não é necessária configuração adicional no painel para
essa camada. O deploy também migra automaticamente os estados OAuth/cache
legados para chaves consolidadas; não apague o namespace `RANKINGS` e não é
necessário reautorizar a Streamlabs apenas por causa dessa atualização.

O primeiro preenchimento é feito por `/debug/twitch-sync`. Chamadas posteriores
a esse endpoint e execuções do Cron são ignoradas enquanto não tiverem passado
24 horas desde `twitch:updated_at`. O App Access Token é reutilizado no KV, mas
é validado no endpoint oficial `/oauth2/validate` em janelas de 50 minutos; o
`user_id` e o login do canal usam TTL de 24 horas e são resolvidos novamente
quando expirarem.

Desde a V47.4.3, configure o Cron para executar a cada 10 minutos:

```text
*/10 * * * *
```

`syncTwitchLiveIfDue()` impede chamadas a `helix/streams` antes de completar
a janela nominal de 10 minutos, com tolerância intencional de até 2 minutos.
`syncTwitchVideosIfDue()` continua impondo 24 horas para VODs. O ranking de doações também roda no mesmo `scheduled()`, mas a
V47.4.3 deixa de regravar snapshots idênticos no KV quando não há doação nova
nem virada de mês, evitando consumir a cota diária de writes do plano Free.
