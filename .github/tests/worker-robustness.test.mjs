import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workerSource = await readFile(new URL('../../workers.js', import.meta.url), 'utf8');
const instrumentedSource = `${workerSource}\nexport { syncDonations, getTwitchRefreshState, handleTwitchVideos };\n`;
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(instrumentedSource).toString('base64')}`);

const {
  default: worker,
  syncDonations,
  getTwitchRefreshState,
  handleTwitchVideos
} = workerModule;

class MemoryKV {
  constructor(seed = {}) {
    this.values = new Map(
      Object.entries(seed).map(([key, value]) => [key, String(value)])
    );
    this.puts = [];
  }

  async get(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  async put(key, value, options) {
    const normalized = String(value);
    this.values.set(key, normalized);
    this.puts.push({ key, value: normalized, options });
  }
}

function createRankingEnv(seed = {}, overrides = {}) {
  const tokenState = {
    accessToken: 'streamlabs-test-token',
    refreshToken: 'streamlabs-test-refresh',
    expiresAt: Date.now() + 60 * 60 * 1000
  };

  return {
    RANKINGS: new MemoryKV({
      'tokens:streamlabs_state': JSON.stringify(tokenState),
      ...seed
    }),
    ...overrides
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function withMockFetch(mock, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function withCaches(fakeCaches, callback) {
  const hadCaches = Object.prototype.hasOwnProperty.call(globalThis, 'caches');
  const originalCaches = globalThis.caches;
  globalThis.caches = fakeCaches;
  try {
    return await callback();
  } finally {
    if (hadCaches) globalThis.caches = originalCaches;
    else delete globalThis.caches;
  }
}

test('fetch global converte exceção inesperada em JSON 500 com CORS', async () => {
  const env = {
    RANKINGS: new MemoryKV({
      'ranking:monthly': '{json-invalido',
      'ranking:allTime': '[]'
    })
  };
  const request = new Request('https://api.kamylisumire.com/', {
    headers: { Origin: 'https://kamylisumire.com' }
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    await withCaches({ default: { match: async () => null } }, async () => {
      const response = await worker.fetch(request, env, {});
      assert.equal(response.status, 500);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://kamylisumire.com');
      assert.match(response.headers.get('Vary') || '', /(?:^|,\s*)Origin(?:,|$)/i);
      assert.deepEqual(await response.json(), { error: 'internal_error' });
    });
  } finally {
    console.error = originalError;
  }
});

test('CORS envia Vary: Origin também para origem não permitida', async () => {
  const response = await worker.fetch(new Request('https://api.kamylisumire.com/nao-existe', {
    headers: { Origin: 'https://example.invalid' }
  }), {}, {});

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.match(response.headers.get('Vary') || '', /(?:^|,\s*)Origin(?:,|$)/i);
});

test('syncDonations falha fechado ao atingir o limite de 50 páginas', async () => {
  const currentMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  }).format(new Date()).slice(0, 7);
  const env = createRankingEnv({
    'ledger:v1': JSON.stringify({
      version: 1,
      lastId: 0,
      month: currentMonth,
      global: {},
      monthly: {}
    })
  });
  let calls = 0;

  await withMockFetch(async input => {
    assert.match(String(input), /\/donations\?/);
    calls += 1;
    const firstId = 100000 - ((calls - 1) * 100);
    const data = Array.from({ length: 100 }, (_, index) => ({
      donation_id: firstId - index,
      name: 'Teste',
      amount: '1',
      created_at: Math.floor(Date.now() / 1000)
    }));
    return jsonResponse({ data });
  }, async () => {
    await assert.rejects(
      syncDonations(env),
      /excedeu 50 páginas sem alcançar o último ID processado/
    );
  });

  assert.equal(calls, 50);
  assert.equal(env.RANKINGS.puts.length, 0, 'limite não pode persistir resultado parcial');
});

test('syncDonations detecta cursor before repetido antes de persistir dados', async () => {
  const currentMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  }).format(new Date()).slice(0, 7);
  const env = createRankingEnv({
    'ledger:v1': JSON.stringify({
      version: 1,
      lastId: 0,
      month: currentMonth,
      global: {},
      monthly: {}
    })
  });
  const page = Array.from({ length: 100 }, (_, index) => ({
    donation_id: 1000 - index,
    name: 'Teste',
    amount: '1',
    created_at: Math.floor(Date.now() / 1000)
  }));
  let calls = 0;

  await withMockFetch(async () => {
    calls += 1;
    return jsonResponse({ data: page });
  }, async () => {
    await assert.rejects(syncDonations(env), /cursor before repetido/);
  });

  assert.equal(calls, 2);
  assert.equal(env.RANKINGS.puts.length, 0);
});

test('Twitch renova a partir de 20 h mas continua servindo snapshot até 24 h', async () => {
  const realDateNow = Date.now;
  const now = Date.parse('2026-09-21T18:00:00Z');
  Date.now = () => now;

  try {
    const updatedAt = now - (21 * 60 * 60 * 1000);
    const videos = [{
      id: '123',
      title: 'Live anterior',
      url: 'https://www.twitch.tv/videos/123',
      thumbnail: 'https://static-cdn.jtvnw.net/example.jpg',
      date: '2026-09-20',
      duration: '1h'
    }];
    const env = {
      RANKINGS: new MemoryKV({
        'twitch:updated_at': String(updatedAt),
        'twitch:videos': JSON.stringify(videos)
      }),
      TWITCH_CHANNEL_LOGIN: 'kamylisumire'
    };
    const state = await getTwitchRefreshState(env);
    assert.equal(state.due, true);
    assert.equal(state.stale, false);

    await withCaches({
      default: {
        match: async () => null,
        put: async () => {}
      }
    }, async () => {
      const response = await handleTwitchVideos(
        new Request('https://api.kamylisumire.com/twitch/videos'),
        env,
        { waitUntil() {} }
      );
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.stale, false);
      assert.equal(payload.videos.length, 1);
    });
  } finally {
    Date.now = realDateNow;
  }
});

test('Twitch considera snapshot vencido ao completar 24 h', async () => {
  const realDateNow = Date.now;
  const now = Date.parse('2026-09-21T18:00:00Z');
  Date.now = () => now;

  try {
    const env = {
      RANKINGS: new MemoryKV({
        'twitch:updated_at': String(now - (24 * 60 * 60 * 1000)),
        'twitch:videos': JSON.stringify([{ id: '123' }])
      }),
      TWITCH_CHANNEL_LOGIN: 'kamylisumire'
    };
    const state = await getTwitchRefreshState(env);
    assert.equal(state.due, true);
    assert.equal(state.stale, true);

    await withCaches({ default: { match: async () => null } }, async () => {
      const response = await handleTwitchVideos(
        new Request('https://api.kamylisumire.com/twitch/videos'),
        env,
        {}
      );
      assert.equal(response.status, 503);
      assert.equal((await response.json()).stale, true);
    });
  } finally {
    Date.now = realDateNow;
  }
});
