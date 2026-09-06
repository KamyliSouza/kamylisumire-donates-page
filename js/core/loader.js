(() => {
    const loader =
        document.getElementById("site-loader");

    const root =
        document.documentElement;

    if (!loader) {
        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible"
        );
        root.classList.add(
            "site-ready"
        );
        return;
    }

    /*
     * O loader fica inicialmente oculto. Em visitas rápidas o conteúdo
     * termina antes deste atraso e o loader nunca entra no paint/LCP.
     */
    const SHOW_DELAY_MS = 180;
    const MIN_VISIBLE_AFTER_SHOW_MS = 160;
    const MAX_WAIT_MS = 2400;
    const EXIT_MS = 320;
    const REVEAL_STATE_MS = 420;

    const needsAgenda =
        Boolean(
            document.getElementById("agendaGrid")
        );

    let domReady =
        document.readyState !== "loading";

    let finished = false;
    let loaderShownAt = 0;
    let showTimer = null;

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

    function dispatchRevealed(loaderWasShown) {
        window.dispatchEvent(
            new CustomEvent(
                "kamyli:site-revealed",
                {
                    detail: {
                        loaderShown: loaderWasShown
                    }
                }
            )
        );
    }

    function finishWithoutShowingLoader() {
        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible",
            "site-revealing"
        );
        root.classList.add(
            "site-ready"
        );

        loader.remove();
        dispatchRevealed(false);
    }

    function beginReveal() {
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

        window.setTimeout(() => {
            loader.remove();
        }, EXIT_MS);

        window.setTimeout(() => {
            root.classList.remove(
                "site-revealing"
            );

            root.classList.add(
                "site-ready"
            );

            dispatchRevealed(true);
        }, REVEAL_STATE_MS);
    }

    function completeLoader(force = false) {
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

        finished = true;

        if (showTimer !== null) {
            window.clearTimeout(showTimer);
            showTimer = null;
        }

        if (!loaderShownAt) {
            finishWithoutShowingLoader();
            return;
        }

        const visibleFor =
            performance.now() - loaderShownAt;

        const remaining =
            force
                ? 0
                : Math.max(
                    0,
                    MIN_VISIBLE_AFTER_SHOW_MS - visibleFor
                );

        window.setTimeout(
            beginReveal,
            remaining
        );
    }

    function showLoaderIfStillNeeded() {
        showTimer = null;

        if (finished) return;

        if (
            domReady &&
            localContentReady()
        ) {
            completeLoader(false);
            return;
        }

        loaderShownAt = performance.now();
        root.classList.add(
            "site-loading-visible"
        );
    }

    function checkReady() {
        completeLoader(false);
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

    showTimer = window.setTimeout(
        showLoaderIfStillNeeded,
        SHOW_DELAY_MS
    );

    /*
     * Proteção contra JSON quebrado, script bloqueado ou conexão lenta.
     * O estado pendente nunca pode prender a interface indefinidamente.
     */
    window.setTimeout(
        () => completeLoader(true),
        MAX_WAIT_MS
    );

    checkReady();
})();
