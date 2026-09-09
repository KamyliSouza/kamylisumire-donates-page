const STREAMLABS_API = 'https://streamlabs.com/api/v2.0';
const TWITCH_API = 'https://api.twitch.tv/helix';
const TWITCH_OAUTH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const TWITCH_VIDEO_CACHE_TTL_SECONDS = 24 * 60 * 60;
const TWITCH_LIVE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const TWITCH_LIVE_STALE_AFTER_MS = 20 * 60 * 1000;
const TWITCH_LIVE_CACHE_TTL_SECONDS = 30 * 60;
const TWITCH_LIVE_EDGE_CACHE_SECONDS = 60;
const TWITCH_TOKEN_SAFETY_MS = 5 * 60 * 1000;

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
    if (url.pathname === '/debug/twitch-sync') return handleDebugTwitchSync(request, url, env);
    if (url.pathname === '/debug/twitch-live-sync') return handleDebugTwitchLiveSync(request, url, env);
    if (url.pathname === '/twitch/videos') return handleTwitchVideos(request, env);
    if (url.pathname === '/twitch/live') return handleTwitchLive(request, env, ctx);

    return handleRanking(request, env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncDonations(env).catch((err) =>
        env.RANKINGS.put('ranking:last_error', String(err.message))
      )
    );

    // A rotina agendada pode executar com qualquer frequência necessária
    // para o ranking. A própria função abaixo impede consultas à Twitch
    // antes de completar 24 horas desde a última atualização bem-sucedida.
    ctx.waitUntil(
      syncTwitchVideosIfDue(env).catch((err) =>
        env.RANKINGS.put('twitch:last_error', String(err.message))
      )
    );

    // O status ao vivo possui janela própria de 10 minutos. Mesmo que o
    // Cron rode com frequência maior, a Twitch só é consultada quando o
    // snapshot estiver vencido. Uma execução a cada 10 minutos é recomendada.
    ctx.waitUntil(
      syncTwitchLiveIfDue(env).catch(() => {})
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
  const monthChanged = storedMonthKey !== currentMonthKey;

  let globalTotals = await getJSON(env, 'totals:global', {});
  let monthlyTotals = monthChanged
    ? {}
    : await getJSON(env, 'totals:monthly', {});

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

  const hasNewDonations = newDonations.length > 0;
  let highestId = lastId;

  if (hasNewDonations) {
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
      'state:last_donation_id',
      String(highestId)
    );
  }

  // Com Cron a cada 10 minutos, regravar snapshots idênticos consumiria
  // desnecessariamente a cota diária de writes do KV Free. Só persistimos
  // dados do ranking quando houve doação nova ou virada de mês.
  if (hasNewDonations || monthChanged) {
    await env.RANKINGS.put(
      'totals:monthly',
      JSON.stringify(monthlyTotals)
    );

    if (monthChanged) {
      await env.RANKINGS.put(
        'state:current_month',
        currentMonthKey
      );
    }

    await env.RANKINGS.put(
      'ranking:monthly',
      JSON.stringify(getTopFive(monthlyTotals))
    );

    if (hasNewDonations) {
      await env.RANKINGS.put(
        'ranking:allTime',
        JSON.stringify(getTopFive(globalTotals))
      );
    }
  }

  // Limpa um erro anterior somente quando ele realmente existe. Assim uma
  // sincronização sem novidades não gera um write extra a cada execução.
  const previousError = await env.RANKINGS.get('ranking:last_error');
  if (previousError) {
    await env.RANKINGS.put('ranking:last_error', '');
  }
}

// ---------------------------------------------------------------------
// Twitch — últimas lives (VODs)
//
// Política V47.4.1:
// - o endpoint público /twitch/videos NUNCA chama a API da Twitch;
// - o snapshot fica no KV RANKINGS por no máximo 24 h (expirationTtl);
// - conteúdo vencido nunca é devolvido pelo endpoint público;
// - a atualização automática passa por syncTwitchVideosIfDue(), que só
//   consulta os vídeos após 24 h da última atualização bem-sucedida;
// - a primeira sincronização resolve o user_id pelo login e o mantém no KV;
// - o App Access Token também é reutilizado enquanto estiver válido.
// ---------------------------------------------------------------------
function twitchClientId(env) {
  return (env.TWITCH_CLIENT_ID || '').trim();
}

function twitchClientSecret(env) {
  return (env.TWITCH_CLIENT_SECRET || '').trim();
}

function twitchChannelLogin(env) {
  return (env.TWITCH_CHANNEL_LOGIN || '').trim().toLowerCase();
}

function twitchVideoLimit(env) {
  const configured = Number(env.TWITCH_MAX_VIDEOS || 10);

  if (!Number.isInteger(configured)) return 10;
  return Math.max(1, Math.min(20, configured));
}

function assertTwitchConfigured(env) {
  if (!twitchClientId(env)) {
    throw new Error('TWITCH_CLIENT_ID não configurado.');
  }

  if (!twitchClientSecret(env)) {
    throw new Error('TWITCH_CLIENT_SECRET não configurado.');
  }

  if (!twitchChannelLogin(env)) {
    throw new Error('TWITCH_CHANNEL_LOGIN não configurado.');
  }
}

async function getTwitchAppAccessToken(env) {
  const storedToken = await env.RANKINGS.get('twitch:app_access_token');
  const expiresAt = Number(
    (await env.RANKINGS.get('twitch:app_access_token_expires_at')) || 0
  );

  if (
    storedToken &&
    expiresAt &&
    Date.now() < expiresAt - TWITCH_TOKEN_SAFETY_MS
  ) {
    return storedToken;
  }

  const body = new URLSearchParams();
  body.set('client_id', twitchClientId(env));
  body.set('client_secret', twitchClientSecret(env));
  body.set('grant_type', 'client_credentials');

  const response = await fetch(TWITCH_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Falha ao obter App Access Token da Twitch (${response.status}): ${detail}`
    );
  }

  const data = await response.json();
  const token = String(data.access_token || '').trim();
  const expiresIn = Math.max(60, Number(data.expires_in) || 3600);

  if (!token) {
    throw new Error('Twitch não retornou access_token.');
  }

  await env.RANKINGS.put('twitch:app_access_token', token);
  await env.RANKINGS.put(
    'twitch:app_access_token_expires_at',
    String(Date.now() + expiresIn * 1000)
  );

  return token;
}

async function getTwitchUserId(env, accessToken) {
  const login = twitchChannelLogin(env);
  const cachedLogin = (
    (await env.RANKINGS.get('twitch:user_login')) || ''
  ).trim().toLowerCase();
  const cachedId = (
    (await env.RANKINGS.get('twitch:user_id')) || ''
  ).trim();

  if (cachedId && cachedLogin === login) {
    return cachedId;
  }

  const url = new URL(`${TWITCH_API}/users`);
  url.searchParams.set('login', login);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': twitchClientId(env)
    }
  });

  if (!response.ok) {
    throw new Error(`Falha ao resolver canal da Twitch (${response.status}).`);
  }

  const data = await response.json();
  const userId = String(data?.data?.[0]?.id || '').trim();

  if (!userId) {
    throw new Error(`Canal da Twitch não encontrado: ${login}.`);
  }

  await env.RANKINGS.put('twitch:user_login', login);
  await env.RANKINGS.put('twitch:user_id', userId);

  return userId;
}

function twitchThumbnailUrl(value) {
  return String(value || '')
    .replace(/%\{width\}/g, '320')
    .replace(/%\{height\}/g, '180')
    .trim();
}

function twitchVideoDate(createdAt) {
  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toISOString().slice(0, 10);
}

async function fetchTwitchVideos(env) {
  assertTwitchConfigured(env);

  const accessToken = await getTwitchAppAccessToken(env);
  const userId = await getTwitchUserId(env, accessToken);
  const url = new URL(`${TWITCH_API}/videos`);

  url.searchParams.set('user_id', userId);
  url.searchParams.set('type', 'archive');
  url.searchParams.set('sort', 'time');
  url.searchParams.set('first', String(twitchVideoLimit(env)));

  // Esta é a única consulta Helix de vídeos feita pela integração durante
  // cada janela de 24 horas. Em caso de falha, o endpoint público não serve
  // conteúdo vencido; o snapshot também expira automaticamente no KV.
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': twitchClientId(env)
    }
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar vídeos da Twitch (${response.status}).`);
  }

  const data = await response.json();
  const videos = Array.isArray(data?.data) ? data.data : [];

  return videos
    .map(video => ({
      id: String(video?.id || '').trim(),
      title: String(video?.title || '').trim(),
      url: String(video?.url || '').trim(),
      thumbnail: twitchThumbnailUrl(video?.thumbnail_url),
      date: twitchVideoDate(video?.created_at),
      duration: String(video?.duration || '').trim()
    }))
    .filter(video => (
      video.id &&
      video.title &&
      video.url.startsWith('https://') &&
      video.thumbnail.startsWith('https://') &&
      video.date
    ));
}

async function getTwitchRefreshState(env) {
  const updatedAt = Number(
    (await env.RANKINGS.get('twitch:updated_at')) || 0
  );
  const now = Date.now();
  const due = !updatedAt || now - updatedAt >= TWITCH_REFRESH_INTERVAL_MS;

  return {
    updatedAt,
    due,
    nextRefreshAt: updatedAt
      ? updatedAt + TWITCH_REFRESH_INTERVAL_MS
      : now
  };
}

async function syncTwitchVideosIfDue(env) {
  assertTwitchConfigured(env);

  const state = await getTwitchRefreshState(env);

  if (!state.due) {
    return {
      updated: false,
      reason: 'cache_fresh',
      updatedAt: state.updatedAt,
      nextRefreshAt: state.nextRefreshAt
    };
  }

  try {
    const videos = await fetchTwitchVideos(env);
    const updatedAt = Date.now();

    await env.RANKINGS.put(
      'twitch:videos',
      JSON.stringify(videos),
      { expirationTtl: TWITCH_VIDEO_CACHE_TTL_SECONDS }
    );
    await env.RANKINGS.put('twitch:updated_at', String(updatedAt));
    await env.RANKINGS.put('twitch:last_error', '');

    return {
      updated: true,
      videoCount: videos.length,
      updatedAt,
      nextRefreshAt: updatedAt + TWITCH_REFRESH_INTERVAL_MS
    };
  } catch (error) {
    await env.RANKINGS.put('twitch:last_error', String(error.message));
    throw error;
  }
}

async function handleTwitchVideos(request, env) {
  const videos = await getJSON(env, 'twitch:videos', []);
  const state = await getTwitchRefreshState(env);

  if (!state.updatedAt) {
    return cors(
      request,
      env,
      new Response(
        JSON.stringify({
          platform: 'twitch',
          videos: [],
          updatedAt: null,
          stale: true,
          message: 'Cache da Twitch ainda não foi inicializado.'
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      )
    );
  }

  if (state.due || !Array.isArray(videos) || videos.length === 0) {
    return cors(
      request,
      env,
      new Response(
        JSON.stringify({
          platform: 'twitch',
          videos: [],
          updatedAt: new Date(state.updatedAt).toISOString(),
          stale: true,
          message: 'Cache da Twitch expirado. Aguarde a próxima sincronização.'
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      )
    );
  }

  const now = Date.now();
  const freshSeconds = Math.max(
    0,
    Math.floor((state.nextRefreshAt - now) / 1000)
  );
  const browserMaxAge = Math.max(60, freshSeconds);

  return cors(
    request,
    env,
    new Response(
      JSON.stringify({
        platform: 'twitch',
        channelUrl: `https://www.twitch.tv/${twitchChannelLogin(env)}`,
        videos,
        updatedAt: new Date(state.updatedAt).toISOString(),
        refreshAfter: new Date(state.nextRefreshAt).toISOString(),
        stale: false
      }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${browserMaxAge}`
        }
      }
    )
  );
}

async function handleDebugTwitchSync(request, url, env) {
  if (!isAdminAuthorized(request, url, env)) {
    return cors(request, env, new Response('Não autorizado', { status: 403 }));
  }

  try {
    const result = await syncTwitchVideosIfDue(env);

    return cors(
      request,
      env,
      new Response(
        JSON.stringify({
          status: 'ok',
          ...result,
          updatedAt: result.updatedAt
            ? new Date(result.updatedAt).toISOString()
            : null,
          nextRefreshAt: result.nextRefreshAt
            ? new Date(result.nextRefreshAt).toISOString()
            : null
        }),
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      )
    );
  } catch (error) {
    return cors(
      request,
      env,
      new Response(
        JSON.stringify({
          status: 'error',
          error: String(error.message)
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      )
    );
  }
}


// ---------------------------------------------------------------------
// Twitch — status ao vivo
//
// Política V47.4.3:
// - consulta Helix /streams no máximo uma vez a cada 10 minutos;
// - grava um único snapshot no KV, com TTL de 30 minutos;
// - /twitch/live nunca consulta a Twitch e usa Cache API por 60 s para
//   reduzir leituras KV repetidas no mesmo data center;
// - se o snapshot ficar com mais de 20 minutos, a API pública retorna 503
//   e a Home mantém o Hero padrão em vez de exibir um estado possivelmente
//   incorreto.
// ---------------------------------------------------------------------
function twitchLiveThumbnailUrl(value) {
  return String(value || '')
    .replace(/\{width\}/g, '640')
    .replace(/\{height\}/g, '360')
    .trim();
}

function normalizeTwitchLiveStream(stream, checkedAt) {
  if (!stream || typeof stream !== 'object') {
    return {
      live: false,
      checkedAt
    };
  }

  return {
    live: true,
    checkedAt,
    id: String(stream.id || '').trim(),
    userId: String(stream.user_id || '').trim(),
    userLogin: String(stream.user_login || '').trim(),
    userName: String(stream.user_name || '').trim(),
    title: String(stream.title || '').trim(),
    gameName: String(stream.game_name || '').trim(),
    viewerCount: Math.max(0, Number(stream.viewer_count) || 0),
    startedAt: String(stream.started_at || '').trim(),
    thumbnail: twitchLiveThumbnailUrl(stream.thumbnail_url),
    url: ''
  };
}

async function fetchTwitchLiveStatus(env) {
  assertTwitchConfigured(env);

  const accessToken = await getTwitchAppAccessToken(env);
  const userId = await getTwitchUserId(env, accessToken);
  const url = new URL(`${TWITCH_API}/streams`);

  url.searchParams.set('user_id', userId);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': twitchClientId(env)
    }
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar status da Twitch (${response.status}).`);
  }

  const data = await response.json();
  const stream = Array.isArray(data?.data) ? data.data[0] : null;
  const checkedAt = Date.now();
  const normalized = normalizeTwitchLiveStream(stream, checkedAt);

  if (normalized.live) {
    normalized.url = `https://www.twitch.tv/${twitchChannelLogin(env)}`;
  }

  return normalized;
}

async function getTwitchLiveSnapshot(env) {
  return getJSON(env, 'twitch:live', null);
}

function twitchLiveSnapshotCheckedAt(snapshot) {
  return Math.max(0, Number(snapshot?.checkedAt) || 0);
}

async function syncTwitchLiveIfDue(env, options = {}) {
  assertTwitchConfigured(env);

  const current = await getTwitchLiveSnapshot(env);
  const checkedAt = twitchLiveSnapshotCheckedAt(current);
  const now = Date.now();
  const force = options.force === true;

  if (!force && checkedAt && now - checkedAt < TWITCH_LIVE_REFRESH_INTERVAL_MS) {
    return {
      updated: false,
      reason: 'cache_fresh',
      live: Boolean(current?.live),
      checkedAt,
      nextRefreshAt: checkedAt + TWITCH_LIVE_REFRESH_INTERVAL_MS
    };
  }

  try {
    const snapshot = await fetchTwitchLiveStatus(env);

    await env.RANKINGS.put(
      'twitch:live',
      JSON.stringify(snapshot),
      { expirationTtl: TWITCH_LIVE_CACHE_TTL_SECONDS }
    );

    const previousError = await env.RANKINGS.get('twitch:live_last_error');
    if (previousError) {
      await env.RANKINGS.put('twitch:live_last_error', '');
    }

    return {
      updated: true,
      live: Boolean(snapshot.live),
      checkedAt: snapshot.checkedAt,
      nextRefreshAt: snapshot.checkedAt + TWITCH_LIVE_REFRESH_INTERVAL_MS
    };
  } catch (error) {
    await env.RANKINGS.put('twitch:live_last_error', String(error.message));
    throw error;
  }
}

function buildTwitchLivePublicPayload(snapshot) {
  if (!snapshot?.live) {
    return {
      platform: 'twitch',
      live: false,
      checkedAt: new Date(twitchLiveSnapshotCheckedAt(snapshot)).toISOString()
    };
  }

  return {
    platform: 'twitch',
    live: true,
    checkedAt: new Date(twitchLiveSnapshotCheckedAt(snapshot)).toISOString(),
    title: String(snapshot.title || '').trim(),
    gameName: String(snapshot.gameName || '').trim(),
    viewerCount: Math.max(0, Number(snapshot.viewerCount) || 0),
    startedAt: String(snapshot.startedAt || '').trim(),
    thumbnail: String(snapshot.thumbnail || '').trim(),
    url: String(snapshot.url || '').trim()
  };
}

async function handleTwitchLive(request, env, ctx) {
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.search = '';
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cors(request, env, cached);
  }

  const snapshot = await getTwitchLiveSnapshot(env);
  const checkedAt = twitchLiveSnapshotCheckedAt(snapshot);
  const age = checkedAt ? Date.now() - checkedAt : Number.POSITIVE_INFINITY;

  if (!snapshot || !checkedAt || age >= TWITCH_LIVE_STALE_AFTER_MS) {
    return cors(
      request,
      env,
      new Response(
        JSON.stringify({
          platform: 'twitch',
          live: false,
          available: false,
          checkedAt: checkedAt ? new Date(checkedAt).toISOString() : null
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      )
    );
  }

  const response = new Response(
    JSON.stringify({
      ...buildTwitchLivePublicPayload(snapshot),
      available: true
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${TWITCH_LIVE_EDGE_CACHE_SECONDS}`
      }
    }
  );

  ctx?.waitUntil(cache.put(cacheKey, response.clone()));

  return cors(request, env, response);
}

async function handleDebugTwitchLiveSync(request, url, env) {
  if (!isAdminAuthorized(request, url, env)) {
    return cors(request, env, new Response('Não autorizado', { status: 403 }));
  }

  try {
    const force = url.searchParams.get('force') === '1';
    const result = await syncTwitchLiveIfDue(env, { force });

    // Remove o cache local do data center usado pelo comando administrativo,
    // permitindo validar imediatamente o novo estado nesse mesmo ponto de presença.
    const publicUrl = new URL('/twitch/live', request.url);
    await caches.default.delete(new Request(publicUrl.toString(), { method: 'GET' }));

    return cors(
      request,
      env,
      new Response(
        JSON.stringify({
          status: 'ok',
          ...result,
          checkedAt: result.checkedAt
            ? new Date(result.checkedAt).toISOString()
            : null,
          nextRefreshAt: result.nextRefreshAt
            ? new Date(result.nextRefreshAt).toISOString()
            : null
        }),
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      )
    );
  } catch (error) {
    return cors(
      request,
      env,
      new Response(
        JSON.stringify({
          status: 'error',
          message: error.message
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      )
    );
  }
}

// ---------------------------------------------------------------------
// Diagnóstico
// ---------------------------------------------------------------------
async function handleDebugStatus(request, url, env) {
  if (!isAdminAuthorized(request, url, env)) {
    return cors(request, env, new Response('Não autorizado', { status: 403 }));
  }

  const twitchState = await getTwitchRefreshState(env);
  const twitchVideos = await getJSON(env, 'twitch:videos', []);
  const twitchLastError = await env.RANKINGS.get('twitch:last_error');
  const twitchLive = await getTwitchLiveSnapshot(env);
  const twitchLiveCheckedAt = twitchLiveSnapshotCheckedAt(twitchLive);
  const twitchLiveLastError = await env.RANKINGS.get('twitch:live_last_error');

  return cors(request, env, new Response(
    JSON.stringify({
      status: 'ok',
      twitch: {
        configured: Boolean(
          twitchClientId(env) &&
          twitchClientSecret(env) &&
          twitchChannelLogin(env)
        ),
        videoCount: Array.isArray(twitchVideos) ? twitchVideos.length : 0,
        updatedAt: twitchState.updatedAt
          ? new Date(twitchState.updatedAt).toISOString()
          : null,
        nextRefreshAt: twitchState.updatedAt
          ? new Date(twitchState.nextRefreshAt).toISOString()
          : null,
        refreshDue: twitchState.due,
        lastError: twitchLastError || null,
        liveStatus: {
          live: Boolean(twitchLive?.live),
          checkedAt: twitchLiveCheckedAt
            ? new Date(twitchLiveCheckedAt).toISOString()
            : null,
          nextRefreshAt: twitchLiveCheckedAt
            ? new Date(twitchLiveCheckedAt + TWITCH_LIVE_REFRESH_INTERVAL_MS).toISOString()
            : null,
          stale: !twitchLiveCheckedAt || Date.now() - twitchLiveCheckedAt >= TWITCH_LIVE_STALE_AFTER_MS,
          lastError: twitchLiveLastError || null
        }
      }
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    }
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
