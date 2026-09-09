# Guia de implantação — V47.4 Twitch em Lives

Este guia parte da base **V47.3 revisada** e aplica a integração Twitch da **V47.4**.

## Objetivo

A seção **Lives** mantém o mesmo carrossel e o mesmo desenho dos cards, mas passa a ter duas abas:

1. **Twitch** — aba primária, atualizada automaticamente;
2. **YouTube** — aba secundária, mantendo os vídeos cadastrados manualmente em `data/content/lives.json`.

A Twitch não é consultada quando um visitante abre a página. O navegador consulta apenas o seu Cloudflare Worker, e o Worker devolve um snapshot já salvo no KV.

## Como o limite de 24 horas funciona

A implementação usa uma barreira no servidor:

```text
Twitch Helix /videos
        ↓
(no máximo uma consulta de vídeos por janela de 24 h)
        ↓
Cloudflare Worker
        ↓
KV RANKINGS
  twitch:videos
  twitch:updated_at
        ↓
GET /twitch/videos
        ↓
Home / aba Twitch
```

Regras:

- `GET /twitch/videos` **nunca** chama a API da Twitch;
- `syncTwitchVideosIfDue()` consulta o KV antes de qualquer atualização;
- se ainda não passaram 24 horas desde `twitch:updated_at`, a sincronização é ignorada;
- o Cron pode continuar rodando com a frequência já necessária para o ranking de doações;
- em falha da Twitch, o snapshot anterior não é apagado;
- a resposta HTTP ao navegador é cacheada até a próxima janela de atualização, reduzindo novas chamadas ao Worker pelo mesmo navegador.

### Quantas chamadas externas são feitas

Na primeira inicialização, normalmente são necessárias três chamadas ao ecossistema Twitch:

1. obter o App Access Token;
2. resolver uma vez o `user_id` de `kamyli`;
3. buscar os vídeos em `helix/videos`.

Depois disso, o Worker guarda o token e o `user_id` no KV. Enquanto o token continuar válido, o ciclo normal de 24 horas faz **uma única chamada a `helix/videos`**.

Quando o App Access Token expirar, haverá também uma chamada ao endpoint OAuth da Twitch para gerar um novo token. Isso é necessário para continuar usando a API e não ocorre a cada visita nem a cada atualização normal.

## 1. Criar uma aplicação na Twitch

Acesse o Twitch Developer Console e registre uma aplicação.

Documentação oficial:

- https://dev.twitch.tv/docs/authentication/register-app
- https://dev.twitch.tv/docs/authentication/getting-tokens-oauth
- https://dev.twitch.tv/docs/api/videos

A integração usa **Client Credentials / App Access Token**, portanto não pede autorização aos visitantes e não exige login da Kamyli durante o uso normal do site.

No cadastro:

- use um nome identificável, por exemplo `Kamyli Sumire Site`;
- a Twitch exige uma OAuth Redirect URL no cadastro da aplicação; como esta integração usa Client Credentials e não usa callback de usuário, você pode cadastrar uma URL HTTPS sob seu controle, por exemplo `https://kamylisumire.com/`;
- escolha a categoria mais adequada para uma integração web;
- conclua o cadastro e abra **Manage**.

Copie:

```text
Client ID
Client Secret
```

O **Client Secret nunca deve ser colocado no Git, HTML, JSON ou JavaScript do site**.

## 2. Configurar as variáveis no Cloudflare Worker

No Cloudflare Dashboard:

```text
Workers & Pages
→ selecione o Worker de api.kamylisumire.com
→ Settings
→ Variables and Secrets
```

Configure:

### Variáveis normais

```text
TWITCH_CLIENT_ID=<seu Client ID>
TWITCH_CHANNEL_LOGIN=kamyli
TWITCH_MAX_VIDEOS=10
```

`TWITCH_MAX_VIDEOS` é opcional. O Worker aceita de 1 a 20 e usa 10 como padrão.

### Secret

```text
TWITCH_CLIENT_SECRET=<seu Client Secret>
```

Selecione o tipo **Secret** para `TWITCH_CLIENT_SECRET`.

Não altere/remova as configurações já existentes do projeto, incluindo:

```text
OAUTH_SETUP_TOKEN
STREAMLABS_CLIENT_ID
STREAMLABS_CLIENT_SECRET
REDIRECT_URI
ALLOWED_ORIGINS
RANKING_PRIVATE_NAMES
RANKING_PRIVACY_LABEL (se usado)
```

O binding KV continua sendo:

```text
RANKINGS
```

A integração Twitch reutiliza esse binding e cria chaves com prefixo `twitch:`.

## 3. Confirmar CORS

A Home agora consulta `https://api.kamylisumire.com/twitch/videos`.

`ALLOWED_ORIGINS` precisa incluir o domínio da Home, por exemplo:

```text
https://kamylisumire.com
```

Se também usar `www` ou preview Cloudflare Pages para testar a API real, adicione essas origens explicitamente separadas por vírgula.

Exemplo:

```text
https://kamylisumire.com,https://www.kamylisumire.com
```

## 4. Publicar o novo `workers.js`

Substitua o código do Worker pelo arquivo `workers-V47.4.js` entregue junto com este patch e publique a nova versão.

A V47.4 acrescenta:

```text
GET /twitch/videos
GET /debug/twitch-sync
```

E amplia:

```text
GET /debug/status
scheduled()
```

Rotas existentes de Streamlabs/ranking permanecem compatíveis.

## 5. Inicializar o cache da Twitch

Após publicar o Worker e configurar as variáveis, execute uma sincronização manual.

### Opção recomendada: Bearer

```bash
curl \
  -H "Authorization: Bearer SEU_OAUTH_SETUP_TOKEN" \
  https://api.kamylisumire.com/debug/twitch-sync
```

Na primeira execução, uma resposta bem-sucedida se parece com:

```json
{
  "status": "ok",
  "updated": true,
  "videoCount": 10,
  "updatedAt": "...",
  "nextRefreshAt": "..."
}
```

Se chamar novamente antes de 24 horas, a resposta deve indicar que o cache ainda está fresco:

```json
{
  "status": "ok",
  "updated": false,
  "reason": "cache_fresh"
}
```

Nesse caso **nenhuma consulta de vídeos é feita à Twitch**.

### Pelo navegador

O fallback `?key=` continua aceito para compatibilidade administrativa:

```text
https://api.kamylisumire.com/debug/twitch-sync?key=SEU_OAUTH_SETUP_TOKEN
```

Prefira Bearer quando possível para não colocar o token na URL/histórico.

## 6. Testar o endpoint público

Abra:

```text
https://api.kamylisumire.com/twitch/videos
```

A resposta esperada contém:

```json
{
  "platform": "twitch",
  "channelUrl": "https://www.twitch.tv/kamyli",
  "videos": [
    {
      "id": "...",
      "title": "...",
      "url": "https://www.twitch.tv/videos/...",
      "thumbnail": "https://...",
      "date": "YYYY-MM-DD",
      "duration": "..."
    }
  ],
  "updatedAt": "...",
  "refreshAfter": "...",
  "stale": false
}
```

Verifique que:

- os vídeos são realmente do canal `kamyli`;
- aparecem do mais recente para o mais antigo;
- são VODs de transmissões (`type=archive`);
- thumbnails carregam corretamente;
- `stale` está `false` logo após a sincronização.

## 7. Conferir o diagnóstico

Use:

```bash
curl \
  -H "Authorization: Bearer SEU_OAUTH_SETUP_TOKEN" \
  https://api.kamylisumire.com/debug/status
```

A seção `twitch` informa:

```text
configured
videoCount
updatedAt
nextRefreshAt
refreshDue
lastError
```

Nenhuma dessas verificações chama a Twitch.

## 8. Cron Trigger — V47.4.3

A V47.4.3 adiciona o status ao vivo do Hero. Para que o site perceba o início
ou fim de uma transmissão com atraso de aproximadamente 10 minutos, configure
o Cron Trigger do Worker como:

```text
*/10 * * * *
```

No Cloudflare Dashboard:

```text
Workers & Pages
→ Worker
→ Settings
→ Triggers
→ Cron Triggers
```

O `scheduled()` executa três rotinas, cada uma com seu próprio comportamento:

- **status ao vivo:** `syncTwitchLiveIfDue()` consulta `helix/streams` no máximo
  uma vez a cada 10 minutos;
- **VODs:** `syncTwitchVideosIfDue()` continua consultando `helix/videos` no
  máximo uma vez a cada 24 horas;
- **ranking Streamlabs:** continua verificando novas doações, mas snapshots
  idênticos deixam de ser regravados no KV quando nada mudou.

Isso é importante no Workers KV Free: o status ao vivo usa um único write por
sincronização bem-sucedida (cerca de 144/dia), enquanto o ranking deixa de
gastar writes quando nada mudou e não regrava o marcador legado
`ranking:updated_at`.

O endpoint público `/twitch/live` usa `caches.default` por 60 segundos. Assim,
visitas repetidas atendidas pelo mesmo data center não precisam executar uma
leitura KV a cada acesso. O cache é apenas de leitura pública; ele não aumenta
a frequência de chamadas à Twitch.

Cron Triggers do Cloudflare usam UTC, mas `*/10 * * * *` independe de fuso.

### Inicializar/testar o status ao vivo

Depois de publicar o Worker V47.4.3, execute uma vez:

```powershell
Invoke-RestMethod `
  -Uri "https://api.kamylisumire.com/debug/twitch-live-sync?force=1" `
  -Headers @{ Authorization = "Bearer SEU_OAUTH_SETUP_TOKEN" }
```

Depois confira:

```text
https://api.kamylisumire.com/twitch/live
```

Offline, a resposta válida possui `live: false`. Online, possui `live: true` e
inclui título, categoria, espectadores, horário de início, thumbnail e URL.
Se o snapshot não for atualizado por 20 minutos, a rota retorna `503` e a Home
mostra o Hero padrão, evitando manter um falso estado de live.

## 9. Publicar o frontend V47.4.3

Somente depois de o endpoint público da Twitch estar funcionando, publique o patch do site.

A ordem segura é:

```text
1. Criar app Twitch
2. Configurar TWITCH_* no Cloudflare
3. Publicar workers.js V47.4.3
4. Rodar /debug/twitch-sync
5. Rodar /debug/twitch-live-sync?force=1
6. Testar /twitch/videos e /twitch/live
7. Testar /debug/status
8. Configurar Cron */10 * * * *
9. Publicar frontend V47.4.3
10. Abrir a Home e testar Hero + abas de Lives
```

Isso evita publicar uma aba Twitch que ainda não possui snapshot no KV.

## 10. Como a Home fica

Ao abrir a página:

```text
Últimas lives

[Twitch] [YouTube]
```

Twitch começa selecionada.

### Aba Twitch

- busca `/twitch/videos`;
- usa os mesmos cards, carrossel, hover, responsividade e navegação da seção atual;
- abre cada VOD diretamente na Twitch;
- o link superior muda para `Abrir na Twitch`.

### Aba YouTube

- usa os vídeos já cadastrados em `data/content/lives.json`;
- continua sem API Google;
- monta thumbnail oficial do YouTube e link direto;
- o link superior muda para `Abrir no YouTube`.

Se o Worker estiver fora do ar, a Home continua abrindo. A aba Twitch mostra uma mensagem de indisponibilidade e a aba YouTube permanece disponível.

## 11. Cache e custo

Existem duas camadas diferentes:

### Cache global de dados — KV

É o que protege a Twitch:

```text
twitch:videos
twitch:updated_at
```

Todos os visitantes recebem o mesmo snapshot.

### Cache HTTP do navegador

`/twitch/videos` responde com `Cache-Control` calculado até a próxima atualização prevista. Assim, o mesmo navegador normalmente não chama nem o Worker novamente enquanto a cópia recebida ainda estiver fresca.

Um visitante novo ainda precisa fazer uma requisição ao Worker para obter o snapshot. Essa requisição é barata e lê somente KV; ela **não** toca a API da Twitch.

Garantir literalmente zero invocações do Worker para visitantes exigiria transformar o resultado em um arquivo estático publicado no próprio site, o que seria outra arquitetura. A V47.4 mantém a centralização atual no Cloudflare Worker e elimina as consultas redundantes à Twitch.

## 12. Chaves KV criadas pela integração

```text
twitch:app_access_token
twitch:app_access_token_expires_at
twitch:user_login
twitch:user_id
twitch:videos
twitch:updated_at
twitch:last_error
```

Não é necessário criar essas chaves manualmente.

## 13. Segurança

Nunca publicar:

```text
TWITCH_CLIENT_SECRET
OAUTH_SETUP_TOKEN
App Access Token armazenado no KV
```

`TWITCH_CLIENT_ID` não é tratado pela Twitch como segredo, mas mantê-lo na configuração do Worker deixa a integração centralizada.

O frontend recebe somente os campos públicos necessários para exibir os VODs.

## 14. Testes locais do repositório

Antes de enviar para `main`:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
node --check workers.js
git diff --check
```

Resultado esperado:

```text
Validação concluída: 0 erros, 0 aviso(s).
```

## 15. Smoke test de produção

Depois do deploy:

1. `https://api.kamylisumire.com/twitch/videos` responde JSON;
2. `/debug/status` mostra `twitch.configured: true`;
3. Twitch é a primeira aba da Home;
4. cards da Twitch abrem VODs corretos;
5. a aba YouTube continua exibindo a lista manual;
6. trocar Twitch → YouTube → Twitch não consulta Helix novamente;
7. recarregar a Home não provoca uma nova sincronização Twitch;
8. `/debug/twitch-sync` chamado novamente antes de 24 h retorna `cache_fresh`;
9. ranking de doações continua funcional;
10. Blog, Agenda, Navbar, Footer e loader permanecem funcionais.

## 16. Rollback

Se a Twitch apresentar qualquer problema depois do deploy:

1. reverta apenas o commit/patch V47.4 no frontend;
2. a V47.3 volta a mostrar apenas as Lives manuais do YouTube;
3. as chaves `twitch:*` no KV podem permanecer — elas não interferem no ranking;
4. o Worker V47.4 também pode ser revertido sem alterar as chaves Streamlabs/ranking existentes.

Não apague o binding `RANKINGS`, pois ele também contém dados do ranking e tokens do Streamlabs.

## Atualização V47.4.1 — expiração rígida e privacidade

A V47.4.1 endurece a política de cache da Twitch:

- `twitch:videos` usa `expirationTtl: 86400` no KV;
- `/twitch/videos` nunca entrega conteúdo com 24 horas ou mais;
- se a atualização falhar após a expiração, o endpoint retorna `503` e `Cache-Control: no-store`;
- o frontend mostra o estado de indisponibilidade da Twitch e o YouTube continua acessível;
- a nova página `/privacidade/` documenta Twitch, Streamlabs, Cloudflare e armazenamento local.

Depois de publicar o Worker V47.4.1, execute `/debug/twitch-sync` uma vez para garantir um snapshot fresco e confirme que `/twitch/videos` retorna `stale: false`.
