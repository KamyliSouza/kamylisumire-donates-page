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
- a Home continua sem carregar a API.

No Cloudflare Worker, configure:

```text
REDIRECT_URI=https://api.kamylisumire.com/oauth/callback
ALLOWED_ORIGINS=https://kamylisumire.com
```

`REDIRECT_URI` e `ALLOWED_ORIGINS` não são segredos.

Continuam sensíveis e fora do Git:

- `STREAMLABS_CLIENT_SECRET`;
- `OAUTH_SETUP_TOKEN`;
- tokens OAuth armazenados no KV;
- demais credenciais privadas.

## Streamlabs OAuth

A aplicação Streamlabs deve usar exatamente:

`https://api.kamylisumire.com/oauth/callback`

como Redirect/Redirection URI.

O Worker usa `env.REDIRECT_URI` na autorização e também na troca/renovação
de tokens, por isso Cloudflare e Streamlabs devem estar idênticos.

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
