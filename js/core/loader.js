(() => {
    const loader =
        document.getElementById("site-loader");

    if (!loader) {
        document.documentElement.classList.remove(
            "site-loading"
        );
        document.documentElement.classList.add(
            "site-ready"
        );
        return;
    }

    const startedAt =
        Number(
            window.KAMYLI_LOADER_STARTED_AT
        ) || performance.now();

    const MIN_VISIBLE_MS = 280;
    const MAX_WAIT_MS = 2400;
    const EXIT_MS = 300;
    const REVEAL_STATE_MS = 420;

    const needsAgenda =
        Boolean(
            document.getElementById("agendaGrid")
        );

    let domReady =
        document.readyState !== "loading";

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
                !domReady ||
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
            const root =
                document.documentElement;

            /*
             * Começa a entrada do conteúdo no mesmo ciclo em que o
             * loader inicia o fade-out. O CSS aplica delays curtos,
             * criando um crossfade discreto sem deixar a tela vazia.
             */
            root.classList.add(
                "site-revealing"
            );

            loader.classList.add(
                "is-leaving"
            );

            root.classList.remove(
                "site-loading"
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

                window.dispatchEvent(
                    new CustomEvent(
                        "kamyli:site-revealed"
                    )
                );
            }, REVEAL_STATE_MS);
        }, remaining);
    }

    function checkReady() {
        hideLoader(false);
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
