import { readFile, writeFile } from "node:fs/promises";

const BOARD_ID = process.env.TRELLO_BOARD_ID || "IfgV0jXS";
const BOARD_URL = "https://trello.com/b/IfgV0jXS/jogos-das-lives";
const TRELLO_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const SGDB_KEY = process.env.STEAMGRIDDB_API_KEY;
const OUT = "data/content/jogos.json";
const CACHE = "data/content/jogos-artwork-cache.json";

if (!TRELLO_KEY || !TRELLO_TOKEN || !SGDB_KEY) {
  throw new Error("TRELLO_API_KEY, TRELLO_TOKEN e STEAMGRIDDB_API_KEY são obrigatórios.");
}

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function trelloUrl(path, params = {}) {
  const url = new URL(`https://api.trello.com/1${path}`);
  url.searchParams.set("key", TRELLO_KEY);
  url.searchParams.set("token", TRELLO_TOKEN);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sgdbHeaders = { Authorization: `Bearer ${SGDB_KEY}` };

async function resolveArtwork(name, cache) {
  const key = normalize(name);
  const cached = cache.entries[key];
  if (cached?.status === "resolved") return cached;
  if (cached?.status === "unresolved" && cached.checkedAt && Date.now() - Date.parse(cached.checkedAt) < 7 * 86400000) return cached;
  await sleep(150);

  const search = await getJson(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(name)}`, { headers: sgdbHeaders });
  const exact = (search.data || []).filter(game => normalize(game.name) === key);
  if (exact.length !== 1) {
    const unresolved = { status: "unresolved", reason: exact.length ? "ambiguous" : "not-found", checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  const game = exact[0];
  const url = new URL(`https://www.steamgriddb.com/api/v2/grids/game/${game.id}`);
  url.searchParams.set("dimensions", "600x900");
  url.searchParams.set("types", "static");
  url.searchParams.set("nsfw", "false");
  url.searchParams.set("humor", "false");
  const grids = await getJson(url, { headers: sgdbHeaders });
  const candidates = (grids.data || []).filter(item => item.url && item.width === 600 && item.height === 900);
  candidates.sort((a, b) => (b.score || 0) - (a.score || 0) || a.id - b.id);
  if (!candidates.length) {
    const unresolved = { status: "unresolved", reason: "no-600x900-grid", gameId: game.id, checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  const grid = candidates[0];
  const resolved = {
    status: "resolved",
    gameId: game.id,
    artworkId: grid.id,
    url: grid.url
  };
  cache.entries[key] = resolved;
  return resolved;
}

const listsRaw = await getJson(trelloUrl(`/boards/${BOARD_ID}/lists`, { fields: "id,name,pos,closed", filter: "open" }));
const cardsRaw = await getJson(trelloUrl(`/boards/${BOARD_ID}/cards`, { fields: "id,name,idList,pos,closed", filter: "open" }));
const lists = listsRaw.filter(item => !item.closed).sort((a, b) => a.pos - b.pos).map(item => ({ id: item.id, name: item.name, pos: item.pos }));
const listMap = new Map(lists.map(item => [item.id, item]));
const cards = cardsRaw.filter(item => !item.closed && listMap.has(item.idList)).sort((a, b) => a.pos - b.pos);

let cache;
try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch { cache = { version: 1, entries: {} }; }
if (cache.version !== 1 || !cache.entries || typeof cache.entries !== "object") cache = { version: 1, entries: {} };

const games = [];
for (const card of cards) {
  const list = listMap.get(card.idList);
  let artwork = null;
  try {
    const match = await resolveArtwork(card.name, cache);
    if (match.status === "resolved") artwork = { provider: "steamgriddb", gameId: match.gameId, artworkId: match.artworkId, url: match.url };
  } catch (error) {
    console.warn(`SteamGridDB: ${card.name}: ${error.message}`);
  }
  games.push({ id: card.id, name: card.name, listId: list.id, listName: list.name, pos: card.pos, artwork });
}

let previous = null;
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const stable = { version: 1, board: { id: BOARD_ID, url: BOARD_URL }, lists, games };
const previousStable = previous ? { version: previous.version, board: previous.board, lists: previous.lists, games: previous.games } : null;
const changed = JSON.stringify(stable) !== JSON.stringify(previousStable);
const output = { ...stable, updatedAt: changed ? new Date().toISOString() : (previous?.updatedAt || null) };
await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(CACHE, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Sincronização concluída: ${lists.length} listas, ${games.length} jogos.`);
