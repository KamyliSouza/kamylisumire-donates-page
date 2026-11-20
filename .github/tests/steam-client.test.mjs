import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createSteamGuard,
  isFresh,
  STEAM_USER_AGENT,
  SteamHalt,
} from '../scripts/steam-client.mjs';

const repoPath = path => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const read = path => readFileSync(repoPath(path), 'utf8');

/* ------------------------------------------------------------------ */
/* Disjuntor / cliente Steam                                           */
/* ------------------------------------------------------------------ */

function makeGuard(responses, options = {}) {
  let clock = 1_000_000;
  const calls = [];
  const sleeps = [];
  const queue = [...responses];
  const guard = createSteamGuard({
    now: () => clock,
    sleep: async ms => { sleeps.push(ms); clock += ms; },
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      const next = queue.length > 1 ? queue.shift() : queue[0];
      if (next instanceof Error) throw next;
      return new Response(next.body ?? '{}', { status: next.status });
    },
    ...options,
  });
  return { guard, calls, sleeps };
}

test('toda requisição à Steam leva User-Agent identificado e respeita o intervalo mínimo', async () => {
  const { guard, calls, sleeps } = makeGuard([{ status: 200 }]);
  await guard.request('https://api.steampowered.com/a', { kind: 'api' });
  await guard.request('https://api.steampowered.com/b', { kind: 'api' });

  assert.equal(calls.length, 2);
  for (const call of calls) assert.equal(call.init.headers['User-Agent'], STEAM_USER_AGENT);
  assert.match(STEAM_USER_AGENT, /kamylisumire\.com/);
  assert.deepEqual(sleeps, [250], 'a 2ª requisição espera o intervalo mínimo; a 1ª não espera');
});

test('o cabeçalho informado (chave da API) é preservado junto do User-Agent', async () => {
  const { guard, calls } = makeGuard([{ status: 200 }]);
  await guard.request('https://api.steampowered.com/a', { kind: 'api', headers: { 'x-webapi-key': 'k' } });
  assert.equal(calls[0].init.headers['x-webapi-key'], 'k');
  assert.equal(calls[0].init.headers['User-Agent'], STEAM_USER_AGENT);
});

test('HTTP 429 interrompe a Steam na hora e nenhuma requisição posterior é feita', async () => {
  const { guard, calls } = makeGuard([{ status: 429 }]);
  await assert.rejects(guard.request('https://api.steampowered.com/a'), SteamHalt);
  assert.equal(guard.halted, 'HTTP 429');
  await assert.rejects(guard.request('https://shared.fastly.steamstatic.com/x', { kind: 'cdn', method: 'HEAD' }), SteamHalt);
  assert.equal(calls.length, 1, 'após o disjuntor abrir, o fetch não pode ser chamado de novo');
});

test('HTTP 403 na Web API interrompe; 403 isolado no CDN é só "asset inexistente"', async () => {
  const api = makeGuard([{ status: 403 }]);
  await assert.rejects(api.guard.request('https://api.steampowered.com/a', { kind: 'api' }), SteamHalt);

  const cdn = makeGuard([{ status: 403 }, { status: 404 }, { status: 200 }]);
  const first = await cdn.guard.request('https://shared.fastly.steamstatic.com/a', { kind: 'cdn', method: 'HEAD' });
  assert.equal(first.status, 403);
  assert.equal(cdn.guard.halted, null);
  assert.equal((await cdn.guard.request('https://shared.fastly.steamstatic.com/b', { kind: 'cdn', method: 'HEAD' })).status, 404);
  assert.equal((await cdn.guard.request('https://shared.fastly.steamstatic.com/c', { kind: 'cdn', method: 'HEAD' })).status, 200);
  assert.equal(cdn.guard.halted, null);
});

test('cinco 403 seguidos no CDN indicam bloqueio e interrompem; uma resposta normal zera a contagem', async () => {
  const blocked = makeGuard([{ status: 403 }]);
  for (let i = 0; i < 4; i += 1) {
    await blocked.guard.request(`https://shared.fastly.steamstatic.com/${i}`, { kind: 'cdn', method: 'HEAD' });
  }
  await assert.rejects(blocked.guard.request('https://shared.fastly.steamstatic.com/5', { kind: 'cdn', method: 'HEAD' }), SteamHalt);

  const mixed = makeGuard([{ status: 403 }, { status: 403 }, { status: 404 }, { status: 403 }, { status: 403 }, { status: 403 }, { status: 403 }]);
  for (let i = 0; i < 7; i += 1) {
    await mixed.guard.request(`https://shared.fastly.steamstatic.com/${i}`, { kind: 'cdn', method: 'HEAD' });
  }
  assert.equal(mixed.guard.halted, null);
});

test('falha transitória (5xx) é repetida com espera crescente e pode se recuperar', async () => {
  const { guard, calls, sleeps } = makeGuard([{ status: 503 }, { status: 502 }, { status: 200 }]);
  const response = await guard.request('https://api.steampowered.com/a');
  assert.equal(response.status, 200);
  assert.equal(calls.length, 3);
  assert.deepEqual(sleeps, [1000, 2000], 'espera dobra a cada tentativa');
  assert.equal(guard.halted, null);
});

test('três requisições seguidas que falham mesmo após as tentativas abrem o disjuntor', async () => {
  const { guard, calls } = makeGuard([new Error('ECONNRESET')]);
  await assert.rejects(guard.request('https://api.steampowered.com/1'), /ECONNRESET/);
  await assert.rejects(guard.request('https://api.steampowered.com/2'), /ECONNRESET/);
  await assert.rejects(guard.request('https://api.steampowered.com/3'), SteamHalt);
  assert.equal(calls.length, 9, '3 requisições x (1 + 2 tentativas extras)');
  await assert.rejects(guard.request('https://api.steampowered.com/4'), SteamHalt);
  assert.equal(calls.length, 9);
});

test('json() lança com o status HTTP e sem vazar a query string (chave/entrada) na mensagem', async () => {
  const { guard } = makeGuard([{ status: 404 }]);
  await assert.rejects(
    guard.json('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=%7B%7D&key=segredo', { kind: 'api' }),
    error => error.status === 404 && /GetItems\/v1\/: HTTP 404/.test(error.message) && !/segredo|input_json/.test(error.message),
  );
});

test('isFresh respeita o TTL, ignora datas inválidas e datas no futuro', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  assert.equal(isFresh('2026-11-10T12:00:00Z', 14 * 86400000, now), true);
  assert.equal(isFresh('2026-10-01T12:00:00Z', 14 * 86400000, now), false);
  assert.equal(isFresh('2026-11-17T12:00:00Z', 3 * 86400000, now), true);
  assert.equal(isFresh('2026-11-10T12:00:00Z', 3 * 86400000, now), false);
  assert.equal(isFresh('não é data', 86400000, now), false);
  assert.equal(isFresh(undefined, 86400000, now), false);
  assert.equal(isFresh('2026-12-01T00:00:00Z', 86400000, now), false);
});

test('sync-jogos.mjs só fala com a Steam pelo cliente protegido', () => {
  const source = read('.github/scripts/sync-jogos.mjs');
  assert.match(source, /from "\.\/steam-client\.mjs"/);
  assert.match(source, /const steam = createSteamGuard\(\);/);
  assert.match(source, /steam\.request\(url, \{ kind: "cdn", method: "HEAD" \}\)/);
  assert.match(source, /steam\.json\(endpoint, \{ kind: "api", headers: steamApiHeaders \}\)/);
  // `getJson` (fetch direto) continua existindo somente para o Trello.
  assert.doesNotMatch(source, /getJson\(endpoint/);
  assert.doesNotMatch(source, /method:\s*"HEAD",\s*redirect/);
});

/* ------------------------------------------------------------------ */
/* sync-jogos.mjs de ponta a ponta com Trello/Steam simulados          */
/* ------------------------------------------------------------------ */

const STORE = 'https://shared.fastly.steamstatic.com/store_item_assets/';
const FIXTURE = {
  lists: [{ id: 'l1', name: 'Jogados', pos: 1, closed: false }],
  cards: [
    // 111: capa vertical em caminho determinístico (HEAD direto); 222: caminho com hash (só via GetItems).
    { id: 'c1', name: 'Jogo Antigo', idList: 'l1', pos: 1, closed: false, desc: 'SteamAppID: 111' },
    { id: 'c2', name: 'Jogo Moderno', idList: 'l1', pos: 2, closed: false, desc: 'SteamAppID: 222' },
  ],
  catalog: [],
  items: {
    111: { appid: 111, success: 1, assets: { asset_url_format: 'steam/apps/111/${FILENAME}?t=10', header: 'header.jpg', library_capsule: 'library_capsule.jpg', community_icon: 'a'.repeat(40) } },
    222: { appid: 222, success: 1, assets: { asset_url_format: 'steam/apps/222/${FILENAME}?t=20', header: 'header.jpg', library_capsule_2x: `${'b'.repeat(40)}/library_capsule_2x.jpg`, community_icon: 'c'.repeat(40) } },
  },
  headOk: [
    `${STORE}steam/apps/111/library_capsule.jpg`,
    `${STORE}steam/apps/222/${'b'.repeat(40)}/library_capsule_2x.jpg?t=20`,
  ],
};

const STUB = `
import { readFileSync, appendFileSync } from "node:fs";
const fx = JSON.parse(readFileSync(process.env.SIM_FIXTURE, "utf8"));
const headOk = new Set(fx.headOk);
const log = kind => appendFileSync(process.env.SIM_LOG, kind + "\\n");
const json = body => new Response(JSON.stringify(body), { status: 200 });
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = (init.method || "GET").toUpperCase();
  if (url.hostname === "api.trello.com") {
    if (url.pathname.endsWith("/lists")) return json(fx.lists);
    if (url.pathname.endsWith("/cards")) return json(fx.cards);
  }
  if (url.hostname === "api.steampowered.com") {
    log(url.pathname.includes("GetItems") ? "GetItems" : "GetAppList");
    if (process.env.SIM_MODE === "429") return new Response("", { status: 429 });
    if (url.pathname.includes("GetAppList")) return json({ response: { apps: fx.catalog, have_more_results: false } });
    const ids = (JSON.parse(url.searchParams.get("input_json")).ids || []).map(entry => String(entry.appid));
    return json({ response: { store_items: ids.map(id => fx.items[id]).filter(Boolean) } });
  }
  if (url.hostname.endsWith("steamstatic.com")) {
    log("cdn:" + method + ":" + (init.headers?.["User-Agent"] ? "ua" : "no-ua"));
    if (process.env.SIM_MODE === "429") return new Response("", { status: 429 });
    return new Response(null, { status: headOk.has(url.href) ? 200 : 404 });
  }
  throw new Error("fetch inesperado: " + url.href);
};
`;

function runSync(dir, mode = 'ok') {
  const logPath = join(dir, 'steam.log');
  writeFileSync(logPath, '');
  const result = spawnSync(process.execPath, [
    '--import',
    './stub.mjs',
    relative(dir, repoPath('.github/scripts/sync-jogos.mjs')),
  ], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 60_000,
    env: {
      ...process.env,
      TRELLO_API_KEY: 'x',
      TRELLO_TOKEN: 'y',
      STEAM_WEB_API_KEY: 'z',
      SIM_FIXTURE: join(dir, 'fixture.json'),
      SIM_LOG: logPath,
      SIM_MODE: mode,
    },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const steamLog = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
  return { steamLog, stdout: result.stdout };
}

const readJson = (dir, path) => JSON.parse(readFileSync(join(dir, path), 'utf8'));

test('sync-jogos: o cache por app evita refazer HEAD/GetItems e o resultado é idêntico', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kamyli-sync-'));
  try {
    mkdirSync(join(dir, 'data/content'), { recursive: true });
    writeFileSync(join(dir, 'fixture.json'), JSON.stringify(FIXTURE));
    writeFileSync(join(dir, 'stub.mjs'), STUB);

    const cold = runSync(dir);
    assert.ok(cold.steamLog.length > 0, 'a 1ª execução consulta a Steam');
    assert.ok(cold.steamLog.filter(line => line.startsWith('cdn:')).every(line => line === 'cdn:HEAD:ua'), 'CDN recebe User-Agent identificado');
    assert.ok(cold.steamLog.includes('GetItems'));

    const games = readJson(dir, 'data/content/jogos.json').games;
    assert.equal(games[0].artwork.url, `${STORE}steam/apps/111/library_capsule.jpg`);
    assert.equal(games[1].artwork.url, `${STORE}steam/apps/222/${'b'.repeat(40)}/library_capsule_2x.jpg?t=20`);
    assert.equal(games[1].icon.provider, 'steam-original');

    const cache = readJson(dir, 'data/content/jogos-artwork-cache.json');
    assert.equal(cache.version, 3);
    assert.deepEqual(Object.keys(cache.apps).sort(), ['111', '222']);
    assert.ok(cache.apps['222'].items.candidates.some(candidate => candidate.kind === 'header'));

    const firstOutputs = ['jogos.json', 'jogos-artwork.json'].map(name => {
      const value = readJson(dir, `data/content/${name}`);
      delete value.updatedAt;
      return value;
    });

    const warm = runSync(dir);
    assert.deepEqual(warm.steamLog, [], 'com cache válido a 2ª execução não faz nenhuma requisição à Steam');
    assert.match(warm.stdout, /Steam: 0 requisições/);

    const secondOutputs = ['jogos.json', 'jogos-artwork.json'].map(name => {
      const value = readJson(dir, `data/content/${name}`);
      delete value.updatedAt;
      return value;
    });
    assert.deepEqual(secondOutputs, firstOutputs);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('sync-jogos: HTTP 429 interrompe a Steam e preserva capa/ícone já publicados', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kamyli-sync-'));
  try {
    mkdirSync(join(dir, 'data/content'), { recursive: true });
    writeFileSync(join(dir, 'fixture.json'), JSON.stringify(FIXTURE));
    writeFileSync(join(dir, 'stub.mjs'), STUB);
    runSync(dir);

    const published = readJson(dir, 'data/content/jogos.json');
    const publishedManifest = readJson(dir, 'data/content/jogos-artwork.json');

    // Simula o pior caso: cache apagado e a Steam respondendo 429.
    const cache = readJson(dir, 'data/content/jogos-artwork-cache.json');
    cache.apps = {};
    writeFileSync(join(dir, 'data/content/jogos-artwork-cache.json'), JSON.stringify(cache));

    const blocked = runSync(dir, '429');
    assert.equal(blocked.steamLog.length, 1, 'após o primeiro 429 nenhuma outra requisição é feita');
    assert.match(blocked.stdout, /acesso interrompido \(HTTP 429\)/);
    assert.match(blocked.stdout, /::warning title=Steam::/);

    const after = readJson(dir, 'data/content/jogos.json');
    assert.deepEqual(after.games, published.games, 'capas, ícones e App IDs não podem ser apagados por um bloqueio temporário');
    const afterManifest = readJson(dir, 'data/content/jogos-artwork.json');
    assert.deepEqual(afterManifest.games, publishedManifest.games);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
