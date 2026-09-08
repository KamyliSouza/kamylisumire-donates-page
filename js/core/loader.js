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
        root.classList.add("site-ready");
        return;
    }

    const MIN_DISPLAY_MS = 1000;
    const MAX_WAIT_MS = 4000;
    const EXIT_MS = 320;
    const REVEAL_STATE_MS = 420;
    const BLUR_PRIME_LEAD_MS = 96;
    const BLUR_PRIME_FRAMES = 2;

    const startedAt =
        Number(window.KAMYLI_LOADER_STARTED_AT) || performance.now();

    const needsAgenda = Boolean(document.getElementById("agendaGrid"));
    let domReady = document.readyState !== "loading";
    let finished = false;
    let revealPreparing = false;
    let finishTimer = null;

    root.classList.add("site-loading-visible");

    function localContentReady() {
        return (
            window.KAMYLI_PAGE_CONTENT_READY === true &&
            window.KAMYLI_FOOTER_READY === true &&
            window.KAMYLI_GLOBAL_UI_READY === true &&
            (
                !needsAgenda ||
                window.KAMYLI_AGENDA_READY === true
            )
        );
    }

    function dispatchRevealed() {
        window.dispatchEvent(
            new CustomEvent("kamyli:site-revealed", {
                detail: {
                    loaderShown: true,
                    minimumDisplayMs: MIN_DISPLAY_MS,
                    pageTransition: root.dataset.pageTransition || null,
                    blurPrimed:
                        root.dataset.blur === "on" &&
                        root.dataset.performance === "normal"
                }
            })
        );
    }

    function clearPageArrival() {
        root.classList.remove("site-page-arriving");
        delete root.dataset.pageTransition;
    }

    const frame = () =>
        new Promise(resolve => requestAnimationFrame(resolve));

    function shouldPrimeBlur() {
        return (
            root.dataset.blur === "on" &&
            root.dataset.performance === "normal" &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }

    async function primeBlurLayers() {
        if (!shouldPrimeBlur()) return;

        const targets = [
            document.querySelector("#site-navbar .site-nav"),
            document.querySelector("body > main"),
            document.getElementById("site-footer")
        ].filter(Boolean);

        if (!targets.length) return;

        root.dataset.blurPriming = "true";

        const snapshots = targets.map(element => ({
            element,
            opacity: element.style.opacity,
            willChange: element.style.willChange
        }));

        targets.forEach(element => {
            element.style.opacity = "0.001";
            element.style.willChange =
                "opacity, transform, backdrop-filter";
        });

        void document.documentElement.offsetHeight;

        for (let i = 0; i < BLUR_PRIME_FRAMES; i += 1) {
            await frame();
        }

        root.classList.add("site-revealing");

        snapshots.forEach(({ element, opacity, willChange }) => {
            element.style.opacity = opacity;
            element.style.willChange = willChange;
        });

        delete root.dataset.blurPriming;
    }

    function finishReveal() {
        loader.classList.add("is-leaving");

        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible"
        );

        setTimeout(() => loader.remove(), EXIT_MS);

        setTimeout(() => {
            root.classList.remove("site-revealing");
            root.classList.add("site-ready");
            dispatchRevealed();
            clearPageArrival();
        }, REVEAL_STATE_MS);
    }

    async function prepareReveal() {
        if (finished || revealPreparing) return;

        revealPreparing = true;

        if (finishTimer !== null) {
            clearTimeout(finishTimer);
            finishTimer = null;
        }

        await primeBlurLayers();

        const remaining = Math.max(
            0,
            MIN_DISPLAY_MS - (performance.now() - startedAt)
        );

        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }

        if (finished) return;
        finished = true;

        if (!root.classList.contains("site-revealing")) {
            root.classList.add("site-revealing");
        }

        finishReveal();
    }

    function scheduleReveal(force = false) {
        if (finished || revealPreparing) return;

        if (
            !force &&
            (!domReady || !localContentReady())
        ) {
            return;
        }

        const remaining = Math.max(
            0,
            MIN_DISPLAY_MS - (performance.now() - startedAt)
        );

        const untilPrime = Math.max(
            0,
            remaining - BLUR_PRIME_LEAD_MS
        );

        if (untilPrime === 0) {
            prepareReveal();
            return;
        }

        if (finishTimer !== null) return;

        finishTimer = setTimeout(
            prepareReveal,
            untilPrime
        );
    }

    function checkReady() {
        scheduleReveal(false);
    }

    if (!domReady) {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                domReady = true;
                checkReady();
            },
            { once: true }
        );
    }

    window.addEventListener("kamyli:loader-ready", checkReady);
    window.addEventListener("kamyli:global-ui-ready", checkReady);

    setTimeout(() => scheduleReveal(true), MAX_WAIT_MS);
    checkReady();
})();
