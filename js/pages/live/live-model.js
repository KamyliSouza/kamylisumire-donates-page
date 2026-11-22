/*
 * LIVE — V48.4.0. Regras puras da página /live/ (sem DOM), testáveis em Node.
 * Monta as URLs oficiais de embed da Twitch e do YouTube. Nenhuma chave de API:
 * o YouTube resolve a live atual pelo canal e o ID do vídeo é lido no navegador.
 */
(() => {
    "use strict";

    const TWITCH_CHANNEL = "kamyli";
    const YOUTUBE_CHANNEL_ID = "UCkhjq3nJqlv5GrBgNRwIBFw";
    const PLATFORMS = ["twitch", "youtube"];
    const EXTERNAL_URL = Object.freeze({
        twitch: "https://www.twitch.tv/kamyli",
        youtube: "https://www.youtube.com/channel/UCkhjq3nJqlv5GrBgNRwIBFw/live"
    });

    // A Twitch exige `parent` e o YouTube `embed_domain` com o host exato da página.
    function normalizeHost(value) {
        const host = String(value || "").trim().toLowerCase();
        if (!host || host.length > 253) return null;
        return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host) ? host : null;
    }

    function isVideoId(value) {
        return /^[A-Za-z0-9_-]{11}$/.test(String(value || ""));
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

    // `origin` é obrigatório para a IFrame Player API conversar com o iframe.
    function youtubePlayerUrl(origin) {
        let parsed;
        try { parsed = new URL(origin); } catch { return null; }
        if (!normalizeHost(parsed.hostname)) return null;
        const query = new URLSearchParams({
            channel: YOUTUBE_CHANNEL_ID,
            enablejsapi: "1",
            origin: parsed.origin,
            playsinline: "1",
            rel: "0",
            autoplay: "1"
        });
        return `https://www.youtube-nocookie.com/embed/live_stream?${query}`;
    }

    function youtubeChatUrl(videoId, host) {
        const embedDomain = normalizeHost(host);
        if (!isVideoId(videoId) || !embedDomain) return null;
        const query = new URLSearchParams({ v: videoId, embed_domain: embedDomain });
        return `https://www.youtube.com/live_chat?${query}`;
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

    // Jogo e título da live: as duas plataformas transmitem o mesmo, então valem os da Twitch.
    function nowPlaying(status) {
        if (!status || status.live !== true) return null;
        const clean = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
        const game = clean(status.game, 80);
        const title = clean(status.title, 140);
        return game || title ? { game, title } : null;
    }

    // O embed por canal (live_stream?channel=) pode abrir com o último vídeo ou um aviso quando o canal está
    // offline, e o ID existe mesmo assim. Só vale como "ao vivo" se o player disser que é transmissão ao vivo
    // (isLive) ou se tiver duração 0 (marca de live) E estiver tocando, em buffer ou pausado.
    const YT_STATE = Object.freeze({ UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 });

    function youtubeIsLive(info) {
        if (!info || !isVideoId(info.videoId)) return false;
        const active = [YT_STATE.PLAYING, YT_STATE.PAUSED, YT_STATE.BUFFERING].includes(info.state);
        if (!active) return false;
        if (info.isLive === true) return true;
        return info.isLive === undefined && Number(info.duration) === 0;
    }

    // Modos de exibição do desktop: compacto (padrão, proporções do site), amplo (usa a altura da janela) e
    // teatro (player no máximo da janela).
    const VIEWS = ["compact", "wide", "theatre"];
    function pickView(value) {
        return VIEWS.includes(value) ? value : "compact";
    }

    function pickPlatform(value) {
        return PLATFORMS.includes(value) ? value : "twitch";
    }

    globalThis.KamyliLiveModel = Object.freeze({
        PLATFORMS, EXTERNAL_URL, normalizeHost, isVideoId,
        twitchPlayerUrl, twitchChatUrl, youtubePlayerUrl, youtubeChatUrl,
        formatViewers, twitchStatus, nowPlaying, youtubeIsLive, YT_STATE, VIEWS, pickView, pickPlatform
    });
})();
