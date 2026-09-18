import { readFile, writeFile } from "node:fs/promises";

const BOARD_ID = process.env.TRELLO_BOARD_ID || "IfgV0jXS";
const BOARD_URL = "https://trello.com/b/IfgV0jXS/jogos-das-lives";
const TRELLO_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY;
const OUT = "data/content/jogos.json";
const CACHE = "data/content/jogos-artwork-cache.json";

if (!TRELLO_KEY || !TRELLO_TOKEN || !STEAM_WEB_API_KEY) {
  throw new Error("TRELLO_API_KEY, TRELLO_TOKEN e STEAM_WEB_API_KEY são obrigatórios.");
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
const steamApiHeaders = { "x-webapi-key": STEAM_WEB_API_KEY };
const STEAM_API_BASE = "https://api.steampowered.com/";
const STEAM_STORE_ASSET_BASE = "https://shared.fastly.steamstatic.com/store_item_assets/";
const STEAM_LEGACY_ASSET_BASE = "https://cdn.cloudflare.steamstatic.com/steam/apps/";
const STEAM_COMMUNITY_ICON_BASE = "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/";

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
  const endpoint = new URL("IStoreBrowseService/GetItems/v1/", STEAM_API_BASE);
  endpoint.searchParams.set("input_json", JSON.stringify({
    ids: [{ appid: appId }],
    context: { language: "english", country_code: "BR" },
    data_request: { include_assets: true }
  }));

  const payload = await getJson(endpoint, { headers: steamApiHeaders });
  const item = (payload?.response?.store_items || []).find(entry => Number(entry?.appid) === appId);
  if (!item || (item.success != null && Number(item.success) !== 1)) return null;

  const assets = item.assets || {};
  for (const filename of [assets.library_capsule_2x, assets.library_capsule]) {
    const url = buildSteamStoreAssetUrl(appId, assets, filename);
    if (url && await urlExists(url)) return url;
  }
  return null;
}

function buildSteamCommunityIconUrl(appId, hash) {
  const iconHash = String(hash || "").trim().toLowerCase();
  if (!Number.isSafeInteger(appId) || appId <= 0 || !/^[a-f0-9]{40}$/.test(iconHash)) return null;
  return `${STEAM_COMMUNITY_ICON_BASE}${appId}/${iconHash}.jpg`;
}

async function getSteamCommunityIcons(appIds) {
  const uniqueAppIds = [...new Set(appIds.filter(appId => Number.isSafeInteger(appId) && appId > 0))];
  const icons = new Map();
  const batchSize = 50;

  for (let offset = 0; offset < uniqueAppIds.length; offset += batchSize) {
    const batch = uniqueAppIds.slice(offset, offset + batchSize);
    const endpoint = new URL("IStoreBrowseService/GetItems/v1/", STEAM_API_BASE);
    endpoint.searchParams.set("input_json", JSON.stringify({
      ids: batch.map(appid => ({ appid })),
      context: { language: "english", country_code: "BR" },
      data_request: { include_assets: true }
    }));

    try {
      const payload = await getJson(endpoint, { headers: steamApiHeaders });
      for (const item of payload?.response?.store_items || []) {
        const appId = Number(item?.appid);
        const url = buildSteamCommunityIconUrl(appId, item?.assets?.community_icon);
        if (url) icons.set(appId, { provider: "steam-original", steamAppId: appId, url });
      }
    } catch (error) {
      console.warn(`Steam community icons: lote ${Math.floor(offset / batchSize) + 1}: ${error.message}; continuando sem ícone.`);
    }

    if (offset + batchSize < uniqueAppIds.length) await sleep(100);
  }

  return icons;
}

async function hasOriginalSteamPortrait(appId) {
  const directCandidates = [
    `${STEAM_STORE_ASSET_BASE}steam/apps/${appId}/library_capsule_2x.jpg`,
    `${STEAM_STORE_ASSET_BASE}steam/apps/${appId}/library_capsule.jpg`,
    `${STEAM_LEGACY_ASSET_BASE}${appId}/library_600x900_2x.jpg`,
    `${STEAM_LEGACY_ASSET_BASE}${appId}/library_600x900.jpg`,
  ];

  for (const url of directCandidates) {
    if (await urlExists(url)) return url;
  }

  // Alguns jogos recentes publicam a Library Capsule sob um caminho com hash.
  // Nesse caso, a consulta permanece dentro da infraestrutura oficial da Steam e
  // serve apenas para obter o caminho do asset; a identificação do jogo é feita
  // pela Web API documentada IStoreService/GetAppList.
  try {
    return await getStoreBrowsePortrait(appId);
  } catch (error) {
    console.warn(`Steam Store assets: app ${appId}: ${error.message}.`);
    return null;
  }
}

async function getSteamAppCatalog() {
  const apps = [];
  let lastAppId = 0;
  let page = 0;

  while (true) {
    const endpoint = new URL("IStoreService/GetAppList/v1/", STEAM_API_BASE);
    const input = {
      include_games: true,
      include_dlc: false,
      include_software: false,
      include_videos: false,
      include_hardware: false,
      max_results: 50000,
    };
    if (lastAppId > 0) input.last_appid = lastAppId;
    endpoint.searchParams.set("input_json", JSON.stringify(input));

    const payload = await getJson(endpoint, { headers: steamApiHeaders });
    const response = payload?.response || {};
    const pageApps = Array.isArray(response.apps) ? response.apps : [];
    for (const app of pageApps) {
      const appId = Number(app?.appid);
      const name = String(app?.name || "").trim();
      if (Number.isSafeInteger(appId) && appId > 0 && name) apps.push({ appid: appId, name });
    }

    page += 1;
    if (!response.have_more_results) break;

    const nextLastAppId = Number(response.last_appid);
    if (!Number.isSafeInteger(nextLastAppId) || nextLastAppId <= lastAppId) {
      throw new Error("Steam IStoreService/GetAppList retornou paginação inválida.");
    }
    if (page >= 20) throw new Error("Steam IStoreService/GetAppList excedeu o limite de segurança de paginação.");
    lastAppId = nextLastAppId;
    await sleep(100);
  }

  console.log(`Steam Web API: ${apps.length} jogos carregados em ${page} página(s).`);
  return apps;
}

function buildSteamNameIndex(apps) {
  const index = new Map();
  for (const app of apps) {
    const key = normalize(app.name);
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    const bucket = index.get(key);
    if (!bucket.some(item => item.appid === app.appid)) bucket.push(app);
  }
  return index;
}

function findSteamApp(name, index) {
  for (const lookupName of getSteamLookupNames(name)) {
    const matches = index.get(normalize(lookupName)) || [];
    if (matches.length === 1) return { status: "resolved", app: matches[0] };
    if (matches.length > 1) return { status: "unresolved", reason: "steam-ambiguous" };
  }
  return { status: "unresolved", reason: "steam-not-found" };
}

function migrateArtworkCache(raw) {
  if (raw?.version === 3 && raw.entries && typeof raw.entries === "object") return raw;

  const migrated = { version: 3, entries: {} };
  if (raw?.version !== 2 || !raw.entries || typeof raw.entries !== "object") return migrated;

  for (const [key, entry] of Object.entries(raw.entries)) {
    if (
      entry?.status === "resolved"
      && entry?.source === "steam-original"
      && Number.isSafeInteger(entry?.steamAppId)
      && entry.steamAppId > 0
      && typeof entry?.url === "string"
      && entry.url.startsWith("https://")
    ) {
      migrated.entries[key] = {
        status: "resolved",
        source: "steam-original",
        steamAppId: entry.steamAppId,
        url: entry.url,
      };
    }
  }
  return migrated;
}

async function resolveArtwork(name, cache, getSteamIndex) {
  const key = normalize(name);
  const cached = cache.entries[key];
  if (cached?.status === "resolved" && cached?.source === "steam-original") return cached;
  if (cached?.status === "unresolved" && cached.checkedAt && Date.now() - Date.parse(cached.checkedAt) < 7 * 86400000) return cached;

  const steamIndex = await getSteamIndex();
  const match = findSteamApp(name, steamIndex);
  if (match.status !== "resolved") {
    const unresolved = { status: "unresolved", reason: match.reason, checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  const appId = match.app.appid;
  const url = await hasOriginalSteamPortrait(appId);
  if (!url) {
    const unresolved = { status: "unresolved", reason: "no-steam-library-capsule", steamAppId: appId, checkedAt: new Date().toISOString() };
    cache.entries[key] = unresolved;
    return unresolved;
  }

  const resolved = {
    status: "resolved",
    source: "steam-original",
    steamAppId: appId,
    url,
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

let rawCache = null;
try { rawCache = JSON.parse(await readFile(CACHE, "utf8")); } catch {}
const cache = migrateArtworkCache(rawCache);
let steamIndexPromise = null;
const getSteamIndex = async () => {
  if (!steamIndexPromise) steamIndexPromise = getSteamAppCatalog().then(buildSteamNameIndex);
  return steamIndexPromise;
};

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
      const match = await resolveArtwork(card.name, cache, getSteamIndex);
      if (Number.isInteger(match.steamAppId)) steamAppId = match.steamAppId;
      if (match.status === "resolved") artwork = { provider: "steam-original", steamAppId: match.steamAppId, url: match.url };
    } catch (error) {
      console.warn(`Steam Web API: ${card.name}: ${error.message}`);
    }
  }

  const steamUrl = steamAppId ? `https://store.steampowered.com/app/${steamAppId}/` : null;
  games.push({ id: card.id, name: card.name, listId: list.id, listName: list.name, pos: card.pos, artwork, icon: null, steamAppId, steamUrl });
}

const steamCommunityIcons = await getSteamCommunityIcons(games.map(game => game.steamAppId));
for (const game of games) {
  if (Number.isSafeInteger(game.steamAppId) && game.steamAppId > 0) {
    game.icon = steamCommunityIcons.get(game.steamAppId) || null;
  }
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
