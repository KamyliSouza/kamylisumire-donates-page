import { readFile, writeFile } from "node:fs/promises";

const BOARD_ID = process.env.TRELLO_AGENDA_BOARD_ID;
const TRELLO_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const OUT = "data/agenda.json";
const GAMES = "data/content/jogos.json";

if (!BOARD_ID || !TRELLO_KEY || !TRELLO_TOKEN) {
  throw new Error("TRELLO_AGENDA_BOARD_ID, TRELLO_API_KEY e TRELLO_TOKEN são obrigatórios.");
}

const DAY_DEFINITIONS = [
  { id: "domingo", name: "Domingo", offset: 0, aliases: ["domingo"] },
  { id: "segunda", name: "Segunda-feira", offset: 1, aliases: ["segunda", "segunda feira"] },
  { id: "terca", name: "Terça-feira", offset: 2, aliases: ["terca", "terca feira"] },
  { id: "quarta", name: "Quarta-feira", offset: 3, aliases: ["quarta", "quarta feira"] },
  { id: "quinta", name: "Quinta-feira", offset: 4, aliases: ["quinta", "quinta feira"] },
  { id: "sexta", name: "Sexta-feira", offset: 5, aliases: ["sexta", "sexta feira"] },
  { id: "sabado", name: "Sábado", offset: 6, aliases: ["sabado"] },
];

const PLATFORM_NAMES = new Map([
  ["youtube", "YouTube"],
  ["twitch", "Twitch"],
]);

function safeUrlLabel(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "requisição externa";
  }
}

async function getJson(url) {
  const response = await fetch(url);
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

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseIsoDate(value, label) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label}: data deve usar YYYY-MM-DD.`);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error(`${label}: data inválida.`);
  }
  return date;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function weekStartFor(date) {
  return addDays(date, -date.getUTCDay());
}

function parseBoardSettings(description) {
  let weekStart = null;
  let observation = null;

  for (const rawLine of String(description || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const weekMatch = line.match(/^semana\s*:\s*(\d{4}-\d{2}-\d{2})\s*$/i);
    if (weekMatch) {
      if (weekStart) throw new Error("Trello Agenda: mais de uma linha Semana: na descrição do quadro.");
      weekStart = parseIsoDate(weekMatch[1], "Trello Agenda: Semana");
      if (weekStart.getUTCDay() !== 0) throw new Error("Trello Agenda: Semana: deve apontar para um domingo.");
      continue;
    }

    const observationMatch = line.match(/^observa[cç][aã]o\s*:\s*(.*)$/i);
    if (observationMatch) {
      if (observation !== null) throw new Error("Trello Agenda: mais de uma linha Observacao: na descrição do quadro.");
      observation = observationMatch[1].trim();
    }
  }

  return { weekStart, observation };
}

function getDayDefinition(listName) {
  const key = normalize(listName);
  return DAY_DEFINITIONS.find(day => day.aliases.includes(key)) || null;
}

function parseTime(value, cardName) {
  const text = String(value || "").trim();
  if (!text || normalize(text) === "a definir") return "";
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text)) {
    throw new Error(`Trello Agenda: Horario inválido em "${cardName}"; use HH:MM ou A definir.`);
  }
  return text;
}

function parsePlatforms(value, cardName) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error(`Trello Agenda: Plataformas: é obrigatório em "${cardName}".`);

  const platforms = [];
  for (const part of raw.split(/[,;•|]/)) {
    const canonical = PLATFORM_NAMES.get(normalize(part));
    if (!canonical) {
      throw new Error(`Trello Agenda: plataforma inválida em "${cardName}": "${part.trim()}". Use YouTube e/ou Twitch.`);
    }
    if (!platforms.includes(canonical)) platforms.push(canonical);
  }

  if (!platforms.length) throw new Error(`Trello Agenda: nenhuma plataforma válida em "${cardName}".`);
  return platforms;
}

function parseSteamAppId(value, cardName) {
  const text = String(value || "").trim();
  if (!/^[1-9][0-9]*$/.test(text)) {
    throw new Error(`Trello Agenda: SteamAppID inválido em "${cardName}"; use apenas o App ID numérico da Steam.`);
  }
  const appId = Number(text);
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw new Error(`Trello Agenda: SteamAppID fora do intervalo válido em "${cardName}".`);
  }
  return appId;
}

function officialSteamIcon(icon, appId) {
  if (!icon || icon.provider !== "steam-original" || icon.steamAppId !== appId) return null;
  if (typeof icon.url !== "string") return null;

  let url;
  try {
    url = new URL(icon.url);
  } catch {
    return null;
  }

  const filename = url.pathname.split("/").pop() || "";
  const valid =
    url.protocol === "https:" &&
    url.hostname === "cdn.cloudflare.steamstatic.com" &&
    url.pathname.startsWith(`/steamcommunity/public/images/apps/${appId}/`) &&
    /^[a-f0-9]{40}\.jpg$/i.test(filename);

  if (!valid) return null;
  return { provider: "steam-original", steamAppId: appId, url: url.toString() };
}

async function loadGameIconIndex() {
  let catalog;
  try {
    catalog = JSON.parse(await readFile(GAMES, "utf8"));
  } catch (error) {
    throw new Error(`Agenda: não foi possível ler ${GAMES}: ${error.message}`);
  }

  if (!Array.isArray(catalog?.games)) {
    throw new Error(`Agenda: ${GAMES} não possui uma lista games válida.`);
  }

  const index = new Map();
  for (const game of catalog.games) {
    const appId = game?.steamAppId;
    if (!Number.isSafeInteger(appId) || appId <= 0) continue;
    const icon = officialSteamIcon(game.icon, appId);
    const current = index.get(appId);
    if (!current || (!current.icon && icon)) {
      index.set(appId, { icon });
    }
  }
  return index;
}

function parseCard(card) {
  const title = String(card?.name || "").trim();
  if (!title) throw new Error("Trello Agenda: card sem título.");

  let date = null;
  let time = null;
  let platforms = null;
  let steamAppId = null;
  let description = "";
  let descriptionContinuation = false;

  for (const rawLine of String(card?.desc || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (descriptionContinuation && description) description += "\n";
      continue;
    }

    const marker = line.match(/^([^:]+)\s*:\s*(.*)$/);
    if (marker) {
      const key = normalize(marker[1]);
      const value = marker[2].trim();

      if (key === "data") {
        if (date) throw new Error(`Trello Agenda: Data: duplicada em "${title}".`);
        date = formatIsoDate(parseIsoDate(value, `Trello Agenda: Data de "${title}"`));
        descriptionContinuation = false;
        continue;
      }

      if (key === "horario") {
        if (time !== null) throw new Error(`Trello Agenda: Horario: duplicado em "${title}".`);
        time = parseTime(value, title);
        descriptionContinuation = false;
        continue;
      }

      if (key === "plataformas") {
        if (platforms !== null) throw new Error(`Trello Agenda: Plataformas: duplicada em "${title}".`);
        platforms = parsePlatforms(value, title);
        descriptionContinuation = false;
        continue;
      }

      if (key === "steamappid" || key === "steam app id") {
        if (steamAppId !== null) throw new Error(`Trello Agenda: SteamAppID: duplicado em "${title}".`);
        steamAppId = parseSteamAppId(value, title);
        descriptionContinuation = false;
        continue;
      }

      if (key === "descricao") {
        if (description) throw new Error(`Trello Agenda: Descricao: duplicada em "${title}".`);
        description = value;
        descriptionContinuation = true;
        continue;
      }
    }

    if (descriptionContinuation) {
      description += `${description ? "\n" : ""}${line}`;
    }
  }

  if (time === null) time = "";
  if (platforms === null) throw new Error(`Trello Agenda: falta Plataformas: em "${title}".`);

  return {
    title,
    date,
    time,
    description: description.trim(),
    platforms,
    steamAppId,
    icon: null,
    pos: Number(card?.pos) || 0,
  };
}

function compareLives(a, b) {
  const aTimed = Boolean(a.time);
  const bTimed = Boolean(b.time);
  if (aTimed && bTimed && a.time !== b.time) return a.time.localeCompare(b.time);
  if (aTimed !== bTimed) return aTimed ? -1 : 1;
  return a.pos - b.pos;
}

function formatUpdateDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const [boardRaw, listsRaw, cardsRaw] = await Promise.all([
  getJson(trelloUrl(`/boards/${BOARD_ID}`, { fields: "id,name,desc,shortUrl" })),
  getJson(trelloUrl(`/boards/${BOARD_ID}/lists`, { fields: "id,name,pos,closed", filter: "open" })),
  getJson(trelloUrl(`/boards/${BOARD_ID}/cards`, { fields: "id,name,idList,pos,closed,desc", filter: "open" })),
]);

const listByDay = new Map();
const listById = new Map();
for (const list of listsRaw.filter(item => !item.closed)) {
  const day = getDayDefinition(list.name);
  if (!day) throw new Error(`Trello Agenda: lista aberta não reconhecida: "${list.name}".`);
  if (listByDay.has(day.id)) throw new Error(`Trello Agenda: mais de uma lista representa ${day.name}.`);
  listByDay.set(day.id, list);
  listById.set(list.id, day);
}

for (const day of DAY_DEFINITIONS) {
  if (!listByDay.has(day.id)) throw new Error(`Trello Agenda: lista obrigatória ausente: ${day.name}.`);
}

const settings = parseBoardSettings(boardRaw?.desc);
const gameIconIndex = await loadGameIconIndex();
const parsedCards = [];
for (const card of cardsRaw.filter(item => !item.closed)) {
  const day = listById.get(card.idList);
  if (!day) throw new Error(`Trello Agenda: card "${card.name}" pertence a uma lista não reconhecida.`);

  const parsed = parseCard(card);
  if (parsed.steamAppId) {
    const catalogGame = gameIconIndex.get(parsed.steamAppId);
    if (catalogGame?.icon) {
      parsed.icon = catalogGame.icon;
    } else {
      console.warn(`Agenda: SteamAppID ${parsed.steamAppId} em "${parsed.title}" não possui ícone oficial resolvido em ${GAMES}; publicando sem ícone.`);
    }
  }
  parsedCards.push({ day, card: parsed });
}

let weekStart = settings.weekStart;
if (!weekStart) {
  const datedCards = parsedCards.filter(item => item.card.date);
  if (!datedCards.length) {
    throw new Error("Trello Agenda: informe Semana: YYYY-MM-DD (domingo) na descrição do quadro ou Data: em pelo menos um card.");
  }
  const inferred = weekStartFor(parseIsoDate(datedCards[0].card.date, "Trello Agenda"));
  for (const item of datedCards) {
    const candidate = weekStartFor(parseIsoDate(item.card.date, `Trello Agenda: Data de "${item.card.title}"`));
    if (candidate.getTime() !== inferred.getTime()) {
      throw new Error("Trello Agenda: existem cards de semanas diferentes; ajuste Semana:/Data: antes de publicar.");
    }
  }
  weekStart = inferred;
}

const liveBuckets = new Map(DAY_DEFINITIONS.map(day => [day.id, []]));
for (const item of parsedCards) {
  const expectedDate = formatIsoDate(addDays(weekStart, item.day.offset));
  if (item.card.date && item.card.date !== expectedDate) {
    throw new Error(`Trello Agenda: "${item.card.title}" está em ${item.day.name}, mas Data: ${item.card.date} não corresponde a ${expectedDate}.`);
  }
  liveBuckets.get(item.day.id).push(item.card);
}

let previous = null;
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}

const days = DAY_DEFINITIONS.map(day => {
  const sorted = liveBuckets.get(day.id).sort(compareLives);
  const lives = sorted.map(item => {
    const live = {
      horario: item.time,
      titulo: item.title,
      descricao: item.description,
      plataformas: item.platforms,
    };
    if (item.steamAppId) live.steamAppId = item.steamAppId;
    if (item.icon) live.icon = item.icon;
    return live;
  });
  const first = lives[0] || null;

  return {
    id: day.id,
    nome: day.name,
    data: formatIsoDate(addDays(weekStart, day.offset)),
    temLive: Boolean(first),
    horario: first?.horario || "",
    titulo: first?.titulo || "",
    descricao: first?.descricao || "",
    plataformas: first?.plataformas || ["YouTube", "Twitch"],
    lives,
  };
});

const previousObservation = typeof previous?.observacao === "string" ? previous.observacao : "";
const observation = settings.observation !== null ? settings.observation : previousObservation;
const previousStable = previous ? { observacao: previous.observacao || "", dias: previous.dias } : null;
const stable = { observacao: observation, dias: days };
const changed = JSON.stringify(stable) !== JSON.stringify(previousStable);

const output = {
  ultimaAtualizacao: changed ? formatUpdateDate() : (previous?.ultimaAtualizacao || formatUpdateDate()),
  observacao: observation,
  dias: days,
};

await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
const totalLives = days.reduce((sum, day) => sum + day.lives.length, 0);
console.log(`Agenda sincronizada: semana ${formatIsoDate(weekStart)}, ${totalLives} live(s), quadro ${boardRaw?.shortUrl || BOARD_ID}.`);
