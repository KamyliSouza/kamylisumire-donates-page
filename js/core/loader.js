(() => {
    const loader =
        document.getElementById("site-loader");

    const root =
        document.documentElement;

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

    const startedAt =
        Number(window.KAMYLI_LOADER_STARTED_AT) ||
        performance.now();

    const needsAgenda =
        Boolean(
            document.getElementById("agendaGrid")
        );

    let domReady =
        document.readyState !== "loading";

    let finished = false;
    let finishTimer = null;

    root.classList.add(
        "site-loading-visible"
    );

    function localContentReady() {
        const pageContentReady =
            window.KAMYLI_PAGE_CONTENT_READY === true;

        const footerReady =
            window.KAMYLI_FOOTER_READY === true;

        const agendaReady =
            !needsAgenda ||
            window.KAMYLI_AGENDA_READY === true;

        return (
            pageContentReady &&
            footerReady &&
            agendaReady
        );
    }

    function dispatchRevealed() {
        window.dispatchEvent(
            new CustomEvent(
                "kamyli:site-revealed",
                {
                    detail: {
                        loaderShown: true,
                        minimumDisplayMs:
                            MIN_DISPLAY_MS,
                        pageTransition:
                            root.dataset.pageTransition ||
                            null
                    }
                }
            )
        );
    }

    function clearPageArrival() {
        root.classList.remove(
            "site-page-arriving"
        );

        delete root.dataset.pageTransition;
    }

    function beginReveal() {
        if (finished) return;

        finished = true;

        if (finishTimer !== null) {
            window.clearTimeout(finishTimer);
            finishTimer = null;
        }

        root.classList.add(
            "site-revealing"
        );

        loader.classList.add(
            "is-leaving"
        );

        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible"
        );

        window.setTimeout(
            () => loader.remove(),
            EXIT_MS
        );

        window.setTimeout(
            () => {
                root.classList.remove(
                    "site-revealing"
                );

                root.classList.add(
                    "site-ready"
                );

                dispatchRevealed();
                clearPageArrival();
            },
            REVEAL_STATE_MS
        );
    }

    function scheduleReveal(force = false) {
        if (finished) return;

        if (
            !force &&
            (
                !domReady ||
                !localContentReady()
            )
        ) {
            return;
        }

        const elapsed =
            performance.now() - startedAt;

        const remaining =
            Math.max(
                0,
                MIN_DISPLAY_MS - elapsed
            );

        if (remaining === 0) {
            beginReveal();
            return;
        }

        if (finishTimer !== null) {
            return;
        }

        finishTimer =
            window.setTimeout(
                beginReveal,
                remaining
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

    window.addEventListener(
        "kamyli:loader-ready",
        checkReady
    );

    window.setTimeout(
        () => scheduleReveal(true),
        MAX_WAIT_MS
    );

    checkReady();
})();
