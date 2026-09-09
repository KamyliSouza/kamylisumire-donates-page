(() => {
    "use strict";

    const api = window.KamyliAPI;

    const hero = document.getElementById("inicio");
    const tabs = document.getElementById("heroViewTabs");
    const aboutTab = document.getElementById("heroTabAbout");
    const liveTab = document.getElementById("heroTabLive");
    const aboutPanel = document.getElementById("heroAboutPanel");
    const livePanel = document.getElementById("heroLivePanel");
    const avatarFrame = document.getElementById("heroAvatarFrame");
    const livePreview = document.getElementById("heroLivePreview");
    const liveThumbnail = document.getElementById("heroLiveThumbnail");
    const liveTitle = document.getElementById("heroLiveTitle");
    const liveGame = document.getElementById("heroLiveGame");
    const liveViewers = document.getElementById("heroLiveViewers");
    const liveWatchButton = document.getElementById("heroLiveWatchButton");
    const heroLiveAnchor = document.getElementById("heroLiveAnchor");

    if (
        !api?.getJSON ||
        !hero ||
        !tabs ||
        !aboutTab ||
        !liveTab ||
        !aboutPanel ||
        !livePanel ||
        !avatarFrame
    ) {
        return;
    }

    const TWITCH_LIVE_ENDPOINT = "/twitch/live";
    const DEFAULT_TWITCH_URL = "https://www.twitch.tv/kamyli";
    const defaultHeroLiveUrl = heroLiveAnchor?.href || "";

    function withCacheRevision(url, revision) {
        const source = String(url || "").trim();
        const cacheRevision = String(revision || "").trim();

        if (!source || !cacheRevision) {
            return source;
        }

        const separator = source.includes("?") ? "&" : "?";
        return `${source}${separator}v=${encodeURIComponent(cacheRevision)}`;
    }

    function formatViewerCount(value) {
        const count = Math.max(0, Number(value) || 0);

        return `${new Intl.NumberFormat("pt-BR").format(count)} ${
            count === 1 ? "espectador" : "espectadores"
        }`;
    }

    function setSelectedView(view, options = {}) {
        const showLive = view === "live";

        aboutTab.setAttribute("aria-selected", String(!showLive));
        aboutTab.tabIndex = showLive ? -1 : 0;

        liveTab.setAttribute("aria-selected", String(showLive));
        liveTab.tabIndex = showLive ? 0 : -1;

        aboutPanel.hidden = showLive;
        livePanel.hidden = !showLive;

        if (options.focus) {
            (showLive ? liveTab : aboutTab).focus();
        }
    }

    function setOfflineState() {
        hero.classList.remove("is-twitch-live");
        avatarFrame.classList.remove("is-live");
        avatarFrame.removeAttribute("aria-label");

        tabs.hidden = true;
        setSelectedView("about");

        if (heroLiveAnchor && defaultHeroLiveUrl) {
            heroLiveAnchor.href = defaultHeroLiveUrl;
        }
    }

    function setLiveState(data) {
        const twitchUrl = String(data?.url || DEFAULT_TWITCH_URL).trim();
        const checkedAt = String(data?.checkedAt || "").trim();
        const thumbnail = withCacheRevision(data?.thumbnail, checkedAt);
        const title = String(data?.title || "Kamyli está ao vivo!").trim();
        const gameName = String(data?.gameName || "").trim();

        hero.classList.add("is-twitch-live");
        avatarFrame.classList.add("is-live");
        avatarFrame.setAttribute("aria-label", "Kamyli está ao vivo na Twitch");

        tabs.hidden = false;

        if (livePreview) {
            livePreview.href = twitchUrl;
            livePreview.setAttribute(
                "aria-label",
                `Assistir ${title} ao vivo na Twitch`
            );
        }

        if (liveWatchButton) {
            liveWatchButton.href = twitchUrl;
        }

        if (heroLiveAnchor) {
            heroLiveAnchor.href = twitchUrl;
        }

        if (liveThumbnail && thumbnail) {
            liveThumbnail.src = thumbnail;
        }

        if (liveTitle) {
            liveTitle.textContent = title;
        }

        if (liveGame) {
            liveGame.textContent = gameName;
            liveGame.hidden = !gameName;
        }

        if (liveViewers) {
            liveViewers.textContent = formatViewerCount(data?.viewerCount);
        }

        setSelectedView("live");
    }

    function bindTabs() {
        aboutTab.addEventListener("click", () => {
            setSelectedView("about");
        });

        liveTab.addEventListener("click", () => {
            setSelectedView("live");
        });

        [aboutTab, liveTab].forEach((tab, index, tabList) => {
            tab.addEventListener("keydown", event => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                    return;
                }

                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const nextIndex = (index + direction + tabList.length) % tabList.length;
                const nextTab = tabList[nextIndex];

                setSelectedView(nextTab === liveTab ? "live" : "about", {
                    focus: true
                });
            });
        });
    }

    async function loadLiveStatus() {
        try {
            const data = await api.getJSON(TWITCH_LIVE_ENDPOINT, {
                timeoutMs: 5000
            });

            if (data?.available === true && data?.live === true) {
                setLiveState(data);
                return;
            }
        } catch (error) {
            console.warn("Status ao vivo da Twitch indisponível:", error);
        }

        setOfflineState();
    }

    bindTabs();
    setOfflineState();
    loadLiveStatus();
})();
