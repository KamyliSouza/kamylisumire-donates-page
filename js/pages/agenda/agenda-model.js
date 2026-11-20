/*
 * Agenda semanal — modelo puro (sem DOM, sem rede).
 *
 * Transforma `data/agenda.json` + `data/content/jogos-artwork.json` no modelo
 * que `agenda.js` desenha. Fica separado para poder ser testado em Node
 * (`.github/tests/agenda-page.test.mjs`) e para manter as regras de arte num
 * único lugar:
 *
 *   - as lives de cada dia seguem a mesma leitura da Home (`getDayLives`);
 *   - a arte do card sai somente do manifesto publicado, por `steamAppId`;
 *     nenhuma URL é inventada a partir do ID;
 *   - arte de card e arte panorâmica de fundo são tipos distintos: uma imagem
 *     de card nunca é promovida a fundo e vice-versa;
 *   - só hosts oficiais de imagem da Steam são aceitos.
 */
(() => {
    "use strict";

    const DAY_IDS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const MONTHS_LONG = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const STEAM_IMAGE_HOSTS = new Set([
        "shared.fastly.steamstatic.com",
        "shared.akamai.steamstatic.com",
        "cdn.cloudflare.steamstatic.com"
    ]);

    /* Ordem por proximidade com o card (~2:1). header ≈ 2,14:1; main-capsule ≈ 1,75:1. */
    const CARD_KINDS = ["header", "main-capsule", "library-hero"];
    /* Fundo panorâmico: ~3,1:1. A versão 1x (1920 px) basta para um painel de 1120 px. */
    const BACKGROUND_KINDS = ["library-hero", "library-hero-2x"];
    const MAX_ART_FALLBACKS = 3;

    function asString(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    function positiveInteger(value) {
        const number = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
        return Number.isInteger(number) && number > 0 ? number : null;
    }

    function normalizePlatforms(value) {
        return Array.isArray(value)
            ? value.map(asString).filter(Boolean)
            : [];
    }

    /* Mesma regra da Home: helpers antigos editam só os campos legados da 1ª live. */
    function getDayLives(dia) {
        if (!dia || !dia.temLive) return [];

        const legacy = {
            horario: asString(dia.horario),
            titulo: asString(dia.titulo),
            descricao: asString(dia.descricao),
            plataformas: normalizePlatforms(dia.plataformas),
            steamAppId: null
        };
        const stored = Array.isArray(dia.lives)
            ? dia.lives
                .filter(live => live && typeof live === "object")
                .map(live => ({
                    horario: asString(live.horario),
                    titulo: asString(live.titulo),
                    descricao: asString(live.descricao),
                    plataformas: normalizePlatforms(live.plataformas),
                    steamAppId: positiveInteger(live.steamAppId)
                }))
            : [];

        if (!stored.length) return [legacy];
        if (!(legacy.horario || legacy.titulo || legacy.descricao)) return stored;

        const first = { ...stored[0], ...legacy, steamAppId: stored[0].steamAppId };
        if (legacy.titulo !== stored[0].titulo) first.steamAppId = null;
        return [first, ...stored.slice(1)];
    }

    function parseIsoDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asString(value));
        if (!match) return null;
        const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
        const date = new Date(Date.UTC(year, month - 1, day));
        const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
        return valid ? { year, month, day } : null;
    }

    const pad = number => String(number).padStart(2, "0");

    function formatShortDate(parts) {
        return `${pad(parts.day)} ${MONTHS_SHORT[parts.month - 1]}`;
    }

    function formatLongDate(parts) {
        return `${parts.day} de ${MONTHS_LONG[parts.month - 1]}`;
    }

    /* "15 — 21 NOV 2026"; entre meses/anos, "29 NOV — 04 DEZ 2026" ou "28 DEZ 2026 — 03 JAN 2027". */
    function formatWeekPeriod(first, last) {
        if (!first || !last) return "";
        if (first.year !== last.year) {
            return `${formatShortDate(first)} ${first.year} — ${formatShortDate(last)} ${last.year}`;
        }
        if (first.month !== last.month) {
            return `${formatShortDate(first)} — ${formatShortDate(last)} ${last.year}`;
        }
        return `${pad(first.day)} — ${pad(last.day)} ${MONTHS_SHORT[last.month - 1]} ${last.year}`;
    }

    function isSteamImageUrl(value, appId) {
        try {
            const url = new URL(value);
            if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
            if (!STEAM_IMAGE_HOSTS.has(url.hostname)) return false;
            return url.pathname.includes(`/apps/${appId}/`);
        } catch {
            return false;
        }
    }

    function indexManifest(manifest) {
        const index = new Map();
        if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.games)) return index;
        for (const game of manifest.games) {
            const appId = positiveInteger(game && game.steamAppId);
            if (appId && !index.has(appId) && Array.isArray(game.cardCandidates)) {
                index.set(appId, { name: asString(game.name), candidates: game.cardCandidates });
            }
        }
        return index;
    }

    function pickArt(entry, appId, kinds) {
        if (!entry) return [];
        const urls = [];
        for (const kind of kinds) {
            const candidate = entry.candidates.find(item => item && item.kind === kind);
            const url = asString(candidate && candidate.url);
            if (url && isSteamImageUrl(url, appId) && !urls.includes(url)) urls.push(url);
            if (urls.length >= MAX_ART_FALLBACKS) break;
        }
        return urls;
    }

    function hashString(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    /*
     * Um fundo por semana, estável entre visitas e entre visitantes: o sorteio
     * depende só do início da semana e dos jogos elegíveis (ordenados por App ID),
     * nunca da ordem das lives.
     */
    function selectWeeklyBackground(appIds, weekStartIso, manifestIndex) {
        const eligible = [...new Set(appIds)]
            .sort((a, b) => a - b)
            .map(appId => ({ appId, urls: pickArt(manifestIndex.get(appId), appId, BACKGROUND_KINDS) }))
            .filter(item => item.urls.length > 0);
        if (!eligible.length) return null;
        const chosen = eligible[hashString(`KamyliAgendaBackground:${weekStartIso}`) % eligible.length];
        return { appId: chosen.appId, name: manifestIndex.get(chosen.appId).name, urls: chosen.urls };
    }

    function timeLabel(live) {
        return live.horario || "A definir";
    }

    function ariaLabelFor(name, lives, dateLong) {
        const head = `${name}, ${dateLong}`;
        if (!lives.length) return `${head}: sem live`;
        const items = lives.map(live => {
            const match = /^(\d{2}):(\d{2})$/.exec(live.time);
            const spoken = !match
                ? ", horário a definir"
                : match[2] === "00"
                    ? ` às ${Number(match[1])} horas`
                    : ` às ${Number(match[1])}h${match[2]}`;
            return `${live.title}${spoken}`;
        });
        return `${head}: ${items.join("; ")}`;
    }

    /**
     * @returns {{period:string, updated:string, note:string, days:object[], background:object|null}}
     * @throws {Error} quando o contrato mínimo (sete dias, domingo a sábado, datas ISO) não é cumprido.
     */
    function buildWeek(agenda, manifest) {
        const rawDays = agenda && Array.isArray(agenda.dias) ? agenda.dias : null;
        if (!rawDays || rawDays.length !== 7) throw new Error("A agenda precisa ter sete dias.");

        const manifestIndex = indexManifest(manifest);
        const appIds = [];

        const days = rawDays.map((raw, index) => {
            if (!raw || typeof raw !== "object" || asString(raw.id) !== DAY_IDS[index]) {
                throw new Error("Os dias da agenda precisam seguir de domingo a sábado.");
            }
            const date = parseIsoDate(raw.data);
            if (!date) throw new Error(`Data inválida em ${DAY_IDS[index]}.`);

            const lives = getDayLives(raw).map(live => {
                const art = live.steamAppId ? pickArt(manifestIndex.get(live.steamAppId), live.steamAppId, CARD_KINDS) : [];
                if (live.steamAppId) appIds.push(live.steamAppId);
                return {
                    time: timeLabel(live),
                    title: live.titulo || "Live",
                    description: live.descricao,
                    platforms: live.plataformas,
                    steamAppId: live.steamAppId,
                    art
                };
            });
            const name = asString(raw.nome) || DAY_IDS[index];
            return {
                id: raw.id,
                name,
                iso: asString(raw.data),
                dateLabel: formatShortDate(date),
                lives,
                hasLive: lives.length > 0,
                art: (lives.find(live => live.art.length) || { art: [] }).art,
                ariaLabel: ariaLabelFor(name, lives, formatLongDate(date))
            };
        });

        const first = parseIsoDate(rawDays[0].data);
        const last = parseIsoDate(rawDays[6].data);
        return {
            period: formatWeekPeriod(first, last),
            updated: asString(agenda.ultimaAtualizacao),
            note: asString(agenda.observacao),
            days,
            background: selectWeeklyBackground(appIds, asString(rawDays[0].data), manifestIndex)
        };
    }

    const api = Object.freeze({
        buildWeek,
        getDayLives,
        formatWeekPeriod,
        isSteamImageUrl,
        selectWeeklyBackground,
        indexManifest,
        parseIsoDate
    });

    globalThis.KamyliAgendaModel = api;
})();
