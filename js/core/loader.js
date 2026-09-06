(() => {
    const loader =
        document.getElementById("site-loader");

    if (!loader) {
        document.documentElement.classList.remove(
            "site-loading"
        );
        return;
    }

    const startedAt =
        Number(
            window.KAMYLI_LOADER_STARTED_AT
        ) || performance.now();

    const MIN_VISIBLE_MS = 460;
    const MAX_WAIT_MS = 2600;
    const EXIT_MS = 340;

    const needsAgenda =
        Boolean(
            document.getElementById("agendaGrid")
        );

    let windowLoaded =
        document.readyState === "complete";

    let finished = false;

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

    function hideLoader(force = false) {
        if (finished) return;

        if (
            !force &&
            (
                !windowLoaded ||
                !localContentReady()
            )
        ) {
            return;
        }

        finished = true;

        const elapsed =
            performance.now() - startedAt;

        const remaining =
            force
                ? 0
                : Math.max(
                    0,
                    MIN_VISIBLE_MS - elapsed
                );

        window.setTimeout(() => {
            loader.classList.add(
                "is-leaving"
            );

            document.documentElement.classList.remove(
                "site-loading"
            );

            window.setTimeout(() => {
                loader.remove();
            }, EXIT_MS);
        }, remaining);
    }

    function checkReady() {
        hideLoader(false);
    }

    if (!windowLoaded) {
        window.addEventListener(
            "load",
            () => {
                windowLoaded = true;
                checkReady();
            },
            { once: true }
        );
    }

    window.addEventListener(
        "kamyli:loader-ready",
        checkReady
    );

    /*
     * Proteção contra JSON quebrado, script bloqueado ou
     * conexão inesperadamente lenta. O loader nunca prende o site.
     */
    window.setTimeout(
        () => hideLoader(true),
        MAX_WAIT_MS
    );

    checkReady();
})();
