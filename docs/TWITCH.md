# Integração Twitch

Guia de implantação e operação da integração Twitch: **VODs** na aba Twitch de "Últimas lives" e
**status ao vivo** no Hero da Home. O site não oferece uma página independente de transmissão nem
incorpora player/chat da Twitch ou do YouTube: a reprodução ocorre nas plataformas oficiais, por links externos.
As regras de código estão em [`AGENTS.md`](../AGENTS.md) (seção "Worker › Twitch") e as
variáveis gerais do Worker em [`PRODUCAO.md`](PRODUCAO.md).

## 1. Como funciona

```text
Twitch Helix (/videos, /streams)
        ↓  somente via Worker: Cron, /debug/twitch-sync, /debug/twitch-live-sync
Cloudflare Worker ── KV RANKINGS ──┬─ twitch:videos, twitch:updated_at
                                   └─ twitch:live
        ↓
GET /twitch/videos   GET /twitch/live        (públicos, leem só cache/KV)
        ↓
Home: aba Twitch (padrão) e Hero ao vivo
```

Regras:

- os endpoints públicos **nunca** chamam a API da Twitch; todos os visitantes recebem o mesmo snapshot;
- **VODs:** `syncTwitchVideosIfDue()` consulta o KV antes de qualquer atualização. Antes de 20 h desde
  `twitch:updated_at` a sincronização é ignorada; entre 20 h e 24 h o snapshot continua público enquanto
  a renovação é tentada. O snapshot tem TTL de 24 h e **nunca é entregue com 24 h ou mais**: se a
  renovação falhar após a expiração, o endpoint responde `503` com `Cache-Control: no-store`, a aba
  Twitch mostra indisponibilidade e a aba YouTube segue funcionando. Falha da Twitch não apaga o
  último snapshot válido;
- **Ao vivo:** `syncTwitchLiveIfDue()` consulta `helix/streams` no máximo uma vez a cada 10 min
  (tolerância intencional de até 2 min). O snapshot `twitch:live` tem TTL de 30 min e, sem atualização
  por 20 min, `/twitch/live` responde `503` e o Hero volta ao padrão;
- `/twitch/live` usa `caches.default` por 60 s, só para reduzir leituras do KV;
- a resposta HTTP de `/twitch/videos` é cacheada pelo navegador até a próxima atualização prevista.

### Chamadas externas

Na primeira inicialização o Worker faz, normalmente, três chamadas: obter o App Access Token, resolver
uma vez o `user_id` do canal e buscar `helix/videos`. Depois reutiliza o token e o `user_id`/login
(no máximo 24 h no KV). O token é validado em `https://id.twitch.tv/oauth2/validate` a cada 50 min e
renovado por Client Credentials quando expira ou é invalidado; qualquer `401` do Helix descarta o token
local e permite um único retry com token novo. Nada disso acontece por visita.

## 2. Implantação (primeira vez)

### 2.1 Criar a aplicação na Twitch

No [Twitch Developer Console](https://dev.twitch.tv/console) registre uma aplicação
(docs: [registrar app](https://dev.twitch.tv/docs/authentication/register-app),
[tokens](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth),
[API de vídeos](https://dev.twitch.tv/docs/api/videos)). A integração usa **Client Credentials**:
não pede autorização aos visitantes nem login da Kamyli. A Twitch exige uma OAuth Redirect URL no
cadastro; como não há callback de usuário, use uma URL HTTPS sob seu controle (por exemplo
`https://kamylisumire.com/`). Copie o **Client ID** e o **Client Secret** (em **Manage**).

### 2.2 Configurar o Worker

Cloudflare Dashboard → Workers & Pages → Worker de `api.kamylisumire.com` → Settings →
Variables and Secrets.

| Nome | Tipo | Valor |
| --- | --- | --- |
| `TWITCH_CLIENT_ID` | variável | Client ID |
| `TWITCH_CHANNEL_LOGIN` | variável | `kamyli` |
| `TWITCH_MAX_VIDEOS` | variável (opcional) | inteiro de 1 a 20; padrão 10 |
| `TWITCH_CLIENT_SECRET` | **secret** | Client Secret |

Não altere as configurações existentes (`OAUTH_SETUP_TOKEN`, `OAUTH_STATE_SECRET`,
`STREAMLABS_CLIENT_ID`, `STREAMLABS_CLIENT_SECRET`, `REDIRECT_URI`, `ALLOWED_ORIGINS`,
`RANKING_PRIVATE_NAMES`, `RANKING_PRIVACY_LABEL`) nem o binding KV `RANKINGS`: a Twitch o reutiliza
com chaves `twitch:*`. `ALLOWED_ORIGINS` deve incluir a origem da Home (`https://kamylisumire.com`;
acrescente `www` ou previews separados por vírgula se também consumirem a API real).

### 2.3 Cron Trigger

Workers & Pages → Worker → Settings → Triggers → Cron Triggers:

```text
*/10 * * * *
```

O `scheduled()` roda três rotinas independentes: status ao vivo (a cada 10 min), VODs (uma vez a cada
20 h) e ranking Streamlabs (snapshots idênticos não são regravados). O status ao vivo faz cerca de 144
writes/dia no KV, e o ranking não gasta writes quando nada mudou, o que importa no plano Free.

### 2.4 Publicar, inicializar e testar

Ordem segura (evita publicar uma aba Twitch sem snapshot):

1. criar a app Twitch e configurar as variáveis;
2. publicar o `workers.js` atual no Worker;
3. rodar `/debug/twitch-sync` e `/debug/twitch-live-sync?force=1`;
4. testar `/twitch/videos`, `/twitch/live` e `/debug/status`;
5. configurar o Cron;
6. publicar o frontend e abrir a Home.

Rotas `/debug/*` exigem `Authorization: Bearer <OAUTH_SETUP_TOKEN>` (`?key=` não funciona nelas).

```bash
curl -H "Authorization: Bearer SEU_OAUTH_SETUP_TOKEN" \
  https://api.kamylisumire.com/debug/twitch-sync
```

```powershell
Invoke-RestMethod `
  -Uri "https://api.kamylisumire.com/debug/twitch-live-sync?force=1" `
  -Headers @{ Authorization = "Bearer SEU_OAUTH_SETUP_TOKEN" }
```

Primeira execução bem-sucedida de `/debug/twitch-sync`:

```json
{ "status": "ok", "updated": true, "videoCount": 10, "updatedAt": "...", "nextRefreshAt": "..." }
```

Nova chamada antes de 20 h (nenhuma consulta à Twitch é feita):

```json
{ "status": "ok", "updated": false, "reason": "cache_fresh" }
```

## 3. Endpoints públicos

`GET https://api.kamylisumire.com/twitch/videos`:

```json
{
  "platform": "twitch",
  "channelUrl": "https://www.twitch.tv/kamyli",
  "videos": [
    { "id": "...", "title": "...", "url": "https://www.twitch.tv/videos/...",
      "thumbnail": "https://...", "date": "YYYY-MM-DD", "duration": "..." }
  ],
  "updatedAt": "...", "refreshAfter": "...", "stale": false
}
```

Confira que os vídeos são do canal `kamyli`, do mais recente para o mais antigo, VODs de transmissão
(`type=archive`), com thumbnails carregando e `stale: false` logo após sincronizar.

`GET /twitch/live`: offline → `200` com `live: false`; online → `200` com `live: true`, título,
categoria, espectadores, horário de início, thumbnail e URL; sem snapshot válido → `503`.

Os cards de thumbnail recebem nova revisão quando `checkedAt`/`updatedAt` muda, sem aumentar as
consultas ao Helix.

## 4. Diagnóstico

```bash
curl -H "Authorization: Bearer SEU_OAUTH_SETUP_TOKEN" https://api.kamylisumire.com/debug/status
```

A seção `twitch` informa `configured`, `videoCount`, `updatedAt`, `nextRefreshAt`, `refreshDue`,
`staleAt`, `stale`, `lastError` e `tokenValidation` (`validatedAt`, `validationDue`). Nenhuma dessas
verificações chama a Twitch.

### Chaves KV usadas

```text
twitch:videos, twitch:updated_at, twitch:last_error      (VODs)
twitch:live, twitch:live_last_error                      (status ao vivo)
twitch:app_access_token_state, twitch:user_state         (estado consolidado; TTL de 24 h no usuário)
```

Chaves antigas (`twitch:app_access_token*`, `twitch:user_id`, `twitch:user_login`) só são lidas como
fallback de migração; não é preciso criar nem limpar nada manualmente.

## 5. Como a Home se comporta

- "Últimas lives" tem as abas **Twitch** (padrão, busca `/twitch/videos`, link superior "Abrir na
  Twitch") e **YouTube** (vídeos de `data/content/lives.json`, sem API do Google, link "Abrir no YouTube").
- Se o Worker estiver fora do ar, a Home continua abrindo: a aba Twitch mostra indisponibilidade e o
  YouTube permanece disponível.
- Trocar de aba ou recarregar a Home **não** dispara sincronização Twitch.
- O Hero mostra `Sobre | Ao vivo` (iniciando em `Ao vivo`), anel no avatar e selo `AO VIVO` somente
  com `live: true`; a aba `Sobre` restaura o conteúdo normal.

## 6. Smoke test de produção

1. `/twitch/videos` responde JSON e `/debug/status` mostra `twitch.configured: true`;
2. Twitch é a primeira aba da Home e os cards abrem os VODs corretos;
3. a aba YouTube mantém a lista manual;
4. alternar Twitch → YouTube → Twitch e recarregar não consulta o Helix novamente;
5. `/debug/twitch-sync` antes de 20 h retorna `cache_fresh`;
6. offline: `/twitch/live` tem `live: false` e a Home mantém o Hero padrão; online: o Hero mostra o
   estado ao vivo;
7. uma segunda sincronização ao vivo antes de 10 min retorna `cache_fresh` sem chamar `helix/streams`;
8. o ranking de doações segue funcional; Blog, Agenda, Navbar, Footer e loader também.

## 7. Segurança

Nunca publique `TWITCH_CLIENT_SECRET`, `OAUTH_SETUP_TOKEN`, `OAUTH_STATE_SECRET` nem o App Access
Token armazenado no KV. O `TWITCH_CLIENT_ID` não é tratado como segredo pela Twitch, mas fica na
configuração do Worker para manter a integração centralizada. O frontend recebe só os campos públicos
necessários para exibir os VODs e o status.

## 8. Rollback

Se algo falhar após o deploy: reverta o commit da Home (a Home volta às lives manuais do YouTube) e,
se necessário, o Worker. As chaves `twitch:*` podem permanecer, pois não interferem no ranking. **Não
apague o binding `RANKINGS`**: ele também guarda o ranking e os tokens da Streamlabs.

## 9. Observação sobre custo

Um visitante novo ainda faz uma requisição ao Worker para obter o snapshot, mas ela lê só cache/KV e
não toca a API da Twitch. Zero invocações do Worker exigiria publicar o resultado como arquivo estático
no site, o que seria outra arquitetura.
