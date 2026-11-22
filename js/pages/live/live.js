/*
 * LIVE — V48.4.0. Abas Twitch/YouTube com player + chat.
 * - Nada de terceiros carrega antes do clique em "Carregar a transmissão"; o clique não é
 *   guardado entre visitas (só vale enquanto a página está aberta).
 * - Só um player existe por vez: trocar de aba desmonta o outro (sem áudio duplo).
 * - Espectadores, jogo e título: da Twitch, via Worker do próprio site (/twitch/live);
 *   as lives são simultâneas, então valem para as duas abas.
 * - YouTube: a IFrame Player API (script oficial, sem chave) informa o ID da live
 *   atual, usado só para abrir o chat. getVideoData() não está na referência
 *   oficial; se falhar, o player continua e o chat mostra um aviso. Canal offline
 *   também devolve um ID: só conta como "ao vivo" se o player confirmar (isLive ou
 *   duração 0) e estiver tocando/pausado/em buffer.
 */
(() => {
    "use strict";

    const model = window.KamyliLiveModel;
    const page = document.getElementById("livePage");
    if (!model || !page) return;

    const api = window.KamyliAPI;
    const host = model.normalizeHost(location.hostname);
    const status = document.getElementById("liveStatus");
    const external = document.getElementById("liveExternal");
    const now = {
        box: document.getElementById("liveNow"),
        game: document.getElementById("liveNowGame"),
        title: document.getElementById("liveNowTitle")
    };
    const PREF_KEY = "kamyli:live-platform";
    // Consentimento só vale nesta visita (em memória): a cada abertura da página é preciso clicar de novo.
    const consented = new Set();
    const POLL_MS = 60000;
    const YT_DETECT_MS = 1500;
    const YT_DETECT_TRIES = 10;

    const tabs = {};
    const panels = {};
    model.PLATFORMS.forEach(platform => {
        tabs[platform] = document.getElementById(`liveTab${platform === "twitch" ? "Twitch" : "Youtube"}`);
        panels[platform] = document.getElementById(`livePanel${platform === "twitch" ? "Twitch" : "Youtube"}`);
    });
    const badges = {
        twitch: document.getElementById("liveBadgeTwitch"),
        youtube: document.getElementById("liveBadgeYoutube")
    };

    const state = {
        platform: "twitch",
        twitch: { live: false, known: false, viewers: 0 },
        youtube: { live: false, videoId: "", checking: false },
        ytPlayer: null,
        ytTimer: 0,
        ytToken: 0
    };

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch { /* sem armazenamento: segue sem lembrar */ } }
    };

    const slot = (platform, name) => panels[platform].querySelector(`[data-slot="${name}"]`);

    function isDark() {
        return document.documentElement.dataset.theme !== "light";
    }

    function makeFrame(src, title, allow) {
        const frame = document.createElement("iframe");
        frame.src = src;
        frame.title = title;
        frame.setAttribute("allow", allow);
        frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        frame.setAttribute("allowfullscreen", "");
        frame.loading = "eager";
        return frame;
    }

    function showGate(platform, visible) {
        const gate = slot(platform, "gate");
        if (gate) gate.hidden = !visible;
    }

    function clearEmbeds(platform) {
        slot(platform, "player").querySelectorAll("iframe").forEach(node => node.remove());
        slot(platform, "chat").querySelectorAll("iframe").forEach(node => node.remove());
    }

    function renderStatus() {
        const t = state.twitch;
        const y = state.youtube;
        const parts = [];

        if (t.live) parts.push(`Twitch ao vivo · ${model.formatViewers(t.viewers)}`);
        else if (t.known) parts.push("Twitch sem live agora");
        if (y.live) parts.push("YouTube ao vivo");
        else if (y.checking) parts.push("Verificando o YouTube…");
        else if (y.videoId === "" && state.ytPlayer) parts.push("YouTube sem live agora");

        status.textContent = parts.length ? parts.join(" · ") : "Escolha a plataforma para assistir.";

        const playing = model.nowPlaying(t);
        now.box.hidden = !playing;
        now.game.textContent = playing ? playing.game : "";
        now.title.textContent = playing ? playing.title : "";
        now.game.hidden = !(playing && playing.game);
        now.title.hidden = !(playing && playing.title);

        setBadge("twitch", t.live ? "Ao vivo" : "");
        setBadge("youtube", y.live ? "Ao vivo" : "");
    }

    function setBadge(platform, text) {
        const badge = badges[platform];
        badge.hidden = !text;
        badge.textContent = text;
    }

    /* ---------- Twitch ---------- */

    function mountTwitch() {
        const player = model.twitchPlayerUrl(host);
        const chat = model.twitchChatUrl(host, { dark: isDark() });
        if (!player || !chat) return failHost("twitch");
        clearEmbeds("twitch");
        slot("twitch", "player").appendChild(makeFrame(player, "Player da Twitch — Kamyli", "autoplay; fullscreen; picture-in-picture"));
        slot("twitch", "chat").appendChild(makeFrame(chat, "Chat da Twitch — Kamyli", ""));
        showGate("twitch", false);
    }

    async function pollTwitch() {
        if (!api?.getJSON) return;
        try {
            state.twitch = model.twitchStatus(await api.getJSON("/twitch/live", { timeoutMs: 5000 }));
        } catch {
            state.twitch = { live: false, known: false, viewers: 0 };
        }
        renderStatus();
    }

    /* ---------- YouTube ---------- */

    let apiPromise = null;
    function loadYouTubeApi() {
        if (window.YT?.Player) return Promise.resolve(window.YT);
        if (apiPromise) return apiPromise;
        apiPromise = new Promise((resolve, reject) => {
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof previous === "function") previous();
                resolve(window.YT);
            };
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.onerror = () => { apiPromise = null; reject(new Error("iframe_api")); };
            document.head.appendChild(script);
        });
        return apiPromise;
    }

    function setYouTubeChat(videoId) {
        const chat = slot("youtube", "chat");
        const empty = slot("youtube", "chat-empty");
        const current = chat.querySelector("iframe");
        const url = model.youtubeChatUrl(videoId, host);

        if (!url) {
            current?.remove();
            if (empty) {
                empty.hidden = false;
                empty.textContent = "O chat aparece aqui quando houver uma live no ar.";
            }
            return;
        }
        if (current && current.dataset.videoId === videoId) return;
        current?.remove();
        const frame = makeFrame(url, "Chat do YouTube — Kamyli", "");
        frame.dataset.videoId = videoId;
        chat.appendChild(frame);
        if (empty) empty.hidden = true;
    }

    // Devolve o ID só se o player confirmar que é uma transmissão ao vivo (ver youtubeIsLive no modelo).
    function readLiveVideoId() {
        try {
            const player = state.ytPlayer;
            const data = player?.getVideoData?.() || {};
            const info = {
                videoId: data.video_id,
                isLive: typeof data.isLive === "boolean" ? data.isLive : undefined,
                duration: player?.getDuration?.(),
                state: player?.getPlayerState?.()
            };
            return model.youtubeIsLive(info) ? info.videoId : "";
        } catch {
            return "";
        }
    }

    function detectYouTube(tries = YT_DETECT_TRIES) {
        const token = state.ytToken;
        window.clearTimeout(state.ytTimer);
        const step = remaining => {
            if (token !== state.ytToken) return;
            const id = readLiveVideoId();
            if (id) {
                state.youtube = { live: true, videoId: id, checking: false };
                setYouTubeChat(id);
                renderStatus();
                state.ytTimer = window.setTimeout(() => detectYouTube(1), POLL_MS);
                return;
            }
            if (remaining > 1) {
                state.ytTimer = window.setTimeout(() => step(remaining - 1), YT_DETECT_MS);
                return;
            }
            state.youtube = { live: false, videoId: "", checking: false };
            setYouTubeChat("");
            const empty = slot("youtube", "chat-empty");
            if (empty) {
                empty.hidden = false;
                empty.textContent = "Sem live no YouTube agora. O chat aparece quando a transmissão começar.";
            }
            renderStatus();
            state.ytTimer = window.setTimeout(() => detectYouTube(1), POLL_MS);
        };
        step(tries);
    }

    async function mountYouTube() {
        const src = model.youtubePlayerUrl(location.origin);
        if (!src || !host) return failHost("youtube");
        clearEmbeds("youtube");
        state.ytToken += 1;
        state.youtube = { live: false, videoId: "", checking: true };
        renderStatus();

        const frame = makeFrame(src, "Player do YouTube — Kamyli", "autoplay; encrypted-media; fullscreen; picture-in-picture");
        frame.id = "liveYoutubeFrame";
        slot("youtube", "player").appendChild(frame);
        showGate("youtube", false);

        try {
            const YT = await loadYouTubeApi();
            const token = state.ytToken;
            state.ytPlayer = new YT.Player(frame, {
                events: {
                    onReady: () => { if (token === state.ytToken) detectYouTube(); },
                    onError: () => { if (token === state.ytToken) detectYouTube(1); }
                }
            });
        } catch {
            state.youtube = { live: false, videoId: "", checking: false };
            const empty = slot("youtube", "chat-empty");
            if (empty) {
                empty.hidden = false;
                empty.textContent = "Não foi possível verificar a live do YouTube. O player continua disponível.";
            }
            renderStatus();
        }
    }

    function unmountYouTube() {
        state.ytToken += 1;
        window.clearTimeout(state.ytTimer);
        try { state.ytPlayer?.destroy?.(); } catch { /* o iframe é removido logo abaixo */ }
        state.ytPlayer = null;
        state.youtube = { live: false, videoId: "", checking: false };
        clearEmbeds("youtube");
        const empty = slot("youtube", "chat-empty");
        if (empty) {
            empty.hidden = false;
            empty.textContent = "O chat aparece aqui quando houver uma live no ar.";
        }
    }

    /* ---------- abas ---------- */

    function failHost(platform) {
        showGate(platform, true);
        status.textContent = "Não foi possível montar o player neste endereço. Use o botão “Abrir na plataforma”.";
    }

    function mount(platform) {
        if (platform === "twitch") mountTwitch();
        else mountYouTube();
    }

    function unmount(platform) {
        if (platform === "youtube") unmountYouTube();
        else clearEmbeds("twitch");
        showGate(platform, true);
    }

    function select(platform, options = {}) {
        const next = model.pickPlatform(platform);
        const previous = state.platform;

        if (previous !== next) unmount(previous);
        state.platform = next;

        model.PLATFORMS.forEach(name => {
            const active = name === next;
            tabs[name].setAttribute("aria-selected", String(active));
            tabs[name].tabIndex = active ? 0 : -1;
            panels[name].hidden = !active;
        });
        external.href = model.EXTERNAL_URL[next];
        store.set(PREF_KEY, next);
        if (options.focus) tabs[next].focus();

        if (previous !== next || options.initial) {
            if (consented.has(next)) mount(next);
        }
        renderStatus();
    }

    function bind() {
        model.PLATFORMS.forEach((platform, index) => {
            tabs[platform].addEventListener("click", () => select(platform));
            tabs[platform].addEventListener("keydown", event => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const list = model.PLATFORMS;
                const delta = event.key === "ArrowRight" ? 1 : -1;
                select(list[(index + delta + list.length) % list.length], { focus: true });
            });
            panels[platform].querySelector('[data-action="load"]').addEventListener("click", () => {
                consented.add(platform);
                mount(platform);
            });
        });
    }

    bind();
    select(model.pickPlatform(store.get(PREF_KEY)), { initial: true });
    pollTwitch();
    window.setInterval(() => { if (!document.hidden) pollTwitch(); }, POLL_MS);
})();
