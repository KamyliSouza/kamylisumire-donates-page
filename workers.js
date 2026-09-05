const STREAMLABS_API = 'https://streamlabs.com/api/v2.0';

function clientId(env) {
  return (env.STREAMLABS_CLIENT_ID || '').trim();
}
function clientSecret(env) {
  return (env.STREAMLABS_CLIENT_SECRET || '').trim();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return cors(env, new Response(null, { status: 204 }));
    }

    if (url.pathname === '/oauth/authorize') return handleAuthorize(url, env);
    if (url.pathname === '/oauth/callback') return handleCallback(url, env);
    if (url.pathname === '/debug/status') return handleDebugStatus(url, env);
    if (url.pathname === '/debug/sync') return handleDebugSync(url, env);

    return handleRanking(env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncDonations(env).catch((err) => env.RANKINGS.put('ranking:last_error', String(err.message)))
    );
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
// OAuth
// ---------------------------------------------------------------------
async function handleAuthorize(url, env) {
  if (url.searchParams.get('key') !== env.OAUTH_SETUP_TOKEN) {
    return new Response('Não autorizado', { status: 403 });
  }

  const authUrl = new URL(`${STREAMLABS_API}/authorize`);
  authUrl.searchParams.set('client_id', clientId(env));
  authUrl.searchParams.set('redirect_uri', env.REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'donations.read');

  return Response.redirect(authUrl.toString(), 302);
}

async function handleCallback(url, env) {
  const code = url.searchParams.get('code');
  if (!code) return new Response('Código ausente na URL', { status: 400 });

  const tokenRes = await fetch(`${STREAMLABS_API}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId(env),
      client_secret: clientSecret(env),
      redirect_uri: env.REDIRECT_URI,
      code
    })
  });

  const text = await tokenRes.text();
  if (!tokenRes.ok) return new Response('Falha:\n' + text, { status: 500 });

  await saveTokens(env, JSON.parse(text));

  let syncMessage = 'Sincronização executada com sucesso.';
  try {
    await syncDonations(env);
  } catch (err) {
    syncMessage = 'OAuth funcionou, mas a sincronização falhou: ' + err.message;
    await env.RANKINGS.put('ranking:last_error', String(err.message));
  }

  return new Response('Conectado!\n\n' + syncMessage, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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

  if (!accessToken || !refreshToken) throw new Error('Streamlabs não conectado.');

  if (Date.now() < expiresAt - 2 * 60 * 1000) return accessToken;

  const res = await fetch(`${STREAMLABS_API}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId(env),
      client_secret: clientSecret(env),
      redirect_uri: env.REDIRECT_URI,
      refresh_token: refreshToken
    })
  });

  if (!res.ok) throw new Error('Falha ao renovar token');

  const data = await res.json();
  await saveTokens(env, data);
  return data.access_token;
}

// ---------------------------------------------------------------------
// Sincronização com Separação por Datas
// ---------------------------------------------------------------------
async function syncDonations(env) {
  const accessToken = await getValidAccessToken(env);

  const lastId = Number((await env.RANKINGS.get('state:last_donation_id')) || 0);
  const now = new Date();
  const currentMonthKey = monthKey(now); 
  const storedMonthKey = await env.RANKINGS.get('state:current_month');

  let globalTotals = await getJSON(env, 'totals:global', {});
  let monthlyTotals = storedMonthKey === currentMonthKey
    ? await getJSON(env, 'totals:monthly', {})
    : {}; 

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
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!res.ok) throw new Error(`Erro API: ${res.status}`);

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
      
      // Converte a data da doação. O Streamlabs pode mandar Unix (segundos) ou ISO.
      let donationDate = new Date(); 
      if (donation.created_at) {
        const isUnix = typeof donation.created_at === 'number' || /^\d{10}$/.test(String(donation.created_at));
        donationDate = isUnix ? new Date(Number(donation.created_at) * 1000) : new Date(donation.created_at);
      }

      // Adiciona sempre ao global
      globalTotals[name] = (globalTotals[name] || 0) + amount;

      // Adiciona ao mensal APENAS se a doação ocorreu no mês e ano atuais
      if (monthKey(donationDate) === currentMonthKey) {
        monthlyTotals[name] = (monthlyTotals[name] || 0) + amount;
      }

      if (donation.donation_id > highestId) highestId = donation.donation_id;
    }

    await env.RANKINGS.put('totals:global', JSON.stringify(globalTotals));
    await env.RANKINGS.put('totals:monthly', JSON.stringify(monthlyTotals));
    await env.RANKINGS.put('state:last_donation_id', String(highestId));
  }

  await env.RANKINGS.put('state:current_month', currentMonthKey);
  await env.RANKINGS.put('ranking:monthly', JSON.stringify(getTopFive(monthlyTotals)));
  await env.RANKINGS.put('ranking:allTime', JSON.stringify(getTopFive(globalTotals)));
  await env.RANKINGS.put('ranking:updated_at', String(Date.now()));
  await env.RANKINGS.put('ranking:last_error', '');
}

// ---------------------------------------------------------------------
// Diagnóstico
// ---------------------------------------------------------------------
async function handleDebugStatus(url, env) {
  if (url.searchParams.get('key') !== env.OAUTH_SETUP_TOKEN) return new Response('Não autorizado', { status: 403 });
  return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
}

async function handleDebugSync(url, env) {
  if (url.searchParams.get('key') !== env.OAUTH_SETUP_TOKEN) return new Response('Não autorizado', { status: 403 });
  try {
    await syncDonations(env);
    return new Response('Sincronização rodou com sucesso.', { status: 200 });
  } catch (err) {
    return new Response('Erro:\n' + err.message, { status: 500 });
  }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function getTopFive(totals) {
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ 
        name, 
        amount: amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    }));
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getJSON(env, key, fallback) {
  const raw = await env.RANKINGS.get(key);
  return raw ? JSON.parse(raw) : fallback;
}

async function handleRanking(env) {
  const monthly = await getJSON(env, 'ranking:monthly', []);
  const allTime = await getJSON(env, 'ranking:allTime', []);

  return cors(env, new Response(JSON.stringify({ monthly, allTime }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=1800' 
    }
  }));
}
