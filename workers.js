/**
 * Worker da API de doações da Kamyli Sumire
 * -----------------------------------------------------------------
 * Correções em relação à versão anterior:
 *   1. Trocado /api/v1.0/donations por /api/v2.0/donations — o token
 *      Bearer obtido via OAuth (client_id/secret + code) só funciona
 *      no v2.0. O v1.0 usa outro tipo de token, passado por query
 *      string (?access_token=...), não por header Authorization.
 *      Misturar os dois é a causa mais provável do ranking não vir.
 *   2. Fluxo OAuth completo (/oauth/authorize, /oauth/callback) que
 *      salva access_token + refresh_token no KV e renova sozinho
 *      quando o token expira — antes o Worker dependia de um único
 *      access_token colado à mão, que para de funcionar quando expira
 *      e ninguém percebe (a resposta simplesmente fica vazia).
 *   3. Checagem de erro na resposta do Streamlabs (antes, uma falha
 *      de autenticação virava silenciosamente um ranking vazio).
 *   4. Ranking agora é a SOMA de doações por doador (mensal e global),
 *      não apenas os 5 registros mais recentes da lista bruta.
 *
 * Variáveis de ambiente (wrangler secret put ...):
 *   STREAMLABS_CLIENT_ID
 *   STREAMLABS_CLIENT_SECRET
 *   OAUTH_SETUP_TOKEN   (senha sua, só pra proteger /oauth/authorize)
 *
 * Variáveis normais (wrangler.toml [vars]):
 *   REDIRECT_URI     ex: https://SEU-WORKER.workers.dev/oauth/callback
 *   ALLOWED_ORIGIN   ex: https://donate.kamylisumire.com
 *
 * Binding KV necessário: RANKINGS
 *   wrangler kv namespace create RANKINGS
 */

const STREAMLABS_API = 'https://streamlabs.com/api/v2.0';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return cors(env, new Response(null, { status: 204 }));
    }

    if (url.pathname === '/oauth/authorize') {
      return handleAuthorize(url, env);
    }

    if (url.pathname === '/oauth/callback') {
      return handleCallback(url, env);
    }

    // Qualquer outra rota (inclusive "/") devolve o ranking pronto,
    // igual ao comportamento que o ranking.js já espera.
    return handleRanking(env);
  },

  // Roda sozinho a cada 30 min (configurado no wrangler.toml)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncDonations(env));
  }
};

// ---------------------------------------------------------------------
function cors(env, response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(response.body, { status: response.status, headers });
}

// ---------------------------------------------------------------------
// OAuth passo 1: acesse manualmente 1x
//   https://SEU-WORKER.workers.dev/oauth/authorize?key=SEU_OAUTH_SETUP_TOKEN
// ---------------------------------------------------------------------
async function handleAuthorize(url, env) {
  if (url.searchParams.get('key') !== env.OAUTH_SETUP_TOKEN) {
    return new Response('Não autorizado', { status: 403 });
  }

  const authUrl = new URL(`${STREAMLABS_API}/authorize`);
  authUrl.searchParams.set('client_id', env.STREAMLABS_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'donations.read');

  return Response.redirect(authUrl.toString(), 302);
}

// ---------------------------------------------------------------------
// OAuth passo 2: troca o "code" por access_token + refresh_token
// ---------------------------------------------------------------------
async function handleCallback(url, env) {
  const code = url.searchParams.get('code');
  if (!code) return new Response('Código ausente na URL', { status: 400 });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.STREAMLABS_CLIENT_ID,
    client_secret: env.STREAMLABS_CLIENT_SECRET,
    redirect_uri: env.REDIRECT_URI,
    code
  });

  const tokenRes = await fetch(`${STREAMLABS_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const text = await tokenRes.text();
  if (!tokenRes.ok) {
    return new Response('Falha ao trocar o código por token:\n' + text, { status: 500 });
  }

  await saveTokens(env, JSON.parse(text));

  // Já dispara uma primeira sincronização pra não esperar o próximo Cron
  await syncDonations(env).catch(() => {});

  return new Response('Conectado ao Streamlabs com sucesso! Pode fechar esta aba.', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function saveTokens(env, tokenData) {
  const expiresAt = Date.now() + (Number(tokenData.expires_in) || 3600) * 1000;
  await env.RANKINGS.put('tokens:access', tokenData.access_token);
  await env.RANKINGS.put('tokens:refresh', tokenData.refresh_token);
  await env.RANKINGS.put('tokens:expires_at', String(expiresAt));
}

async function getValidAccessToken(env) {
  const accessToken = await env.RANKINGS.get('tokens:access');
  const refreshToken = await env.RANKINGS.get('tokens:refresh');
  const expiresAt = Number((await env.RANKINGS.get('tokens:expires_at')) || 0);

  if (!accessToken || !refreshToken) {
    throw new Error(
      'Streamlabs ainda não foi conectado (ou precisa reconectar). Acesse /oauth/authorize?key=... uma vez.'
    );
  }

  // Ainda válido (com 2 min de margem de segurança)
  if (Date.now() < expiresAt - 2 * 60 * 1000) {
    return accessToken;
  }

  // Expirado: renova automaticamente
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.STREAMLABS_CLIENT_ID,
    client_secret: env.STREAMLABS_CLIENT_SECRET,
    redirect_uri: env.REDIRECT_URI,
    refresh_token: refreshToken
  });

  const res = await fetch(`${STREAMLABS_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    throw new Error('Falha ao renovar o token do Streamlabs: ' + (await res.text()));
  }

  const data = await res.json();
  await saveTokens(env, data);
  return data.access_token;
}

// ---------------------------------------------------------------------
// Busca doações novas no Streamlabs e acumula os totais por doador
// ---------------------------------------------------------------------
async function syncDonations(env) {
  const accessToken = await getValidAccessToken(env);

  const lastId = Number((await env.RANKINGS.get('state:last_donation_id')) || 0);
  const currentMonthKey = monthKey(new Date());
  const storedMonthKey = await env.RANKINGS.get('state:current_month');

  let globalTotals = await getJSON(env, 'totals:global', {});
  let monthlyTotals = storedMonthKey === currentMonthKey
    ? await getJSON(env, 'totals:monthly', {})
    : {}; // virou o mês: zera o acumulado mensal

  let newDonations = [];
  let before = null;
  let keepPaging = true;

  while (keepPaging) {
    const apiUrl = new URL(`${STREAMLABS_API}/donations`);
    apiUrl.searchParams.set('limit', '100');
    apiUrl.searchParams.set('currency', 'BRL');
    if (before) apiUrl.searchParams.set('before', before);

    const res = await fetch(apiUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Streamlabs /donations retornou ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    const page = json.data || [];
    if (page.length === 0) break;

    for (const donation of page) {
      if (donation.donation_id <= lastId) {
        keepPaging = false;
        break;
      }
      newDonations.push(donation);
    }

    before = page[page.length - 1].donation_id;
    if (page.length < 100) keepPaging = false;
  }

  if (newDonations.length > 0) {
    let highestId = lastId;

    for (const donation of newDonations) {
      const name = (donation.name || 'Anônimo').trim();
      const amount = Number(donation.amount) || 0;

      globalTotals[name] = (globalTotals[name] || 0) + amount;
      monthlyTotals[name] = (monthlyTotals[name] || 0) + amount;

      if (donation.donation_id > highestId) highestId = donation.donation_id;
    }

    await env.RANKINGS.put('totals:global', JSON.stringify(globalTotals));
    await env.RANKINGS.put('totals:monthly', JSON.stringify(monthlyTotals));
    await env.RANKINGS.put('state:last_donation_id', String(highestId));
  }

  await env.RANKINGS.put('state:current_month', currentMonthKey);
  await env.RANKINGS.put('ranking:monthly', JSON.stringify(topTen(monthlyTotals)));
  await env.RANKINGS.put('ranking:allTime', JSON.stringify(topTen(globalTotals)));
  await env.RANKINGS.put('ranking:updated_at', String(Date.now()));
  await env.RANKINGS.put('ranking:last_error', '');
}

function topTen(totals) {
  return Object.entries(totals)
    .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getJSON(env, key, fallback) {
  const raw = await env.RANKINGS.get(key);
  return raw ? JSON.parse(raw) : fallback;
}

// ---------------------------------------------------------------------
// Endpoint público — só lê o que o Cron já deixou pronto no KV.
// Nunca chama o Streamlabs diretamente, então pode ser consultado à
// vontade pelo site sem risco de bater cota nenhuma.
// ---------------------------------------------------------------------
async function handleRanking(env) {
  const monthly = await getJSON(env, 'ranking:monthly', []);
  const allTime = await getJSON(env, 'ranking:allTime', []);

  return cors(env, new Response(JSON.stringify({ monthly, allTime }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=1800' // 30 min de cache na borda da Cloudflare
    }
  }));
}
