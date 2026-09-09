(() => {
    "use strict";

    const content = window.KamyliContent;
    const api = window.KamyliAPI;

    const section = document.getElementById("lives");
    const track = document.getElementById("livesTrack");
    const prev = document.getElementById("livesPrev");
    const next = document.getElementById("livesNext");
    const channelLink = document.getElementById("livesChannelLink");
    const channelLinkText = document.getElementById("livesChannelLinkText");
    const twitchTab = document.getElementById("livesTabTwitch");
    const youtubeTab = document.getElementById("livesTabYoutube");

    if (!content || !section || !track) {
        return;
    }

    const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
    const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
    const TWITCH_ENDPOINT = "/twitch/videos";
    const DEFAULT_STEP = 320;

    let carouselController = null;
    let pageData = null;
    let youtubeVideos = [];
    let twitchVideos = null;
    let twitchRequest = null;
    let activePlatform = "twitch";

    function normalizeYoutubeVideoId(value) {
        const candidate = String(value || "").trim();

        return VIDEO_ID_PATTERN.test(candidate)
            ? candidate
            : "";
    }

    function normalizeDate(value) {
        const candidate = String(value || "").trim();

        if (!ISO_DATE_PATTERN.test(candidate)) {
            return "";
        }

        const [year, month, day] = candidate.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return "";
        }

        return candidate;
    }

    function normalizeYoutubeVideo(item) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
        }

        const videoId = normalizeYoutubeVideoId(item.videoId);
        const title = String(item.title || "").trim();
        const date = normalizeDate(item.date);

        if (!videoId || !title || !date) {
            return null;
        }

        const url = new URL("https://www.youtube.com/watch");
        url.searchParams.set("v", videoId);

        return {
            id: videoId,
            platform: "youtube",
            title,
            date,
            url: url.toString(),
            thumbnail:
                "https://i.ytimg.com/vi/" +
                encodeURIComponent(videoId) +
                "/mqdefault.jpg"
        };
    }

    function withCacheRevision(url, revision) {
        const source = String(url || "").trim();
        const cacheRevision = String(revision || "").trim();

        if (!source || !cacheRevision) {
            return source;
        }

        const separator = source.includes("?") ? "&" : "?";
        return `${source}${separator}v=${encodeURIComponent(cacheRevision)}`;
    }

    function normalizeTwitchVideo(item, revision) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
        }

        const id = String(item.id || "").trim();
        const title = String(item.title || "").trim();
        const date = normalizeDate(item.date);
        const url = String(item.url || "").trim();
        const thumbnail = String(item.thumbnail || "").trim();

        if (
            !id ||
            !title ||
            !date ||
            !url.startsWith("https://") ||
            !thumbnail.startsWith("https://")
        ) {
            return null;
        }

        return {
            id,
            platform: "twitch",
            title,
            date,
            url,
            thumbnail: withCacheRevision(thumbnail, revision)
        };
    }

    function formatDate(value) {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));

        return new Intl.DateTimeFormat("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC"
        }).format(date);
    }

    function platformLabel(platform) {
        return platform === "twitch" ? "Twitch" : "YouTube";
    }

    function setMessage(message) {
        const element = document.createElement("p");
        element.className = "lives-message";
        element.textContent = String(message);

        track.replaceChildren(element);

        if (prev) prev.disabled = true;
        if (next) next.disabled = true;
    }

    function createVideoCard(video) {
        const card = document.createElement("a");
        const sourceLabel = platformLabel(video.platform);

        card.className = "live-card";
        card.href = video.url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.setAttribute(
            "aria-label",
            `Abrir ${video.title} na ${sourceLabel}`
        );

        const imageWrap = document.createElement("span");
        imageWrap.className = "live-card-media";

        const image = document.createElement("img");
        image.className = "live-card-thumbnail";
        image.src = video.thumbnail;
        image.loading = "eager";
        image.decoding = "async";
        image.width = 320;
        image.height = 180;
        image.alt = "";

        imageWrap.appendChild(image);

        const body = document.createElement("span");
        body.className = "live-card-body";

        const title = document.createElement("strong");
        title.className = "live-card-title";
        title.textContent = video.title;

        const meta = document.createElement("span");
        meta.className = "live-card-meta";

        const date = document.createElement("time");
        date.dateTime = video.date;
        date.textContent = formatDate(video.date);

        const source = document.createElement("span");
        source.className = "live-card-source";
        source.textContent = `${sourceLabel} ↗`;

        meta.append(date, source);
        body.append(title, meta);
        card.append(imageWrap, body);

        return card;
    }

    function renderCards(videos, emptyMessage) {
        if (!videos.length) {
            setMessage(emptyMessage || "As lives serão adicionadas aqui em breve.");
            return;
        }

        const fragment = document.createDocumentFragment();

        videos.forEach(video => {
            fragment.appendChild(createVideoCard(video));
        });

        track.replaceChildren(fragment);
        carouselController?.refresh();
    }

    function setupCarousel() {
        const carousel = window.KamyliCarousel;

        if (!carousel?.create) {
            console.error("KamyliCarousel não foi carregado antes das Lives.");
            return;
        }

        carouselController = carousel.create({
            track,
            prev,
            next,
            itemSelector: ".live-card",
            defaultStep: DEFAULT_STEP
        });
    }

    function setSelectedTab(platform) {
        const isTwitch = platform === "twitch";

        if (twitchTab) {
            twitchTab.setAttribute("aria-selected", String(isTwitch));
            twitchTab.tabIndex = isTwitch ? 0 : -1;
        }

        if (youtubeTab) {
            youtubeTab.setAttribute("aria-selected", String(!isTwitch));
            youtubeTab.tabIndex = isTwitch ? -1 : 0;
        }
    }

    function updateChannelLink(platform) {
        if (!pageData || !channelLink || !channelLinkText) {
            return;
        }

        const isTwitch = platform === "twitch";
        const targetUrl = isTwitch
            ? String(pageData.twitchCanalUrl || "").trim()
            : String(pageData.canalUrl || "").trim();

        channelLink.href = targetUrl || "#";
        channelLinkText.textContent = isTwitch
            ? "Abrir na Twitch"
            : "Abrir no YouTube";
        channelLink.setAttribute(
            "aria-label",
            isTwitch ? "Abrir canal na Twitch" : "Abrir canal no YouTube"
        );
    }

    async function loadTwitchVideos() {
        if (Array.isArray(twitchVideos)) {
            return twitchVideos;
        }

        if (!api?.getJSON) {
            throw new Error("Cliente de API indisponível na Home.");
        }

        if (!twitchRequest) {
            twitchRequest = api
                .getJSON(TWITCH_ENDPOINT, { timeoutMs: 8000 })
                .then(data => {
                    const maxItems = getMaxItems();
                    const revision = String(data?.updatedAt || "").trim();
                    const videos = Array.isArray(data?.videos)
                        ? data.videos
                            .map(item => normalizeTwitchVideo(item, revision))
                            .filter(Boolean)
                            .slice(0, maxItems)
                        : [];

                    twitchVideos = videos;
                    return videos;
                })
                .finally(() => {
                    twitchRequest = null;
                });
        }

        return twitchRequest;
    }

    function getMaxItems() {
        const value = pageData?.maxItems;

        return Number.isInteger(value)
            ? Math.max(1, Math.min(20, value))
            : 10;
    }

    async function selectPlatform(platform, options = {}) {
        const normalized = platform === "youtube" ? "youtube" : "twitch";
        activePlatform = normalized;

        setSelectedTab(normalized);
        updateChannelLink(normalized);
        track.setAttribute(
            "aria-label",
            `Lives recentes na ${platformLabel(normalized)}`
        );

        if (normalized === "youtube") {
            renderCards(
                youtubeVideos,
                "As lives do YouTube serão adicionadas aqui em breve."
            );
            return;
        }

        setMessage("Carregando últimas lives da Twitch...");

        try {
            const videos = await loadTwitchVideos();

            if (activePlatform !== "twitch") {
                return;
            }

            renderCards(
                videos,
                "Nenhuma live gravada da Twitch foi encontrada."
            );
        } catch (error) {
            console.error("Erro ao carregar lives da Twitch:", error);

            if (activePlatform !== "twitch") {
                return;
            }

            setMessage(
                "Não foi possível atualizar a Twitch agora. O YouTube continua disponível na outra aba."
            );
        }

        if (options.focus && twitchTab) {
            twitchTab.focus();
        }
    }

    function bindTabs() {
        twitchTab?.addEventListener("click", () => {
            selectPlatform("twitch");
        });

        youtubeTab?.addEventListener("click", () => {
            selectPlatform("youtube");
        });

        const tabs = [twitchTab, youtubeTab].filter(Boolean);

        tabs.forEach((tab, index) => {
            tab.addEventListener("keydown", event => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                    return;
                }

                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const nextIndex = (index + direction + tabs.length) % tabs.length;
                const nextTab = tabs[nextIndex];
                const platform = nextTab === twitchTab ? "twitch" : "youtube";

                selectPlatform(platform, { focus: true });
                nextTab.focus();
            });
        });
    }

    function applySectionContent(data) {
        content.setText("livesEyebrow", data.eyebrow);
        content.setText("livesTitle", data.titulo);

        const description = String(data.descricao || "").trim();

        content.setText(
            "livesDescription",
            description || "Escolha entre Twitch e YouTube para assistir às lives recentes."
        );
    }

    async function init() {
        setupCarousel();
        bindTabs();

        try {
            pageData = await content.getJSON("data/content/lives.json");
            applySectionContent(pageData);

            youtubeVideos = Array.isArray(pageData.videos)
                ? pageData.videos
                    .map(normalizeYoutubeVideo)
                    .filter(Boolean)
                    .slice(0, getMaxItems())
                : [];

            const configuredDefault =
                String(pageData.defaultPlatform || "twitch").toLowerCase();

            await selectPlatform(
                configuredDefault === "youtube" ? "youtube" : "twitch"
            );
        } catch (error) {
            console.error("Erro ao carregar configuração de lives:", error);
            setMessage("Não foi possível carregar as lives agora.");
        }
    }

    init();
})();
