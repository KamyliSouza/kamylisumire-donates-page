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

    const dialogSwitcher =
        document.getElementById("livesDialogSwitcher");

    const dialogTrack =
        document.getElementById("livesDialogTrack");

    const dialogPrev =
        document.getElementById("livesDialogPrev");

    const dialogNext =
        document.getElementById("livesDialogNext");

    if (
        !content ||
        !section ||
        !track ||
        !dialog ||
        !dialogPlayer ||
        !dialogSwitcher ||
        !dialogTrack
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
    let animationFrame = null;
    let measureFrame = null;
    let buttonFrame = null;
    let resizeObserver = null;
    let activeTrigger = null;
    let selectedDialogIndex = -1;

    let dialogPlayerInstance = null;
    let dialogPlayerReady = false;
    let dialogPlayerGeneration = 0;
    let dialogPlaylistPoll = null;
    let dialogPlaylistTimeout = null;
    let pendingDialogIndex = 0;
    let pendingDialogAutoplay = false;
    let loadErrorMessage =
        "Não foi possível carregar a playlist agora.";

    const dialogMetrics = {
        step: 140
    };

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

    function buildPlayerEmbedUrl() {
        const params =
            new URLSearchParams({
                listType: "playlist",
                list: playlistId,
                enablejsapi: "1",
                playsinline: "1",
                rel: "0",
                origin:
                    window.location.origin
            });

        return (
            "https://www.youtube.com/" +
            "embed?" +
            params.toString()
        );
    }

    function thumbnailUrl(videoId) {
        return (
            "https://i.ytimg.com/vi/" +
            encodeURIComponent(videoId) +
            "/mqdefault.jpg"
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

    function renderLoadPrompt(
        message =
            "Carregue as lives do YouTube para montar o carrossel."
    ) {
        playlistIds = [];

        if (prev) {
            prev.disabled = true;
        }

        if (next) {
            next.disabled = true;
        }

        const prompt =
            document.createElement(
                "div"
            );

        prompt.className =
            "lives-load-prompt";

        const copy =
            document.createElement(
                "p"
            );

        copy.className =
            "lives-load-copy";

        copy.textContent =
            String(message);

        const button =
            document.createElement(
                "button"
            );

        button.type = "button";

        button.className =
            "lives-load-button";

        button.textContent =
            "Carregar lives";

        button.addEventListener(
            "click",
            () => {
                openPlaylistDialog(
                    button
                );
            }
        );

        const privacy =
            document.createElement(
                "small"
            );

        privacy.className =
            "lives-load-privacy";

        privacy.textContent =
            "O player oficial do YouTube só é carregado depois deste clique.";

        prompt.append(
            copy,
            button,
            privacy
        );

        track.replaceChildren(
            prompt
        );

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

    function clearDialogPlaylistWatch() {
        if (dialogPlaylistPoll !== null) {
            clearInterval(
                dialogPlaylistPoll
            );

            dialogPlaylistPoll = null;
        }

        if (
            dialogPlaylistTimeout !== null
        ) {
            clearTimeout(
                dialogPlaylistTimeout
            );

            dialogPlaylistTimeout = null;
        }
    }

    function teardownDialogPlayer() {
        dialogPlayerGeneration += 1;

        clearDialogPlaylistWatch();

        try {
            dialogPlayerInstance
                ?.destroy();
        } catch (error) {
            console.warn(
                "Não foi possível destruir o player do YouTube:",
                error
            );
        }

        dialogPlayerInstance = null;
        dialogPlayerReady = false;

        dialogPlayer.replaceChildren();
        dialogTrack.replaceChildren();

        dialogSwitcher.hidden = true;

        selectedDialogIndex = -1;

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

    function updateDialogCarouselButtons() {
        if (!dialogPrev || !dialogNext) {
            return;
        }

        const max =
            Math.max(
                0,
                dialogTrack.scrollWidth -
                dialogTrack.clientWidth
            );

        dialogPrev.disabled =
            dialogTrack.scrollLeft <= 2;

        dialogNext.disabled =
            dialogTrack.scrollLeft >=
            max - 2;
    }

    function measureDialogCarousel() {
        const card =
            dialogTrack.querySelector(
                ".lives-dialog-thumb"
            );

        const styles =
            getComputedStyle(
                dialogTrack
            );

        const gap =
            Number.parseFloat(
                styles.columnGap ||
                styles.gap ||
                "0"
            ) || 0;

        const width =
            card
                ? card
                    .getBoundingClientRect()
                    .width
                : 0;

        dialogMetrics.step =
            width > 0
                ? width + gap
                : 140;

        updateDialogCarouselButtons();
    }

    function scrollDialogCarousel(
        direction
    ) {
        const reduced =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches ||
            document.documentElement
                .dataset.performance ===
                "reduced";

        dialogTrack.scrollBy({
            left:
                dialogMetrics.step *
                direction,
            behavior:
                reduced
                    ? "auto"
                    : "smooth"
        });
    }

    function centerDialogThumb(index) {
        const card =
            dialogTrack.querySelector(
                `[data-dialog-index="${index}"]`
            );

        if (!card) {
            return;
        }

        const target =
            card.offsetLeft -
            (
                dialogTrack.clientWidth -
                card.offsetWidth
            ) / 2;

        const reduced =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches ||
            document.documentElement
                .dataset.performance ===
                "reduced";

        dialogTrack.scrollTo({
            left:
                Math.max(
                    0,
                    target
                ),
            behavior:
                reduced
                    ? "auto"
                    : "smooth"
        });
    }

    function updateDialogSelection(index) {
        selectedDialogIndex =
            index;

        dialogTrack
            .querySelectorAll(
                ".lives-dialog-thumb"
            )
            .forEach(card => {
                const active =
                    Number(
                        card.dataset.dialogIndex
                    ) === index;

                card.setAttribute(
                    "aria-current",
                    active
                        ? "true"
                        : "false"
                );
            });

        centerDialogThumb(
            index
        );
    }

    function updateSelectedVideoUi(
        videoId,
        index
    ) {
        if (
            !VIDEO_ID_PATTERN.test(
                videoId
            )
        ) {
            return;
        }

        if (dialogYoutubeLink) {
            dialogYoutubeLink.href =
                buildVideoUrl(videoId);
        }

        document
            .querySelectorAll(
                ".live-thumb-card.is-last-viewed"
            )
            .forEach(card => {
                card.classList.remove(
                    "is-last-viewed"
                );
            });

        document
            .querySelector(
                `.live-thumb-card[data-live-index="${index}"]`
            )
            ?.classList.add(
                "is-last-viewed"
            );

        updateDialogSelection(
            index
        );
    }

    function loadDialogVideo(
        videoId,
        index
    ) {
        if (
            !VIDEO_ID_PATTERN.test(
                videoId
            )
        ) {
            return;
        }

        pendingDialogIndex =
            index;

        pendingDialogAutoplay =
            true;

        updateSelectedVideoUi(
            videoId,
            index
        );

        if (
            dialogPlayerReady &&
            dialogPlayerInstance
        ) {
            try {
                dialogPlayerInstance
                    .playVideoAt(
                        index
                    );
            } catch (error) {
                console.error(
                    "Não foi possível trocar a live no player:",
                    error
                );
            }
        }
    }

    function renderDialogCarousel() {
        if (!playlistIds.length) {
            dialogTrack.replaceChildren();
            dialogSwitcher.hidden = true;
            return;
        }

        const fragment =
            document.createDocumentFragment();

        playlistIds.forEach(
            (videoId, index) => {
                const card =
                    document.createElement(
                        "button"
                    );

                card.type = "button";

                card.className =
                    "lives-dialog-thumb";

                card.dataset.dialogIndex =
                    String(index);

                card.setAttribute(
                    "aria-label",
                    `Trocar para live ${index + 1}`
                );

                card.setAttribute(
                    "aria-current",
                    "false"
                );

                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    thumbnailUrl(
                        videoId
                    );

                image.alt = "";
                image.width = 320;
                image.height = 180;
                image.loading = "lazy";
                image.decoding = "async";

                card.appendChild(
                    image
                );

                card.addEventListener(
                    "click",
                    () => {
                        loadDialogVideo(
                            videoId,
                            index
                        );
                    }
                );

                fragment.appendChild(
                    card
                );
            }
        );

        dialogTrack.replaceChildren(
            fragment
        );

        dialogSwitcher.hidden = false;

        requestAnimationFrame(
            () => {
                measureDialogCarousel();

                if (
                    selectedDialogIndex >= 0
                ) {
                    updateDialogSelection(
                        selectedDialogIndex
                    );
                }
            }
        );
    }

    function syncPlaylistIdsFromPlayer() {
        if (!dialogPlayerInstance) {
            return false;
        }

        try {
            const ids =
                dialogPlayerInstance
                    .getPlaylist?.();

            if (
                !Array.isArray(ids) ||
                !ids.length
            ) {
                return false;
            }

            clearDialogPlaylistWatch();

            renderCards(ids);
            renderDialogCarousel();

            const safeIndex =
                Math.max(
                    0,
                    Math.min(
                        pendingDialogIndex,
                        playlistIds.length - 1
                    )
                );

            if (
                playlistIds[safeIndex]
            ) {
                updateSelectedVideoUi(
                    playlistIds[safeIndex],
                    safeIndex
                );
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    function watchPlaylistIds() {
        clearDialogPlaylistWatch();

        if (
            syncPlaylistIdsFromPlayer()
        ) {
            return;
        }

        dialogPlaylistPoll =
            window.setInterval(
                syncPlaylistIdsFromPlayer,
                250
            );

        dialogPlaylistTimeout =
            window.setTimeout(
                () => {
                    clearDialogPlaylistWatch();

                    if (
                        !playlistIds.length
                    ) {
                        renderLoadPrompt(
                            "O player foi carregado, mas não foi possível montar o carrossel agora. Tente novamente."
                        );
                    }
                },
                DISCOVERY_TIMEOUT_MS
            );
    }

    function showDialogShell(
        trigger
    ) {
        activeTrigger =
            trigger || null;

        document.body.classList.add(
            "site-lives-dialog-open"
        );

        if (
            dialogYoutubeLink
        ) {
            dialogYoutubeLink.href =
                buildPlaylistUrl(
                    playlistId
                );
        }

        if (
            playlistIds.length
        ) {
            renderDialogCarousel();
        } else {
            dialogTrack.replaceChildren();
            dialogSwitcher.hidden = true;
        }

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

    function renderPlayerLoading() {
        const message =
            document.createElement(
                "p"
            );

        message.className =
            "lives-player-loading";

        message.textContent =
            "Carregando player do YouTube...";

        dialogPlayer.replaceChildren(
            message
        );
    }

    async function mountVisibleYoutubePlayer(
        index,
        autoplay
    ) {
        pendingDialogIndex =
            index;

        pendingDialogAutoplay =
            Boolean(autoplay);

        const generation =
            ++dialogPlayerGeneration;

        renderPlayerLoading();

        try {
            const YT =
                await loadIframeApi();

            if (
                generation !==
                    dialogPlayerGeneration ||
                !dialog.open
            ) {
                return;
            }

            if (
                !YT ||
                typeof YT.Player !==
                    "function"
            ) {
                throw new Error(
                    "YouTube IFrame API indisponível."
                );
            }

            const iframe =
                document.createElement(
                    "iframe"
                );

            iframe.src =
                buildPlayerEmbedUrl();

            iframe.title =
                "Player da playlist de lives no YouTube";

            /*
             * Requisito atual do YouTube:
             * manter identificação do cliente via Referer.
             */
            iframe.referrerPolicy =
                "strict-origin-when-cross-origin";

            iframe.width = "480";
            iframe.height = "270";

            iframe.allow =
                "accelerometer; autoplay; clipboard-write; " +
                "encrypted-media; gyroscope; picture-in-picture; " +
                "web-share";

            iframe.allowFullscreen = true;

            dialogPlayer.replaceChildren(
                iframe
            );

            dialogPlayerReady = false;

            dialogPlayerInstance =
                new YT.Player(
                    iframe,
                    {
                        events: {
                            onReady: event => {
                                if (
                                    generation !==
                                        dialogPlayerGeneration ||
                                    !dialog.open
                                ) {
                                    return;
                                }

                                dialogPlayerReady =
                                    true;

                                try {
                                    if (
                                        pendingDialogAutoplay
                                    ) {
                                        /*
                                         * Só ocorre após clique/tecla do
                                         * visitante e com o dialog visível.
                                         */
                                        event.target
                                            .loadPlaylist({
                                                listType:
                                                    "playlist",

                                                list:
                                                    playlistId,

                                                index:
                                                    pendingDialogIndex,

                                                startSeconds:
                                                    0
                                            });
                                    } else {
                                        /*
                                         * Primeiro carregamento:
                                         * prepara a playlist sem reproduzir.
                                         */
                                        event.target
                                            .cuePlaylist({
                                                listType:
                                                    "playlist",

                                                list:
                                                    playlistId,

                                                index:
                                                    pendingDialogIndex,

                                                startSeconds:
                                                    0
                                            });
                                    }

                                    watchPlaylistIds();
                                } catch (error) {
                                    console.error(
                                        "Não foi possível preparar a playlist:",
                                        error
                                    );
                                }
                            },

                            onStateChange: event => {
                                if (
                                    generation !==
                                        dialogPlayerGeneration
                                ) {
                                    return;
                                }

                                if (
                                    event.data ===
                                        YT.PlayerState.CUED ||
                                    event.data ===
                                        YT.PlayerState.PLAYING
                                ) {
                                    syncPlaylistIdsFromPlayer();
                                }
                            },

                            onError: event => {
                                console.error(
                                    `YouTube player error ${event.data}`
                                );

                                if (
                                    event.data === 153
                                ) {
                                    console.error(
                                        "O YouTube não recebeu Referer/identificação do cliente."
                                    );
                                }
                            }
                        }
                    }
                );
        } catch (error) {
            console.error(
                "Erro ao carregar player oficial do YouTube:",
                error
            );

            const message =
                document.createElement(
                    "p"
                );

            message.className =
                "lives-player-loading";

            message.textContent =
                loadErrorMessage;

            dialogPlayer.replaceChildren(
                message
            );

            renderLoadPrompt(
                "Não foi possível carregar o YouTube agora. Tente novamente."
            );
        }
    }

    function openPlaylistDialog(
        trigger
    ) {
        showDialogShell(
            trigger
        );

        mountVisibleYoutubePlayer(
            0,
            false
        );
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

        showDialogShell(
            trigger
        );

        updateSelectedVideoUi(
            videoId,
            index
        );

        mountVisibleYoutubePlayer(
            index,
            true
        );
    }

    function setupDialog() {
        dialogPrev?.addEventListener(
            "click",
            () => {
                scrollDialogCarousel(-1);
            }
        );

        dialogNext?.addEventListener(
            "click",
            () => {
                scrollDialogCarousel(1);
            }
        );

        dialogTrack.addEventListener(
            "scroll",
            updateDialogCarouselButtons,
            { passive: true }
        );

        dialogTrack.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "ArrowLeft" &&
                    selectedDialogIndex > 0
                ) {
                    event.preventDefault();

                    const index =
                        selectedDialogIndex - 1;

                    loadDialogVideo(
                        playlistIds[index],
                        index
                    );
                }

                if (
                    event.key ===
                    "ArrowRight" &&
                    selectedDialogIndex >= 0 &&
                    selectedDialogIndex <
                        playlistIds.length - 1
                ) {
                    event.preventDefault();

                    const index =
                        selectedDialogIndex + 1;

                    loadDialogVideo(
                        playlistIds[index],
                        index
                    );
                }
            }
        );

        window.addEventListener(
            "resize",
            () => {
                if (dialog.open) {
                    measureDialogCarousel();
                }
            },
            { passive: true }
        );

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

                card.dataset.liveIndex =
                    String(index);

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
                image.width = 320;
                image.height = 180;
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

                imageWrap.append(
                    image,
                    play
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

            loadErrorMessage =
                data.mensagemErro ||
                loadErrorMessage;

            if (!playlistId) {
                setMessage(
                    data.mensagemSemPlaylist
                );

                return;
            }

            renderLoadPrompt(
                "Carregue as lives do YouTube para montar o carrossel."
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
