import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workerSource = await readFile(new URL('../../workers.js', import.meta.url), 'utf8');
const instrumentedSource = `${workerSource}\nexport { syncDonations, monthKey, parseDonationDate, getTopFive, sanitizeRanking };\n`;
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(instrumentedSource).toString('base64')}`);

const {
  syncDonations,
  monthKey,
  parseDonationDate,
  getTopFive,
  sanitizeRanking
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

function createEnv(seed = {}, overrides = {}) {
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

test('monthKey usa a virada civil de America/Sao_Paulo', () => {
  assert.equal(monthKey(new Date('2026-10-01T00:00:00Z')), '2026-09');
  assert.equal(monthKey(new Date('2026-10-01T02:59:59Z')), '2026-09');
  assert.equal(monthKey(new Date('2026-10-01T03:00:00Z')), '2026-10');
  assert.equal(monthKey(new Date('2027-01-01T02:30:00Z')), '2026-12');
  assert.equal(monthKey(new Date('2027-01-01T03:00:00Z')), '2027-01');
});

test('parseDonationDate aceita epoch em segundos, milissegundos e ISO', () => {
  const expected = '2026-09-21T12:34:56.000Z';
  const ms = Date.parse(expected);

  assert.equal(parseDonationDate(Math.floor(ms / 1000)).toISOString(), expected);
  assert.equal(parseDonationDate(ms).toISOString(), expected);
  assert.equal(parseDonationDate(expected).toISOString(), expected);
  assert.equal(parseDonationDate('data-invalida'), null);
});

test('getTopFive ordena, limita e formata o ranking público', () => {
  const ranking = getTopFive({
    Ana: 10.5,
    Bia: 2,
    Caio: 8,
    Dani: 1,
    Eva: 7,
    Fabi: 6
  });

  assert.deepEqual(ranking.map(item => item.name), ['Ana', 'Caio', 'Eva', 'Fabi', 'Bia']);
  assert.equal(ranking[0].amount, '10,50');
  assert.equal(ranking.length, 5);
});

test('sanitizeRanking anonimiza nomes privados sem alterar os demais', () => {
  const result = sanitizeRanking([
    { name: 'Alice', amount: '10,00' },
    { name: 'BOB', amount: '8,00' },
    { name: 'Carol', amount: '5,00' }
  ], {
    RANKING_PRIVATE_NAMES: ' alice, bob ',
    RANKING_PRIVACY_LABEL: 'Privado'
  });

  assert.deepEqual(result, [
    { name: 'Privado', amount: '10,00' },
    { name: 'Privado', amount: '8,00' },
    { name: 'Carol', amount: '5,00' }
  ]);
});

test('syncDonations deduplica pelo último ID e separa total mensal do geral', async () => {
  const currentMonth = monthKey(new Date());
  const currentDonationDate = Math.floor(Date.now() / 1000);
  const oldDonationDate = Math.floor((Date.now() - 45 * 24 * 60 * 60 * 1000) / 1000);
  const env = createEnv({
    'state:last_donation_id': '100',
    'state:current_month': currentMonth,
    'totals:global': JSON.stringify({ Anterior: 5 }),
    'totals:monthly': JSON.stringify({ Anterior: 2 }),
    'ranking:monthly': '[]',
    'ranking:allTime': '[]'
  });

  const page = [
    { donation_id: 102, name: 'Alice', amount: '10.50', created_at: currentDonationDate },
    { donation_id: 101, name: 'Bob', amount: '3', created_at: oldDonationDate },
    { donation_id: 100, name: 'Ignorar', amount: '999', created_at: currentDonationDate }
  ];

  await withMockFetch(async () => jsonResponse({ data: page }), async () => {
    await syncDonations(env);
  });

  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:global')), {
    Anterior: 5,
    Alice: 10.5,
    Bob: 3
  });
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:monthly')), {
    Anterior: 2,
    Alice: 10.5
  });
  assert.equal(await env.RANKINGS.get('state:last_donation_id'), '102');

  env.RANKINGS.puts.length = 0;
  await withMockFetch(async () => jsonResponse({ data: page }), async () => {
    await syncDonations(env);
  });

  assert.equal(env.RANKINGS.puts.length, 0, 'a segunda sincronização não deve recontar nem regravar dados idênticos');
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:global')), {
    Anterior: 5,
    Alice: 10.5,
    Bob: 3
  });
});


test('syncDonations zera apenas o mensal quando a chave de mês muda', async () => {
  const currentMonth = monthKey(new Date());
  const env = createEnv({
    'state:last_donation_id': '77',
    'state:current_month': '2000-01',
    'totals:global': JSON.stringify({ Historico: 25 }),
    'totals:monthly': JSON.stringify({ MesAnterior: 12 }),
    'ranking:monthly': JSON.stringify([{ name: 'MesAnterior', amount: '12,00' }]),
    'ranking:allTime': JSON.stringify([{ name: 'Historico', amount: '25,00' }])
  });

  await withMockFetch(async () => jsonResponse({ data: [] }), async () => {
    await syncDonations(env);
  });

  assert.equal(await env.RANKINGS.get('state:current_month'), currentMonth);
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:monthly')), {});
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('ranking:monthly')), []);
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:global')), { Historico: 25 });
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('ranking:allTime')), [
    { name: 'Historico', amount: '25,00' }
  ]);
});

test('syncDonations pagina até encontrar state:last_donation_id', async () => {
  const currentMonth = monthKey(new Date());
  const createdAt = Math.floor(Date.now() / 1000);
  const env = createEnv({
    'state:last_donation_id': '50',
    'state:current_month': currentMonth,
    'totals:global': '{}',
    'totals:monthly': '{}',
    'ranking:monthly': '[]',
    'ranking:allTime': '[]'
  });

  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    donation_id: 150 - index,
    name: 'Coletivo',
    amount: '1',
    created_at: createdAt
  }));
  const secondPage = [
    { donation_id: 50, name: 'Antigo', amount: '999', created_at: createdAt },
    { donation_id: 49, name: 'Antigo', amount: '999', created_at: createdAt }
  ];
  const requested = [];

  await withMockFetch(async input => {
    const url = new URL(String(input));
    requested.push(url);
    return requested.length === 1
      ? jsonResponse({ data: firstPage })
      : jsonResponse({ data: secondPage });
  }, async () => {
    await syncDonations(env);
  });

  assert.equal(requested.length, 2);
  assert.equal(requested[0].searchParams.get('before'), null);
  assert.equal(requested[1].searchParams.get('before'), '51');
  assert.equal(await env.RANKINGS.get('state:last_donation_id'), '150');
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:global')), { Coletivo: 100 });
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:monthly')), { Coletivo: 100 });
});

test('syncDonations falha fechado quando a API responde erro e não persiste estado parcial', async () => {
  const currentMonth = monthKey(new Date());
  const env = createEnv({
    'state:last_donation_id': '10',
    'state:current_month': currentMonth,
    'totals:global': JSON.stringify({ Existente: 7 }),
    'totals:monthly': JSON.stringify({ Existente: 4 })
  });

  await withMockFetch(async () => new Response('erro', { status: 503 }), async () => {
    await assert.rejects(syncDonations(env), /Erro API: 503/);
  });

  assert.equal(env.RANKINGS.puts.length, 0);
  assert.equal(await env.RANKINGS.get('state:last_donation_id'), '10');
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:global')), { Existente: 7 });
  assert.deepEqual(JSON.parse(await env.RANKINGS.get('totals:monthly')), { Existente: 4 });
});

test('syncDonations não converte JSON corrompido em totais vazios silenciosamente', async () => {
  const currentMonth = monthKey(new Date());
  const env = createEnv({
    'state:last_donation_id': '10',
    'state:current_month': currentMonth,
    'totals:global': '{json-invalido',
    'totals:monthly': '{}'
  });

  await assert.rejects(syncDonations(env), SyntaxError);
  assert.equal(env.RANKINGS.puts.length, 0);
});
