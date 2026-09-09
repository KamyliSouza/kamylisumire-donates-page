(() => {
    "use strict";

    const loader = document.getElementById("site-loader");
    const root = document.documentElement;

    if (!loader) {
        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible",
            "site-page-arriving",
            "site-navigation-loading"
        );
        delete root.dataset.pageTransition;
        delete root.dataset.blurPreparing;
        root.classList.add("site-ready");
        return;
    }

    const INITIAL_MIN_DISPLAY_MS = 1000;
    const INITIAL_MAX_WAIT_MS = 4000;
    const INITIAL_EXIT_MS = 320;

    const NAVIGATION_MIN_DISPLAY_MS = 240;
    const NAVIGATION_MAX_WAIT_MS = 1800;
    const NAVIGATION_ENTER_MS = 220;
    const NAVIGATION_EXIT_MS = 240;

    /*
     * V46.3 — o loader passa a ter dois modos:
     *
     * initial:
     * carregamento completo da primeira visita/reload.
     *
     * navigation:
     * ponte curta entre páginas internas. O loader entra sobre a página
     * atual, a troca de documento acontece já coberta, e o documento de
     * destino usa um tempo mínimo reduzido antes do reveal.
     */
    const PAGE_REVEAL_DELAY_MS = 0;
    const PAGE_REVEAL_OVERLAP_MS = 320;

    const NAVIGATION_REVEAL_DELAY_MS = 0;
    const NAVIGATION_REVEAL_OVERLAP_MS = 240;

    const REVEAL_STATE_MS = 420;
    const BACKDROP_READY_TIMEOUT_MS = 1400;
    const BACKDROP_DECODE_TIMEOUT_MS = 700;
    const PREPARE_LEAD_MS = 180;

    const navigationArrival =
        window.KAMYLI_PAGE_TRANSITION_ARRIVAL?.kind === "internal";

    const loaderMode =
        navigationArrival
            ? "navigation"
            : "initial";

    const MIN_DISPLAY_MS =
        navigationArrival
            ? NAVIGATION_MIN_DISPLAY_MS
            : INITIAL_MIN_DISPLAY_MS;

    const MAX_WAIT_MS =
        navigationArrival
            ? NAVIGATION_MAX_WAIT_MS
            : INITIAL_MAX_WAIT_MS;

    const EXIT_MS =
        navigationArrival
            ? NAVIGATION_EXIT_MS
            : INITIAL_EXIT_MS;

    const configuredRevealDelayMs =
        navigationArrival
            ? NAVIGATION_REVEAL_DELAY_MS
            : PAGE_REVEAL_DELAY_MS;

    const configuredRevealOverlapMs =
        navigationArrival
            ? NAVIGATION_REVEAL_OVERLAP_MS
            : PAGE_REVEAL_OVERLAP_MS;

    const startedAt =
        Number(window.KAMYLI_LOADER_STARTED_AT) || performance.now();

    const needsAgenda = Boolean(document.getElementById("agendaGrid"));
    let domReady = document.readyState !== "loading";
    let finished = false;
    let revealPreparing = false;
    let finishTimer = null;
    let backdropReady = false;

    const pageRevealDelayMs =
        Math.max(
            0,
            Number(configuredRevealDelayMs) || 0
        );

    const pageRevealOverlapMs =
        Math.min(
            EXIT_MS,
            Math.max(
                0,
                Number(configuredRevealOverlapMs) || 0
            )
        );

    root.dataset.loaderTimingVersion = "46.3";
    root.dataset.loaderMode = loaderMode;
    root.dataset.pageRevealDelayMs =
        String(pageRevealDelayMs);
    root.dataset.pageRevealOverlapMs =
        String(pageRevealOverlapMs);

    if (navigationArrival) {
        loader.classList.add("is-navigation");
    }

    loader.setAttribute("aria-hidden", "false");
    root.classList.add("site-loading-visible");

    function prefersReducedMotion() {
        try {
            return window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;
        } catch {
            return false;
        }
    }

    function animationAllowed() {
        return (
            !prefersReducedMotion() &&
            root.dataset.performance !== "reduced"
        );
    }

    function localContentReady() {
        return (
            window.KAMYLI_PAGE_CONTENT_READY === true &&
            window.KAMYLI_FOOTER_READY === true &&
            window.KAMYLI_GLOBAL_UI_READY === true &&
            (!needsAgenda || window.KAMYLI_AGENDA_READY === true)
        );
    }

    function dispatchRevealed() {
        window.dispatchEvent(
            new CustomEvent("kamyli:site-revealed", {
                detail: {
                    loaderShown: true,
                    loaderMode,
                    minimumDisplayMs: MIN_DISPLAY_MS,
                    pageTransition: root.dataset.pageTransition || null,
                    backdropReady,
                    pageRevealDelayMs,
                    pageRevealOverlapMs,
                    loaderTimingVersion: "46.3"
                }
            })
        );
    }

    function clearPageArrival() {
        root.classList.remove("site-page-arriving");
        delete root.dataset.pageTransition;
        delete window.KAMYLI_PAGE_TRANSITION_ARRIVAL;
    }

    const timeout = ms =>
        new Promise(resolve => setTimeout(() => resolve("timeout"), ms));

    function shouldPrepareBackdrop() {
        return (
            root.dataset.blur === "on" &&
            root.dataset.performance === "normal" &&
            !prefersReducedMotion()
        );
    }

    async function waitForBackdropAsset() {
        if (!shouldPrepareBackdrop()) return false;

        const assetUrl = window.KAMYLI_BACKDROP_ASSET_URL;
        if (!assetUrl) return false;

        const preloadPromise = window.KAMYLI_BACKDROP_PRELOAD_READY;
        if (preloadPromise && typeof preloadPromise.then === "function") {
            await Promise.race([
                preloadPromise,
                timeout(BACKDROP_READY_TIMEOUT_MS)
            ]);
        }

        const image = new Image();
        image.decoding = "async";
        image.src = assetUrl;

        try {
            if (typeof image.decode === "function") {
                const result = await Promise.race([
                    image.decode()
                        .then(() => "decoded")
                        .catch(() => "decode-error"),
                    timeout(BACKDROP_DECODE_TIMEOUT_MS)
                ]);
                backdropReady = result === "decoded";
            } else {
                backdropReady = image.complete && image.naturalWidth > 0;
            }
        } catch {
            backdropReady = false;
        }

        return backdropReady;
    }

    async function prepareVisualBackdrop() {
        if (!shouldPrepareBackdrop()) return;
        await waitForBackdropAsset();
    }

    function keepLoaderIdle() {
        loader.setAttribute("aria-hidden", "true");
        loader.classList.remove("is-navigation", "is-resetting");
        root.classList.remove("site-navigation-loading");
        root.dataset.loaderMode = "idle";
    }

    function finishReveal() {
        root.classList.add("site-page-delay");

        loader.classList.add("is-leaving");
        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible",
            "site-navigation-loading"
        );

        let pageRevealStarted = false;

        const beginPageReveal = () => {
            if (pageRevealStarted) return;
            pageRevealStarted = true;

            root.classList.add("site-revealing");
            root.classList.remove("site-page-delay");

            setTimeout(() => {
                root.classList.remove("site-revealing");
                root.classList.add("site-ready");
                dispatchRevealed();
                clearPageArrival();
            }, REVEAL_STATE_MS);
        };

        if (pageRevealOverlapMs > 0) {
            setTimeout(
                beginPageReveal,
                Math.max(
                    0,
                    EXIT_MS - pageRevealOverlapMs
                )
            );
        }

        setTimeout(() => {
            /*
             * V46.3: o loader não é removido. Ele permanece invisível e
             * reutilizável para a próxima navegação interna.
             */
            keepLoaderIdle();

            if (pageRevealOverlapMs > 0) {
                return;
            }

            setTimeout(
                beginPageReveal,
                pageRevealDelayMs
            );
        }, EXIT_MS);
    }

    async function prepareReveal() {
        if (finished || revealPreparing) return;
        revealPreparing = true;

        if (finishTimer !== null) {
            clearTimeout(finishTimer);
            finishTimer = null;
        }

        await prepareVisualBackdrop();

        const remaining = Math.max(
            0,
            MIN_DISPLAY_MS - (performance.now() - startedAt)
        );

        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }

        if (finished) {
            return;
        }

        finished = true;
        finishReveal();
    }

    function scheduleReveal(force = false) {
        if (finished || revealPreparing) return;
        if (!force && (!domReady || !localContentReady())) return;

        const remaining = Math.max(
            0,
            MIN_DISPLAY_MS - (performance.now() - startedAt)
        );
        const untilPrepare = Math.max(0, remaining - PREPARE_LEAD_MS);

        if (untilPrepare === 0) {
            prepareReveal();
            return;
        }

        if (finishTimer !== null) return;
        finishTimer = setTimeout(prepareReveal, untilPrepare);
    }

    async function showForNavigation() {
        if (!animationAllowed()) {
            return false;
        }

        loader.classList.add("is-navigation");
        loader.classList.remove("is-leaving", "is-resetting");
        loader.setAttribute("aria-hidden", "false");

        root.dataset.loaderMode = "navigation-outgoing";
        root.classList.remove("site-page-delay", "site-page-leaving");

        /*
         * Garante que o navegador enxergue o estado oculto antes de iniciar
         * a transição de opacity para o loader visível.
         */
        void loader.offsetWidth;

        root.classList.add("site-navigation-loading");

        window.dispatchEvent(
            new CustomEvent("kamyli:navigation-loader-show")
        );

        await new Promise(resolve =>
            setTimeout(resolve, NAVIGATION_ENTER_MS)
        );

        return true;
    }

    function resetNavigationState() {
        root.classList.remove(
            "site-navigation-loading",
            "site-page-leaving"
        );

        loader.classList.add("is-resetting", "is-leaving");
        loader.setAttribute("aria-hidden", "true");
        root.dataset.loaderMode = "idle";

        requestAnimationFrame(() => {
            loader.classList.remove("is-resetting", "is-navigation");
        });
    }

    window.KamyliLoader = Object.freeze({
        showForNavigation,
        resetNavigationState
    });

    const checkReady = () => scheduleReveal(false);

    if (!domReady) {
        document.addEventListener("DOMContentLoaded", () => {
            domReady = true;
            checkReady();
        }, { once: true });
    }

    window.addEventListener("kamyli:loader-ready", checkReady);
    window.addEventListener("kamyli:global-ui-ready", checkReady);

    setTimeout(() => scheduleReveal(true), MAX_WAIT_MS);
    checkReady();
})();
