/*
 * LIVE — V48.4.2. Regras puras da página /live/ (sem DOM), testáveis em Node.
 * A página incorpora somente os embeds oficiais da Twitch. O YouTube é aberto
 * diretamente na plataforma, sem player/chat incorporado e sem YouTube API.
 */
(() => {
    "use strict";

    const TWITCH_CHANNEL = "kamyli";
    const PLATFORMS = ["twitch", "youtube"];
    const EXTERNAL_URL = Object.freeze({
        twitch: "https://www.twitch.tv/kamyli",
        youtube: "https://www.youtube.com/channel/UCkhjq3nJqlv5GrBgNRwIBFw/live"
    });

    function normalizeHost(value) {
        const host = String(value || "").trim().toLowerCase();
        if (!host || host.length > 253) return null;
        return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host) ? host : null;
    }

    function twitchPlayerUrl(host) {
        const parent = normalizeHost(host);
        if (!parent) return null;
        const query = new URLSearchParams({ channel: TWITCH_CHANNEL, parent, autoplay: "true" });
        return `https://player.twitch.tv/?${query}`;
    }

    function twitchChatUrl(host, options = {}) {
        const parent = normalizeHost(host);
        if (!parent) return null;
        const query = new URLSearchParams({ parent });
        const base = `https://www.twitch.tv/embed/${TWITCH_CHANNEL}/chat?${query}`;
        return options.dark ? `${base}&darkpopout` : base;
    }

    // A Twitch exige área de vídeo mínima de 400 × 300 px.
    function canEmbedTwitch(width, height) {
        const w = Number(width);
        const h = Number(height);
        return Number.isFinite(w) && Number.isFinite(h) && w >= 400 && h >= 300;
    }

    // Mantém o layout normal quando o player já cabe; em telas móveis,
    // permite expandir somente o vídeo até as bordas quando isso resolve
    // a largura. Abaixo de 400 px de viewport, o embed não é possível.
    function twitchLayoutMode(normalPlayerWidth, viewportWidth, mobileLayout) {
        const normalWidth = Number(normalPlayerWidth);
        const availableWidth = Number(viewportWidth);
        if (mobileLayout !== true || (Number.isFinite(normalWidth) && normalWidth >= 400)) {
            return "contained";
        }
        return Number.isFinite(availableWidth) && availableWidth >= 400
            ? "edge"
            : "external";
    }

    function formatViewers(value) {
        const count = Math.max(0, Math.floor(Number(value) || 0));
        return `${new Intl.NumberFormat("pt-BR").format(count)} ${count === 1 ? "espectador" : "espectadores"}`;
    }

    // Resposta do Worker (/twitch/live): só `available && live` conta como ao vivo.
    function twitchStatus(data) {
        if (!data || data.available !== true || data.live !== true) {
            return { live: false, known: Boolean(data && data.available === true) };
        }
        return {
            live: true,
            known: true,
            viewers: Math.max(0, Math.floor(Number(data.viewerCount) || 0)),
            title: String(data.title || "").trim(),
            game: String(data.gameName || "").trim()
        };
    }

    function nowPlaying(status) {
        if (!status || status.live !== true) return null;
        const clean = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
        const game = clean(status.game, 80);
        const title = clean(status.title, 140);
        return game || title ? { game, title } : null;
    }

    const VIEWS = ["compact", "wide", "theatre"];
    function pickView(value) {
        return VIEWS.includes(value) ? value : "compact";
    }

    function pickPlatform(value) {
        return PLATFORMS.includes(value) ? value : "twitch";
    }

    globalThis.KamyliLiveModel = Object.freeze({
        PLATFORMS, EXTERNAL_URL, normalizeHost,
        twitchPlayerUrl, twitchChatUrl, canEmbedTwitch, twitchLayoutMode,
        formatViewers, twitchStatus, nowPlaying, VIEWS, pickView, pickPlatform
    });
})();
