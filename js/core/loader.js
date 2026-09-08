(() => {
    "use strict";

    const loader = document.getElementById("site-loader");
    const root = document.documentElement;

    if (!loader) {
        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible",
            "site-page-arriving"
        );
        delete root.dataset.pageTransition;
        delete root.dataset.blurPreparing;
        root.classList.add("site-ready");
        return;
    }

    const MIN_DISPLAY_MS = 1000;
    const MAX_WAIT_MS = 4000;
    const EXIT_MS = 320;

    /*
     * V45.2.3 — timing manual previsível.
     *
     * PAGE_REVEAL_DELAY_MS:
     * pausa REAL depois que o loader termina e é removido.
     *
     * PAGE_REVEAL_OVERLAP_MS:
     * entrada antecipada da página antes do loader terminar.
     * Use este valor em vez de delay negativo.
     */
    const PAGE_REVEAL_DELAY_MS = 150;
    const PAGE_REVEAL_OVERLAP_MS = 0;

    const REVEAL_STATE_MS = 420;
    const BACKDROP_READY_TIMEOUT_MS = 1400;
    const BACKDROP_DECODE_TIMEOUT_MS = 700;
    const BLUR_WARMUP_FRAMES = 3;
    const PREPARE_LEAD_MS = 180;

    const startedAt =
        Number(window.KAMYLI_LOADER_STARTED_AT) || performance.now();

    const needsAgenda = Boolean(document.getElementById("agendaGrid"));
    let domReady = document.readyState !== "loading";
    let finished = false;
    let revealPreparing = false;
    let finishTimer = null;
    let blurWarmupSession = null;
    let backdropReady = false;
    let blurPrepared = false;

    const pageRevealDelayMs =
        Math.max(
            0,
            Number(PAGE_REVEAL_DELAY_MS) || 0
        );

    const pageRevealOverlapMs =
        Math.min(
            EXIT_MS,
            Math.max(
                0,
                Number(PAGE_REVEAL_OVERLAP_MS) || 0
            )
        );

    /*
     * Diagnóstico no DevTools: confirma a versão e os valores realmente
     * carregados pelo navegador.
     */
    root.dataset.loaderTimingVersion = "45.2.3";
    root.dataset.pageRevealDelayMs =
        String(pageRevealDelayMs);
    root.dataset.pageRevealOverlapMs =
        String(pageRevealOverlapMs);

    root.classList.add("site-loading-visible");

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
                    minimumDisplayMs: MIN_DISPLAY_MS,
                    pageTransition: root.dataset.pageTransition || null,
                    backdropReady,
                    blurPrepared,
                    pageRevealDelayMs,
                    pageRevealOverlapMs,
                    loaderTimingVersion: "45.2.3"
                }
            })
        );
    }

    function clearPageArrival() {
        root.classList.remove("site-page-arriving");
        delete root.dataset.pageTransition;
    }

    const waitFrame = () =>
        new Promise(resolve => requestAnimationFrame(resolve));

    const timeout = ms =>
        new Promise(resolve => setTimeout(() => resolve("timeout"), ms));

    function uniqueElements(elements) {
        return [...new Set(elements.filter(element => element instanceof Element))];
    }

    function shouldPrepareBackdrop() {
        return (
            root.dataset.blur === "on" &&
            root.dataset.performance === "normal" &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
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

    function getBlurSurfaces() {
        return uniqueElements([
            document.querySelector("#site-navbar .site-nav"),
            ...document.querySelectorAll(".glass-panel"),
            document.querySelector(".site-footer")
        ]);
    }

    function cleanupBlurWarmup() {
        if (!blurWarmupSession) {
            delete root.dataset.blurPreparing;
            return;
        }

        blurWarmupSession.forEach(({ element, willChange }) => {
            element.style.willChange = willChange;
        });

        blurWarmupSession = null;
        delete root.dataset.blurPreparing;
    }

    async function warmBlurSurfaces() {
        if (!shouldPrepareBackdrop()) return false;

        const surfaces = getBlurSurfaces();
        if (!surfaces.length) return false;

        root.dataset.blurPreparing = "true";
        blurWarmupSession = surfaces.map(element => ({
            element,
            willChange: element.style.willChange
        }));

        surfaces.forEach(element => {
            element.style.willChange = "backdrop-filter, transform";
            const styles = getComputedStyle(element);
            void styles.backdropFilter;
            void styles.webkitBackdropFilter;
            void element.offsetHeight;
        });

        for (let index = 0; index < BLUR_WARMUP_FRAMES; index += 1) {
            await waitFrame();
        }

        blurPrepared = true;
        return true;
    }

    async function prepareVisualBackdrop() {
        if (!shouldPrepareBackdrop()) return;

        /*
         * V45.2.2: mantemos o preload/decode do fundo, mas não tentamos
         * eliminar completamente o ajuste tardio do blur dos cards.
         */
        await waitForBackdropAsset();
    }

    function finishReveal() {
        /*
         * V45.2.3 — timeline explícita.
         *
         * Sem overlap:
         * loader fade-out -> loader removido -> delay -> página entra.
         *
         * Com overlap:
         * a página começa PAGE_REVEAL_OVERLAP_MS antes do fim do loader.
         * Nesse modo o delay pós-loader é ignorado.
         */
        root.classList.add("site-page-delay");

        loader.classList.add("is-leaving");
        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible"
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
                cleanupBlurWarmup();
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

        /*
         * O delay positivo nasce após a remoção REAL do loader.
         * Isso torna 100 ms, 250 ms ou 500 ms diretamente perceptíveis.
         */
        setTimeout(() => {
            loader.remove();

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
            cleanupBlurWarmup();
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
