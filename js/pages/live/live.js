/*
 * LIVE — V48.4.1. Twitch com player/chat incorporados; YouTube por link externo.
 * - O embed Twitch só é criado após clique e quando a largura permite 400 px.
 * - Consentimento de carregamento não é persistido entre visitas.
 * - Desktop: modos Compacto, Amplo e Teatro + mostrar/ocultar chat.
 * - Ao trocar de plataforma, o embed Twitch é desmontado.
 * - Jogo, título e espectadores são obtidos do Worker do próprio site (/twitch/live).
 * - O YouTube abre no site/aplicativo oficial: nenhum player, chat ou API do YouTube é carregado.
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
    const chatToggle = document.getElementById("liveChatToggle");
    const now = {
        box: document.getElementById("liveNow"),
        game: document.getElementById("liveNowGame"),
        title: document.getElementById("liveNowTitle")
    };
    const PREF_KEY = "kamyli:live-platform";
    const VIEW_KEY = "kamyli:live-view";
    const CHAT_KEY = "kamyli:live-chat";
    // Consentimento só vale nesta visita; a cada abertura da página é preciso clicar de novo.
    const consented = new Set();
    const POLL_MS = 60000;

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
        twitch: { live: false, known: false, viewers: 0 }
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

    function setBadge(platform, text) {
        const badge = badges[platform];
        if (!badge) return;
        badge.hidden = !text;
        badge.textContent = text;
    }

    function renderStatus() {
        const t = state.twitch;
        if (state.platform === "youtube") {
            status.textContent = "A transmissão abre diretamente no YouTube.";
        } else if (t.live) {
            status.textContent = `Twitch ao vivo · ${model.formatViewers(t.viewers)}`;
        } else if (t.known) {
            status.textContent = "Twitch sem live agora";
        } else {
            status.textContent = "Escolha a plataforma para assistir.";
        }

        const playing = state.platform === "twitch" ? model.nowPlaying(t) : null;
        now.box.hidden = !playing;
        now.game.textContent = playing ? playing.game : "";
        now.title.textContent = playing ? playing.title : "";
        now.game.hidden = !(playing && playing.game);
        now.title.hidden = !(playing && playing.title);

        setBadge("twitch", t.live ? "Ao vivo" : "");
        setBadge("youtube", "");
    }

    /* ---------- Twitch ---------- */

    function updateTwitchGateForWidth() {
        const playerSlot = slot("twitch", "player");
        const gate = slot("twitch", "gate");
        const title = gate.querySelector(".live-gate-title");
        const message = gate.querySelector(".live-gate-text");
        const button = gate.querySelector('[data-action="load"]');
        const canEmbed = model.canEmbedTwitch(playerSlot.clientWidth, playerSlot.clientHeight);

        if (!canEmbed) {
            if (playerSlot.querySelector("iframe")) {
                clearEmbeds("twitch");
                showGate("twitch", true);
            }
            title.textContent = "Player indisponível nesta área";
            message.textContent = "A Twitch exige uma área de vídeo com pelo menos 400 × 300 pixels. Use “Abrir na plataforma” para assistir diretamente.";
            button.hidden = true;
            return false;
        }

        title.textContent = "Player e chat da Twitch";
        message.textContent = "Ao carregar, a Twitch recebe seu acesso e pode gravar cookies, de acordo com a política dela.";
        button.hidden = false;
        return true;
    }

    function mountTwitch() {
        if (!updateTwitchGateForWidth()) return;
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

    /* ---------- modos de exibição (desktop) ---------- */

    function applyView(view, options = {}) {
        const next = model.pickView(view);
        page.dataset.view = next;
        page.querySelectorAll(".live-seg-btn[data-view]").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.view === next));
        });
        if (options.save) store.set(VIEW_KEY, next);
    }

    function applyChat(visible, options = {}) {
        page.dataset.chat = visible ? "shown" : "hidden";
        chatToggle.setAttribute("aria-pressed", String(visible));
        if (options.save) store.set(CHAT_KEY, visible ? "shown" : "hidden");
    }

    function bindViews() {
        page.querySelectorAll(".live-seg-btn[data-view]").forEach(button => {
            button.addEventListener("click", () => applyView(button.dataset.view, { save: true }));
        });
        chatToggle.addEventListener("click", () => {
            applyChat(page.dataset.chat === "hidden", { save: true });
        });
        applyView(store.get(VIEW_KEY));
        applyChat(store.get(CHAT_KEY) !== "hidden");
    }

    /* ---------- abas ---------- */

    function failHost(platform) {
        showGate(platform, true);
        status.textContent = "Não foi possível montar o player neste endereço. Use o botão “Abrir na plataforma”.";
    }

    function unmount(platform) {
        if (platform !== "twitch") return;
        clearEmbeds("twitch");
        showGate("twitch", true);
        updateTwitchGateForWidth();
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
        chatToggle.hidden = next !== "twitch";
        store.set(PREF_KEY, next);
        if (options.focus) tabs[next].focus();

        if (next === "twitch") {
            updateTwitchGateForWidth();
            if ((previous !== next || options.initial) && consented.has("twitch")) mountTwitch();
        }
        renderStatus();
    }

    function bind() {
        model.PLATFORMS.forEach((platform, index) => {
            tabs[platform].addEventListener("click", () => select(platform));
            tabs[platform].addEventListener("keydown", event => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const delta = event.key === "ArrowRight" ? 1 : -1;
                select(model.PLATFORMS[(index + delta + model.PLATFORMS.length) % model.PLATFORMS.length], { focus: true });
            });
        });

        slot("twitch", "gate").querySelector('[data-action="load"]').addEventListener("click", () => {
            if (!updateTwitchGateForWidth()) return;
            consented.add("twitch");
            mountTwitch();
        });

        const playerSlot = slot("twitch", "player");
        if (typeof ResizeObserver === "function") {
            const observer = new ResizeObserver(() => {
                if (state.platform === "twitch") updateTwitchGateForWidth();
            });
            observer.observe(playerSlot);
        }
    }

    bind();
    bindViews();
    select(model.pickPlatform(store.get(PREF_KEY)), { initial: true });
    pollTwitch();
    window.setInterval(() => { if (!document.hidden) pollTwitch(); }, POLL_MS);
})();
