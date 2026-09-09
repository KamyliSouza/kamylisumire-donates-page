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
      return cors(request, env, new Response(null, { status: 204 }));
    }

    if (url.pathname === '/oauth/authorize') return handleAuthorize(request, url, env);
    if (url.pathname === '/oauth/callback') return handleCallback(request, url, env);
    if (url.pathname === '/debug/status') return handleDebugStatus(request, url, env);
    if (url.pathname === '/debug/sync') return handleDebugSync(request, url, env);

    return handleRanking(request, env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncDonations(env).catch((err) =>
        env.RANKINGS.put('ranking:last_error', String(err.message))
      )
    );
  }
};

// ---------------------------------------------------------------------
// CORS
//
// ALLOWED_ORIGINS aceita vários domínios separados por vírgula.
// Exemplo:
// https://kamylisumire.com,https://www.kamylisumire.com,https://donate.kamylisumire.com
//
// Compatibilidade: se ALLOWED_ORIGINS não existir, o código ainda aceita
// a variável antiga ALLOWED_ORIGIN.
// ---------------------------------------------------------------------
function getAllowedOrigins(env) {
  const configured = (env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '*').trim();

  if (configured === '*') return ['*'];

  return configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function cors(request, env, response) {
  const headers = new Headers(response.headers);
  const requestOrigin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);

  if (allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers.set('Access-Control-Allow-Origin', requestOrigin);
    headers.append('Vary', 'Origin');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// ---------------------------------------------------------------------
// Autenticação administrativa (OAuth/Debug)
//
// Preferir 'Authorization: Bearer <token>': ele não fica registrado em
// logs de acesso, histórico do navegador ou cabeçalho Referer da forma
// como '?key=' na URL fica. O parâmetro de query é mantido apenas como
// fallback, porque /oauth/authorize precisa continuar sendo um link
// clicável/colável diretamente no navegador (não dá para anexar um
// header a uma navegação simples de GET).
// ---------------------------------------------------------------------
function extractAdminToken(request, url) {
  const header = request.headers.get('Authorization') || '';
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(header.trim());

  if (bearerMatch) return bearerMatch[1].trim();

  return (url.searchParams.get('key') || '').trim();
}

function isAdminAuthorized(request, url, env) {
  const expected = (env.OAUTH_SETUP_TOKEN || '').trim();
  if (!expected) return false;

  return extractAdminToken(request, url) === expected;
}

// ---------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------
async function handleAuthorize(request, url, env) {
  if (!isAdminAuthorized(request, url, env)) {
    return cors(request, env, new Response('Não autorizado', { status: 403 }));
  }

  const authUrl = new URL(`${STREAMLABS_API}/authorize`);
  authUrl.searchParams.set('client_id', clientId(env));
  authUrl.searchParams.set('redirect_uri', env.REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'donations.read');

  return cors(request, env, Response.redirect(authUrl.toString(), 302));
}

async function handleCallback(request, url, env) {
  const code = url.searchParams.get('code');

  if (!code) {
    return cors(request, env, new Response('Código ausente na URL', { status: 400 }));
  }

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

  if (!tokenRes.ok) {
    return cors(request, env, new Response('Falha:\n' + text, { status: 500 }));
  }

  await saveTokens(env, JSON.parse(text));

  let syncMessage = 'Sincronização executada com sucesso.';

  try {
    await syncDonations(env);
  } catch (err) {
    syncMessage = 'OAuth funcionou, mas a sincronização falhou: ' + err.message;
    await env.RANKINGS.put('ranking:last_error', String(err.message));
  }

  return cors(request, env, new Response(
    'Conectado!\n\n' + syncMessage,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  ));
}

async function saveTokens(env, tokenData) {
  const expiresAt =
    Date.now() + (Number(tokenData.expires_in) || 3600) * 1000;

  await env.RANKINGS.put('tokens:access', tokenData.access_token);
  await env.RANKINGS.put('tokens:refresh', tokenData.refresh_token);
  await env.RANKINGS.put('tokens:expires_at', String(expiresAt));
}

async function getValidAccessToken(env) {
  const accessToken = await env.RANKINGS.get('tokens:access');
  const refreshToken = await env.RANKINGS.get('tokens:refresh');
  const expiresAt = Number(
    (await env.RANKINGS.get('tokens:expires_at')) || 0
  );

  if (!accessToken || !refreshToken) {
    throw new Error('Streamlabs não conectado.');
  }

  if (Date.now() < expiresAt - 2 * 60 * 1000) {
    return accessToken;
  }

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

  if (!res.ok) {
    throw new Error('Falha ao renovar token');
  }

  const data = await res.json();
  await saveTokens(env, data);

  return data.access_token;
}

// ---------------------------------------------------------------------
// Sincronização de doações
// ---------------------------------------------------------------------
async function syncDonations(env) {
  const accessToken = await getValidAccessToken(env);
  const lastId = Number(
    (await env.RANKINGS.get('state:last_donation_id')) || 0
  );

  const now = new Date();
  const currentMonthKey = monthKey(now);
  const storedMonthKey = await env.RANKINGS.get('state:current_month');

  let globalTotals = await getJSON(env, 'totals:global', {});
  let monthlyTotals =
    storedMonthKey === currentMonthKey
      ? await getJSON(env, 'totals:monthly', {})
      : {};

  const newDonations = [];
  let before = null;
  let keepPaging = true;

  while (keepPaging) {
    const apiUrl = new URL(`${STREAMLABS_API}/donations`);
    apiUrl.searchParams.set('limit', '100');
    apiUrl.searchParams.set('currency', 'BRL');

    if (before) {
      apiUrl.searchParams.set('before', before);
    }

    const res = await fetch(apiUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!res.ok) {
      throw new Error(`Erro API: ${res.status}`);
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

    if (page.length < 100) {
      keepPaging = false;
    }
  }

  if (newDonations.length > 0) {
    let highestId = lastId;

    for (const donation of newDonations) {
      const name = (donation.name || 'Anônimo').trim();
      const amount = Number(donation.amount) || 0;

      const donationDate = parseDonationDate(donation.created_at);

      globalTotals[name] = (globalTotals[name] || 0) + amount;

      if (donationDate && monthKey(donationDate) === currentMonthKey) {
        monthlyTotals[name] =
          (monthlyTotals[name] || 0) + amount;
      }

      if (donation.donation_id > highestId) {
        highestId = donation.donation_id;
      }
    }

    await env.RANKINGS.put(
      'totals:global',
      JSON.stringify(globalTotals)
    );

    await env.RANKINGS.put(
      'totals:monthly',
      JSON.stringify(monthlyTotals)
    );

    await env.RANKINGS.put(
      'state:last_donation_id',
      String(highestId)
    );
  }

  await env.RANKINGS.put(
    'state:current_month',
    currentMonthKey
  );

  await env.RANKINGS.put(
    'ranking:monthly',
    JSON.stringify(getTopFive(monthlyTotals))
  );

  await env.RANKINGS.put(
    'ranking:allTime',
    JSON.stringify(getTopFive(globalTotals))
  );

  await env.RANKINGS.put(
    'ranking:updated_at',
    String(Date.now())
  );

  await env.RANKINGS.put(
    'ranking:last_error',
    ''
  );
}

// ---------------------------------------------------------------------
// Diagnóstico
// ---------------------------------------------------------------------
async function handleDebugStatus(request, url, env) {
  if (!isAdminAuthorized(request, url, env)) {
    return cors(request, env, new Response('Não autorizado', { status: 403 }));
  }

  return cors(request, env, new Response(
    JSON.stringify({ status: 'ok' }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

async function handleDebugSync(request, url, env) {
  if (!isAdminAuthorized(request, url, env)) {
    return cors(request, env, new Response('Não autorizado', { status: 403 }));
  }

  try {
    await syncDonations(env);
    return cors(request, env, new Response(
      'Sincronização rodou com sucesso.',
      { status: 200 }
    ));
  } catch (err) {
    return cors(request, env, new Response(
      'Erro:\n' + err.message,
      { status: 500 }
    ));
  }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
// RANKING_PRIVATE_NAMES: variável de ambiente do Worker (fora do Git),
// lista separada por vírgula de nomes que devem aparecer como anônimos
// no ranking público. Ex.: "Fulano,Ciclano". A comparação ignora caixa
// e espaços nas extremidades; acentos continuam significativos.
function getPrivateNames(env) {
  return (env.RANKING_PRIVATE_NAMES || '')
    .split(',')
    .map(name => name.trim().toLowerCase())
    .filter(Boolean);
}

function applyRankingPrivacy(name, env) {
  const normalized = String(name || '').trim().toLowerCase();

  if (getPrivateNames(env).includes(normalized)) {
    return env.RANKING_PRIVACY_LABEL || 'Anônimo';
  }

  return name;
}

function getTopFive(totals) {
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({
      name,
      amount: amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }));
}

function sanitizeRanking(items, env) {
  if (!Array.isArray(items)) return [];

  return items.map(item => ({
    ...item,
    name: applyRankingPrivacy(item && item.name, env)
  }));
}

// Aceita created_at como número ou string, em segundos ou milissegundos,
// sem depender de contagem de dígitos (que falha para 'number' em ms).
// 1e12 ms corresponde ao ano 2001, bem abaixo de qualquer valor realista
// de epoch em segundos hoje (~1,7e9), então o limiar separa as duas
// unidades com segurança.
function parseDonationDate(createdAt) {
  if (createdAt === undefined || createdAt === null || createdAt === '') {
    return new Date();
  }

  const numeric = Number(createdAt);

  if (Number.isFinite(numeric)) {
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const fromNumber = new Date(ms);
    if (!Number.isNaN(fromNumber.getTime())) return fromNumber;
  }

  const parsed = new Date(createdAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, '0')}`;
}

async function getJSON(env, key, fallback) {
  const raw = await env.RANKINGS.get(key);
  return raw ? JSON.parse(raw) : fallback;
}

async function handleRanking(request, env) {
  const monthly = await getJSON(
    env,
    'ranking:monthly',
    []
  );

  const allTime = await getJSON(
    env,
    'ranking:allTime',
    []
  );

  const publicMonthly = sanitizeRanking(monthly, env);
  const publicAllTime = sanitizeRanking(allTime, env);

  return cors(
    request,
    env,
    new Response(
      JSON.stringify({
        monthly: publicMonthly,
        allTime: publicAllTime
      }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=1800'
        }
      }
    )
  );
}
