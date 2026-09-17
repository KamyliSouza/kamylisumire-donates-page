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

function safeUrlLabel(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "requisição externa";
  }
}

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${safeUrlLabel(url)}: HTTP ${response.status}`);
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
const STEAM_FIELD_NAMES = new Set(["steam app id", "steam id", "steamid"]);
const sgdbHeaders = { Authorization: `Bearer ${SGDB_KEY}` };


function findSteamAppIdField(customFields) {
  const candidates = (customFields || []).filter(field => STEAM_FIELD_NAMES.has(normalize(field?.name)));
  if (!candidates.length) return null;

  const preferred = candidates.filter(field => normalize(field?.name) === "steam app id");
  const field = preferred.length === 1 ? preferred[0] : (candidates.length === 1 ? candidates[0] : null);
  if (!field) {
    console.warn('Trello: mais de um campo compatível com "Steam App ID"; overrides ignorados até remover a ambiguidade.');
    return null;
  }

  if (!new Set(["text", "number"]).has(field.type)) {
    console.warn(`Trello: o campo "${field.name}" deve ser Texto ou Número; overrides ignorados.`);
    return null;
  }

  return field;
}

function getSteamAppIdFromCard(card, field) {
  if (!field || !Array.isArray(card?.customFieldItems)) return null;
  const item = card.customFieldItems.find(value => value?.idCustomField === field.id);
  if (!item) return null;

  const raw = item.value?.text ?? item.value?.number ?? "";
  const value = String(raw).trim();
  if (!value) return null;
  if (!/^[1-9][0-9]*$/.test(value)) {
    console.warn(`Trello: Steam App ID inválido em "${card.name}"; usando resolução automática.`);
    return null;
  }

  const appId = Number(value);
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    console.warn(`Trello: Steam App ID fora do intervalo válido em "${card.name}"; usando resolução automática.`);
    return null;
  }
  return appId;
}

async function hasOriginalSteamPortrait(appId) {
  const url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
  const response = await fetch(url, { method: "HEAD", redirect: "follow" });
  return response.ok ? url : null;
}

async function resolveArtwork(name, cache) {
  const key = normalize(name);
  const cached = cache.entries[key];
  if (cached?.status === "resolved" && cached?.source === "steam-original") return cached;
  if (cached?.status === "unresolved" && cached.checkedAt && Date.now() - Date.parse(cached.checkedAt) < 7 * 86400000) return cached;
  await sleep(150);

  // SteamGridDB continua sendo usado somente para confirmar uma correspondência
  // exata/inequívoca do título. Grids comunitários não são mais publicados.
  const search = await getJson(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(name)}`, { headers: sgdbHeaders });
  const exact = (search.data || []).filter(game => normalize(game.name) === key && (game.types || []).includes("steam"));
  if (exact.length !== 1) {
    const unresolved = { status: "unresolved", reason: exact.length ? "ambiguous" : "not-found", checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  // O catálogo normal de grids do SteamGridDB contém uploads comunitários. Para
  // garantir o asset original, resolvemos o App ID por correspondência exata na
  // loja Steam e usamos diretamente a cápsula vertical oficial da Steam CDN.
  const storeUrl = new URL("https://store.steampowered.com/api/storesearch/");
  storeUrl.searchParams.set("term", name);
  storeUrl.searchParams.set("l", "portuguese");
  storeUrl.searchParams.set("cc", "BR");
  const store = await getJson(storeUrl);
  const steamExact = (store.items || []).filter(item => normalize(item.name) === key && Number.isInteger(item.id));
  if (steamExact.length !== 1) {
    const unresolved = { status: "unresolved", reason: steamExact.length ? "steam-ambiguous" : "steam-not-found", gameId: exact[0].id, checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  const appId = steamExact[0].id;
  const url = await hasOriginalSteamPortrait(appId);
  if (!url) {
    const unresolved = { status: "unresolved", reason: "no-original-steam-portrait", gameId: exact[0].id, steamAppId: appId, checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  const resolved = {
    status: "resolved",
    source: "steam-original",
    gameId: exact[0].id,
    steamAppId: appId,
    url
  };
  cache.entries[key] = resolved;
  return resolved;
}

const listsRaw = await getJson(trelloUrl(`/boards/${BOARD_ID}/lists`, { fields: "id,name,pos,closed", filter: "open" }));
const customFieldsRaw = await getJson(trelloUrl(`/boards/${BOARD_ID}/customFields`));
const steamAppIdField = findSteamAppIdField(customFieldsRaw);
if (steamAppIdField) console.log(`Trello: usando o campo personalizado "${steamAppIdField.name}" para overrides Steam.`);
const cardsRaw = await getJson(trelloUrl(`/boards/${BOARD_ID}/cards`, {
  fields: "id,name,idList,pos,closed",
  filter: "open",
  customFieldItems: "true"
}));
const lists = listsRaw.filter(item => !item.closed).sort((a, b) => a.pos - b.pos).map(item => ({ id: item.id, name: item.name, pos: item.pos }));
const listMap = new Map(lists.map(item => [item.id, item]));
const cards = cardsRaw.filter(item => !item.closed && listMap.has(item.idList)).sort((a, b) => a.pos - b.pos);

let cache;
try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch { cache = { version: 2, entries: {} }; }
if (cache.version !== 2 || !cache.entries || typeof cache.entries !== "object") cache = { version: 2, entries: {} };

const games = [];
for (const card of cards) {
  const list = listMap.get(card.idList);
  let artwork = null;
  let steamAppId = getSteamAppIdFromCard(card, steamAppIdField);

  if (steamAppId) {
    try {
      const url = await hasOriginalSteamPortrait(steamAppId);
      if (url) artwork = { provider: "steam-original", steamAppId, url };
      console.log(`Steam via Trello: ${card.name} -> ${steamAppId}${url ? " (capa original)" : " (sem capa vertical original)"}`);
    } catch (error) {
      console.warn(`Steam via Trello: ${card.name}: ${error.message}`);
    }
  } else {
    try {
      const match = await resolveArtwork(card.name, cache);
      if (Number.isInteger(match.steamAppId)) steamAppId = match.steamAppId;
      if (match.status === "resolved") artwork = { provider: "steam-original", gameId: match.gameId, steamAppId: match.steamAppId, url: match.url };
    } catch (error) {
      console.warn(`SteamGridDB: ${card.name}: ${error.message}`);
    }
  }

  const steamUrl = steamAppId ? `https://store.steampowered.com/app/${steamAppId}/` : null;
  games.push({ id: card.id, name: card.name, listId: list.id, listName: list.name, pos: card.pos, artwork, steamAppId, steamUrl });
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
