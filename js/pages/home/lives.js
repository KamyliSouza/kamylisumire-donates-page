(() => {
    const content = window.KamyliContent;

    const section =
        document.getElementById("lives");

    const track =
        document.getElementById("livesTrack");

    const prev =
        document.getElementById("livesPrev");

    const next =
        document.getElementById("livesNext");

    const youtubeLink =
        document.getElementById("livesYoutubeLink");

    const youtubeLinkText =
        document.getElementById("livesYoutubeLinkText");

    const dialog =
        document.getElementById("livesDialog");

    const dialogTitle =
        document.getElementById("livesDialogTitle");

    const dialogClose =
        document.getElementById("livesDialogClose");

    const dialogPlayer =
        document.getElementById("livesDialogPlayer");

    const dialogYoutubeLink =
        document.getElementById("livesDialogYoutubeLink");

    if (
        !content ||
        !section ||
        !track ||
        !dialog ||
        !dialogPlayer
    ) {
        return;
    }

    const PLAYLIST_ID_PATTERN =
        /^[A-Za-z0-9_-]{10,100}$/;

    const VIDEO_ID_PATTERN =
        /^[A-Za-z0-9_-]{11}$/;

    const DEFAULT_STEP = 320;
    const DISCOVERY_TIMEOUT_MS = 12000;

    const metrics = {
        step: DEFAULT_STEP,
        maxScrollLeft: 0
    };

    let playlistId = "";
    let maxItems = 10;

    let playlistIds = [];
    let discoveryStarted = false;
    let animationFrame = null;
    let measureFrame = null;
    let buttonFrame = null;
    let resizeObserver = null;
    let intersectionObserver = null;
    let activeTrigger = null;

    function normalizePlaylistId(value) {
        const candidate =
            String(value || "").trim();

        return PLAYLIST_ID_PATTERN.test(
            candidate
        )
            ? candidate
            : "";
    }

    function normalizeUrl(value) {
        const raw =
            String(value || "").trim();

        if (!raw) return "";

        try {
            const url =
                new URL(raw);

            const hostname =
                url.hostname.toLowerCase();

            if (
                url.protocol === "https:" &&
                (
                    hostname === "youtube.com" ||
                    hostname.endsWith(".youtube.com")
                )
            ) {
                return url.href;
            }
        } catch (error) {
            console.warn(
                "URL do YouTube inválida em lives.json.",
                error
            );
        }

        return "";
    }

    function normalizeMaxItems(value) {
        const number =
            Number.parseInt(
                value,
                10
            );

        if (
            Number.isInteger(number) &&
            number >= 3 &&
            number <= 20
        ) {
            return number;
        }

        return 10;
    }

    function buildPlaylistUrl(id) {
        return (
            "https://www.youtube.com/" +
            "playlist?list=" +
            encodeURIComponent(id)
        );
    }

    function buildVideoUrl(videoId) {
        return (
            "https://www.youtube.com/" +
            "watch?v=" +
            encodeURIComponent(videoId) +
            "&list=" +
            encodeURIComponent(playlistId)
        );
    }

    function buildPopupEmbedUrl(
        videoId,
        index
    ) {
        const params =
            new URLSearchParams({
                autoplay: "1",
                rel: "0",
                playsinline: "1",
                list: playlistId,
                index: String(index + 1)
            });

        return (
            "https://www.youtube-nocookie.com/" +
            "embed/" +
            encodeURIComponent(videoId) +
            "?" +
            params.toString()
        );
    }

    function thumbnailUrl(videoId) {
        return (
            "https://i.ytimg.com/vi/" +
            encodeURIComponent(videoId) +
            "/hqdefault.jpg"
        );
    }

    function setMessage(text) {
        const message =
            document.createElement("p");

        message.className =
            "lives-message";

        message.textContent =
            String(text || "");

        track.replaceChildren(
            message
        );

        playlistIds = [];

        scheduleMeasure();
    }

    function applyExternalLink(
        channelUrl,
        label
    ) {
        if (!youtubeLink) return;

        youtubeLink.href =
            playlistId
                ? buildPlaylistUrl(
                    playlistId
                )
                : channelUrl ||
                    "https://youtube.com/kamyli";

        if (
            youtubeLinkText &&
            label
        ) {
            youtubeLinkText.textContent =
                String(label);
        }
    }

    function applyText(data) {
        content.setText(
            "livesEyebrow",
            data.eyebrow
        );

        content.setText(
            "livesTitle",
            data.titulo
        );

        content.setText(
            "livesDescription",
            data.descricao
        );

        if (
            dialogTitle &&
            data.modalTitulo
        ) {
            dialogTitle.textContent =
                String(
                    data.modalTitulo
                );
        }
    }

    function applyButtonState() {
        if (!prev || !next) return;

        const hasCards =
            playlistIds.length > 0;

        if (!hasCards) {
            prev.disabled = true;
            next.disabled = true;
            return;
        }

        const currentLeft =
            track.scrollLeft;

        prev.disabled =
            currentLeft <= 2;

        next.disabled =
            currentLeft >=
            metrics.maxScrollLeft - 2;
    }

    function scheduleButtonUpdate() {
        if (buttonFrame !== null) {
            return;
        }

        buttonFrame =
            requestAnimationFrame(() => {
                buttonFrame = null;
                applyButtonState();
            });
    }

    function measureCarousel() {
        const card =
            track.querySelector(
                ".live-thumb-card"
            );

        const styles =
            getComputedStyle(track);

        const gap =
            Number.parseFloat(
                styles.columnGap ||
                styles.gap ||
                "0"
            ) || 0;

        const cardWidth =
            card
                ? card
                    .getBoundingClientRect()
                    .width
                : 0;

        metrics.step =
            cardWidth > 0
                ? cardWidth + gap
                : DEFAULT_STEP;

        metrics.maxScrollLeft =
            Math.max(
                0,
                track.scrollWidth -
                track.clientWidth
            );

        applyButtonState();
    }

    function scheduleMeasure() {
        if (measureFrame !== null) {
            return;
        }

        measureFrame =
            requestAnimationFrame(() => {
                measureFrame = null;
                measureCarousel();
            });
    }

    function easeInOutQuint(progress) {
        return progress < 0.5
            ? 16 *
                progress *
                progress *
                progress *
                progress *
                progress
            : 1 -
                Math.pow(
                    -2 * progress + 2,
                    5
                ) / 2;
    }

    function animateTo(
        targetLeft,
        duration = 520
    ) {
        if (animationFrame !== null) {
            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;
        }

        const destination =
            Math.max(
                0,
                Math.min(
                    targetLeft,
                    metrics.maxScrollLeft
                )
            );

        const reducedMotion =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

        const reducedPerformance =
            document.documentElement
                .dataset.performance ===
            "reduced";

        if (
            reducedMotion ||
            reducedPerformance
        ) {
            track.scrollLeft =
                destination;

            scheduleButtonUpdate();
            return;
        }

        const startLeft =
            track.scrollLeft;

        const distance =
            destination -
            startLeft;

        if (Math.abs(distance) < 1) {
            scheduleButtonUpdate();
            return;
        }

        const startTime =
            performance.now();

        function step(now) {
            const elapsed =
                now - startTime;

            const progress =
                Math.min(
                    elapsed / duration,
                    1
                );

            track.scrollLeft =
                startLeft +
                (
                    distance *
                    easeInOutQuint(
                        progress
                    )
                );

            if (progress < 1) {
                animationFrame =
                    requestAnimationFrame(
                        step
                    );

                return;
            }

            track.scrollLeft =
                destination;

            animationFrame = null;
            scheduleButtonUpdate();
        }

        animationFrame =
            requestAnimationFrame(step);
    }

    function scrollCarousel(direction) {
        animateTo(
            track.scrollLeft +
            (
                metrics.step *
                direction
            )
        );
    }

    function cancelCarouselAnimation() {
        if (animationFrame === null) {
            return;
        }

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
        scheduleButtonUpdate();
    }

    function setupCarouselControls() {
        prev?.addEventListener(
            "click",
            () => scrollCarousel(-1)
        );

        next?.addEventListener(
            "click",
            () => scrollCarousel(1)
        );

        track.addEventListener(
            "scroll",
            scheduleButtonUpdate,
            { passive: true }
        );

        [
            "pointerdown",
            "touchstart",
            "wheel"
        ].forEach(eventName => {
            track.addEventListener(
                eventName,
                cancelCarouselAnimation,
                { passive: true }
            );
        });

        track.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "ArrowLeft"
                ) {
                    event.preventDefault();
                    scrollCarousel(-1);
                }

                if (
                    event.key ===
                    "ArrowRight"
                ) {
                    event.preventDefault();
                    scrollCarousel(1);
                }
            }
        );

        if (
            "ResizeObserver" in window
        ) {
            resizeObserver =
                new ResizeObserver(
                    scheduleMeasure
                );

            resizeObserver.observe(
                track
            );
        } else {
            window.addEventListener(
                "resize",
                scheduleMeasure,
                { passive: true }
            );
        }

        scheduleMeasure();
    }

    function closeDialog() {
        if (dialog.open) {
            dialog.close();
        }
    }

    function teardownDialogPlayer() {
        dialogPlayer.replaceChildren();

        document.body.classList.remove(
            "site-lives-dialog-open"
        );

        if (activeTrigger) {
            activeTrigger.focus({
                preventScroll: true
            });
        }

        activeTrigger = null;
    }

    function openDialog(
        videoId,
        index,
        trigger
    ) {
        if (
            !VIDEO_ID_PATTERN.test(
                videoId
            )
        ) {
            return;
        }

        activeTrigger = trigger || null;

        document
            .querySelectorAll(
                ".live-thumb-card.is-last-viewed"
            )
            .forEach(card => {
                card.classList.remove(
                    "is-last-viewed"
                );
            });

        trigger?.classList.add(
            "is-last-viewed"
        );

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.src =
            buildPopupEmbedUrl(
                videoId,
                index
            );

        iframe.title =
            `Player da live ${index + 1}`;

        iframe.referrerPolicy =
            "strict-origin-when-cross-origin";

        iframe.allow =
            "accelerometer; autoplay; clipboard-write; " +
            "encrypted-media; gyroscope; picture-in-picture; " +
            "web-share";

        iframe.allowFullscreen = true;

        dialogPlayer.replaceChildren(
            iframe
        );

        if (dialogYoutubeLink) {
            dialogYoutubeLink.href =
                buildVideoUrl(videoId);
        }

        document.body.classList.add(
            "site-lives-dialog-open"
        );

        if (
            typeof dialog.showModal ===
            "function"
        ) {
            dialog.showModal();
        } else {
            dialog.setAttribute(
                "open",
                ""
            );
        }
    }

    function setupDialog() {
        dialogClose?.addEventListener(
            "click",
            closeDialog
        );

        dialog.addEventListener(
            "click",
            event => {
                if (
                    event.target === dialog
                ) {
                    closeDialog();
                }
            }
        );

        dialog.addEventListener(
            "close",
            teardownDialogPlayer
        );

        dialog.addEventListener(
            "cancel",
            () => {
                /*
                 * O fechamento nativo por Esc continua permitido.
                 * O evento close fará a limpeza do iframe.
                 */
            }
        );
    }

    function renderCards(ids) {
        const cleanIds =
            ids
                .filter(id =>
                    VIDEO_ID_PATTERN.test(
                        String(id)
                    )
                )
                .slice(
                    0,
                    maxItems
                );

        playlistIds =
            cleanIds;

        if (!cleanIds.length) {
            setMessage(
                "A playlist não possui lives disponíveis agora."
            );

            return;
        }

        const fragment =
            document.createDocumentFragment();

        cleanIds.forEach(
            (videoId, index) => {
                const card =
                    document.createElement(
                        "button"
                    );

                card.type = "button";

                card.className =
                    "live-thumb-card";

                card.setAttribute(
                    "aria-label",
                    `Abrir live ${index + 1} em um popup`
                );

                const imageWrap =
                    document.createElement(
                        "span"
                    );

                imageWrap.className =
                    "live-thumb-image";

                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    thumbnailUrl(
                        videoId
                    );

                image.alt = "";
                image.width = 480;
                image.height = 270;
                image.loading = "lazy";
                image.decoding = "async";

                image.addEventListener(
                    "error",
                    () => {
                        imageWrap.classList.add(
                            "is-missing"
                        );
                    },
                    { once: true }
                );

                const play =
                    document.createElement(
                        "span"
                    );

                play.className =
                    "live-thumb-play";

                play.setAttribute(
                    "aria-hidden",
                    "true"
                );

                const label =
                    document.createElement(
                        "span"
                    );

                label.className =
                    "live-thumb-label";

                label.textContent =
                    `Live ${index + 1}`;

                imageWrap.append(
                    image,
                    play,
                    label
                );

                card.appendChild(
                    imageWrap
                );

                card.addEventListener(
                    "click",
                    () => {
                        openDialog(
                            videoId,
                            index,
                            card
                        );
                    }
                );

                fragment.appendChild(
                    card
                );
            }
        );

        track.replaceChildren(
            fragment
        );

        track.scrollLeft = 0;
        scheduleMeasure();
    }

    function loadIframeApi() {
        if (
            window.YT &&
            typeof window.YT.Player ===
                "function"
        ) {
            return Promise.resolve(
                window.YT
            );
        }

        if (
            window
                .KAMYLI_YOUTUBE_IFRAME_API_PROMISE
        ) {
            return window
                .KAMYLI_YOUTUBE_IFRAME_API_PROMISE;
        }

        window
            .KAMYLI_YOUTUBE_IFRAME_API_PROMISE =
            new Promise(
                (resolve, reject) => {
                    const previous =
                        window
                            .onYouTubeIframeAPIReady;

                    let settled = false;

                    const timeout =
                        window.setTimeout(
                            () => {
                                if (settled) {
                                    return;
                                }

                                settled = true;

                                reject(
                                    new Error(
                                        "Timeout ao carregar YouTube IFrame API."
                                    )
                                );
                            },
                            DISCOVERY_TIMEOUT_MS
                        );

                    window
                        .onYouTubeIframeAPIReady =
                        () => {
                            if (
                                typeof previous ===
                                "function"
                            ) {
                                try {
                                    previous();
                                } catch (error) {
                                    console.error(
                                        "Erro em callback anterior da IFrame API:",
                                        error
                                    );
                                }
                            }

                            if (settled) {
                                return;
                            }

                            settled = true;

                            clearTimeout(
                                timeout
                            );

                            resolve(
                                window.YT
                            );
                        };

                    const existing =
                        document.querySelector(
                            'script[data-kamyli-youtube-iframe-api]'
                        );

                    if (existing) {
                        return;
                    }

                    const script =
                        document.createElement(
                            "script"
                        );

                    script.src =
                        "https://www.youtube.com/iframe_api";

                    script.async = true;

                    script.dataset
                        .kamyliYoutubeIframeApi =
                        "true";

                    script.addEventListener(
                        "error",
                        () => {
                            if (settled) {
                                return;
                            }

                            settled = true;

                            clearTimeout(
                                timeout
                            );

                            reject(
                                new Error(
                                    "Falha ao carregar YouTube IFrame API."
                                )
                            );
                        },
                        { once: true }
                    );

                    document.head.appendChild(
                        script
                    );
                }
            );

        return window
            .KAMYLI_YOUTUBE_IFRAME_API_PROMISE;
    }

    async function discoverPlaylistIds() {
        const YT =
            await loadIframeApi();

        if (
            !YT ||
            typeof YT.Player !==
                "function"
        ) {
            throw new Error(
                "YouTube IFrame API indisponível."
            );
        }

        return new Promise(
            (resolve, reject) => {
                const wrapper =
                    document.createElement(
                        "div"
                    );

                wrapper.className =
                    "lives-playlist-probe";

                wrapper.setAttribute(
                    "aria-hidden",
                    "true"
                );

                const mount =
                    document.createElement(
                        "div"
                    );

                wrapper.appendChild(
                    mount
                );

                document.body.appendChild(
                    wrapper
                );

                let player = null;
                let poll = null;
                let done = false;

                function cleanup() {
                    if (poll !== null) {
                        clearInterval(poll);
                        poll = null;
                    }

                    try {
                        player?.destroy();
                    } catch (error) {
                        console.warn(
                            "Não foi possível destruir probe do YouTube:",
                            error
                        );
                    }

                    wrapper.remove();
                }

                function finish(ids) {
                    if (done) return;

                    done = true;

                    cleanup();

                    resolve(
                        Array.isArray(ids)
                            ? ids
                            : []
                    );
                }

                function fail(error) {
                    if (done) return;

                    done = true;

                    cleanup();

                    reject(error);
                }

                const timeout =
                    window.setTimeout(
                        () => {
                            fail(
                                new Error(
                                    "Timeout ao descobrir vídeos da playlist."
                                )
                            );
                        },
                        DISCOVERY_TIMEOUT_MS
                    );

                function maybeReadPlaylist() {
                    try {
                        const ids =
                            player?.getPlaylist?.();

                        if (
                            Array.isArray(ids) &&
                            ids.length
                        ) {
                            clearTimeout(
                                timeout
                            );

                            finish(ids);
                        }
                    } catch (error) {
                        /*
                         * Durante o cue o player pode ainda não estar
                         * pronto para responder. O polling continua.
                         */
                    }
                }

                try {
                    player =
                        new YT.Player(
                            mount,
                            {
                                width: "1",
                                height: "1",

                                playerVars: {
                                    controls: 0,
                                    disablekb: 1,
                                    playsinline: 1,
                                    rel: 0
                                },

                                events: {
                                    onReady: () => {
                                        try {
                                            player.cuePlaylist({
                                                listType:
                                                    "playlist",

                                                list:
                                                    playlistId,

                                                index: 0,

                                                startSeconds:
                                                    0
                                            });

                                            poll =
                                                window.setInterval(
                                                    maybeReadPlaylist,
                                                    250
                                                );
                                        } catch (error) {
                                            clearTimeout(
                                                timeout
                                            );

                                            fail(error);
                                        }
                                    },

                                    onStateChange:
                                        event => {
                                            if (
                                                event.data ===
                                                YT.PlayerState.CUED
                                            ) {
                                                maybeReadPlaylist();
                                            }
                                        },

                                    onError:
                                        event => {
                                            clearTimeout(
                                                timeout
                                            );

                                            fail(
                                                new Error(
                                                    `YouTube player error ${event.data}`
                                                )
                                            );
                                        }
                                }
                            }
                        );
                } catch (error) {
                    clearTimeout(
                        timeout
                    );

                    fail(error);
                }
            }
        );
    }

    async function startDiscovery(
        errorMessage
    ) {
        if (discoveryStarted) {
            return;
        }

        discoveryStarted = true;

        try {
            const ids =
                await discoverPlaylistIds();

            renderCards(ids);
        } catch (error) {
            console.error(
                "Erro ao carregar playlist de lives:",
                error
            );

            setMessage(
                errorMessage ||
                "Não foi possível carregar a playlist agora."
            );
        }
    }

    function scheduleDiscovery(
        errorMessage
    ) {
        if (!playlistId) {
            return;
        }

        if (
            "IntersectionObserver"
            in window
        ) {
            intersectionObserver =
                new IntersectionObserver(
                    entries => {
                        if (
                            entries.some(
                                entry =>
                                    entry.isIntersecting
                            )
                        ) {
                            intersectionObserver
                                ?.disconnect();

                            intersectionObserver =
                                null;

                            startDiscovery(
                                errorMessage
                            );
                        }
                    },
                    {
                        rootMargin:
                            "500px 0px"
                    }
                );

            intersectionObserver.observe(
                section
            );

            return;
        }

        startDiscovery(
            errorMessage
        );
    }

    async function init() {
        try {
            const data =
                await content.getJSON(
                    "/data/content/lives.json"
                );

            applyText(data);

            playlistId =
                normalizePlaylistId(
                    data.playlistId
                );

            maxItems =
                normalizeMaxItems(
                    data.maxItems
                );

            const channelUrl =
                normalizeUrl(
                    data.canalUrl
                );

            applyExternalLink(
                channelUrl,
                data.botaoCanal
            );

            if (!playlistId) {
                setMessage(
                    data.mensagemSemPlaylist
                );

                return;
            }

            setMessage(
                data.mensagemCarregando
            );

            scheduleDiscovery(
                data.mensagemErro
            );
        } catch (error) {
            console.error(
                "Erro ao carregar configuração de lives:",
                error
            );

            setMessage(
                "Não foi possível preparar a seção de lives."
            );

            applyExternalLink(
                "https://youtube.com/kamyli",
                "Abrir no YouTube"
            );
        }
    }

    setupCarouselControls();
    setupDialog();

    init();
})();
