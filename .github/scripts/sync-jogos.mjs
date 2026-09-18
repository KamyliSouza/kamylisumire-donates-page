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
const sgdbHeaders = { Authorization: `Bearer ${SGDB_KEY}` };
const STEAM_STORE_ASSET_BASE = "https://shared.fastly.steamstatic.com/store_item_assets/";
const STEAM_LEGACY_ASSET_BASE = "https://cdn.cloudflare.steamstatic.com/steam/apps/";

function getSteamLookupNames(name) {
  const original = String(name || "").trim();
  const withoutEditorialYear = original.replace(/\s*\((?:19|20)\d{2}\)\s*$/, "").trim();
  return [...new Set([original, withoutEditorialYear].filter(Boolean))];
}

function getSteamAppIdFromDescription(card) {
  const description = String(card?.desc || "");
  const markerLines = description
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^steam\s*app\s*id\s*:/i.test(line));

  if (!markerLines.length) return null;

  const values = [];
  for (const line of markerLines) {
    const match = line.match(/^steam\s*app\s*id\s*:\s*([1-9][0-9]*)\s*$/i);
    if (!match) {
      console.warn(`Trello: SteamAppID inválido na descrição de "${card.name}"; usando resolução automática.`);
      return null;
    }

    const appId = Number(match[1]);
    if (!Number.isSafeInteger(appId) || appId <= 0) {
      console.warn(`Trello: SteamAppID fora do intervalo válido na descrição de "${card.name}"; usando resolução automática.`);
      return null;
    }
    values.push(appId);
  }

  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length !== 1) {
    console.warn(`Trello: mais de um SteamAppID diferente na descrição de "${card.name}"; usando resolução automática.`);
    return null;
  }
  return uniqueValues[0];
}

async function urlExists(url) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.ok;
  } catch {
    return false;
  }
}

function buildSteamStoreAssetUrl(appId, assets, filename) {
  const file = String(filename || "").trim().replace(/^\/+/, "");
  if (!file) return null;

  const fallbackFormat = "steam/apps/" + appId + "/${FILENAME}";
  const format = String(assets?.asset_url_format || fallbackFormat);
  const expanded = format.includes("${FILENAME}") ? format.replace("${FILENAME}", file) : fallbackFormat.replace("${FILENAME}", file);
  const appPath = `steam/apps/${appId}/`;
  const offset = expanded.indexOf(appPath);
  if (offset < 0) return null;

  const url = new URL(expanded.slice(offset), STEAM_STORE_ASSET_BASE);
  if (url.protocol !== "https:" || url.hostname !== "shared.fastly.steamstatic.com") return null;
  if (!url.pathname.startsWith(`/store_item_assets/${appPath}`)) return null;
  return url.toString();
}

async function getStoreBrowsePortrait(appId) {
  const endpoint = new URL("https://api.steampowered.com/IStoreBrowseService/GetItems/v1/");
  endpoint.searchParams.set("input_json", JSON.stringify({
    ids: [{ appid: appId }],
    context: { language: "english", country_code: "BR" },
    data_request: { include_assets: true }
  }));

  const payload = await getJson(endpoint);
  const item = (payload?.response?.store_items || []).find(entry => Number(entry?.appid) === appId);
  if (!item || (item.success != null && Number(item.success) !== 1)) return null;

  const assets = item.assets || {};
  for (const filename of [assets.library_capsule_2x, assets.library_capsule]) {
    const url = buildSteamStoreAssetUrl(appId, assets, filename);
    if (url && await urlExists(url)) return url;
  }
  return null;
}

async function hasOriginalSteamPortrait(appId) {
  try {
    const modernUrl = await getStoreBrowsePortrait(appId);
    if (modernUrl) return modernUrl;
  } catch (error) {
    console.warn(`Steam StoreBrowse: app ${appId}: ${error.message}; tentando CDN legada.`);
  }

  for (const filename of ["library_600x900_2x.jpg", "library_600x900.jpg"]) {
    const url = `${STEAM_LEGACY_ASSET_BASE}${appId}/${filename}`;
    if (await urlExists(url)) return url;
  }
  return null;
}

async function resolveArtwork(name, cache) {
  const key = normalize(name);
  const lookupNames = getSteamLookupNames(name);
  const cached = cache.entries[key];
  const retryLegacyMiss = cached?.reason === "no-original-steam-portrait";
  const retryEditorialYearMiss = cached?.reason === "not-found" && lookupNames.length > 1;
  if (cached?.status === "resolved" && cached?.source === "steam-original") return cached;
  if (cached?.status === "unresolved" && !retryLegacyMiss && !retryEditorialYearMiss && cached.checkedAt && Date.now() - Date.parse(cached.checkedAt) < 7 * 86400000) return cached;
  await sleep(150);

  // SteamGridDB continua sendo usado somente para confirmar uma correspondência
  // exata/inequívoca do título. Um ano editorial final, como "(2026)", pode ser
  // ignorado apenas durante a busca; o nome publicado no Trello não é alterado.
  let exact = [];
  let ambiguous = false;
  for (const lookupName of lookupNames) {
    const lookupKey = normalize(lookupName);
    const search = await getJson(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(lookupName)}`, { headers: sgdbHeaders });
    const matches = (search.data || []).filter(game => normalize(game.name) === lookupKey && (game.types || []).includes("steam"));
    if (matches.length > 1) {
      ambiguous = true;
      break;
    }
    if (matches.length === 1) {
      exact = matches;
      break;
    }
  }
  if (exact.length !== 1) {
    const unresolved = { status: "unresolved", reason: ambiguous ? "ambiguous" : "not-found", checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  // O catálogo normal de grids do SteamGridDB contém uploads comunitários. Para
  // garantir o asset original, resolvemos o App ID por correspondência exata na
  // loja Steam e consultamos a Library Capsule oficial publicada pela própria Steam.
  const canonicalName = String(exact[0].name || name).trim();
  const canonicalKey = normalize(canonicalName);
  const storeUrl = new URL("https://store.steampowered.com/api/storesearch/");
  storeUrl.searchParams.set("term", canonicalName);
  storeUrl.searchParams.set("l", "portuguese");
  storeUrl.searchParams.set("cc", "BR");
  const store = await getJson(storeUrl);
  const steamExact = (store.items || []).filter(item => normalize(item.name) === canonicalKey && Number.isInteger(item.id));
  if (steamExact.length !== 1) {
    const unresolved = { status: "unresolved", reason: steamExact.length ? "steam-ambiguous" : "steam-not-found", gameId: exact[0].id, checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  const appId = steamExact[0].id;
  const url = await hasOriginalSteamPortrait(appId);
  if (!url) {
    const unresolved = { status: "unresolved", reason: "no-steam-library-capsule", gameId: exact[0].id, steamAppId: appId, checkedAt: new Date().toISOString() };
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
const cardsRaw = await getJson(trelloUrl(`/boards/${BOARD_ID}/cards`, {
  fields: "id,name,idList,pos,closed,desc",
  filter: "open"
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
  let steamAppId = getSteamAppIdFromDescription(card);

  if (steamAppId) {
    try {
      const url = await hasOriginalSteamPortrait(steamAppId);
      if (url) artwork = { provider: "steam-original", steamAppId, url };
      console.log(`Steam via descrição do Trello: ${card.name} -> ${steamAppId}${url ? " (capa original)" : " (sem capa vertical original)"}`);
    } catch (error) {
      console.warn(`Steam via descrição do Trello: ${card.name}: ${error.message}`);
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
