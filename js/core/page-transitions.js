(() => {
    const root =
        document.documentElement;

    const STORAGE_KEY =
        "kamyli:page-transition";

    const EXIT_MS = 180;
    const MAX_AGE_MS = 8000;

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

    function normalizePath(pathname) {
        let path =
            pathname || "/";

        const config =
            window.KAMYLI_CONFIG?.repository;

        if (
            config &&
            window.location.hostname ===
                config.githubPagesHost
        ) {
            const prefix =
                `/${config.repositoryName}`;

            if (path === prefix) {
                path = "/";
            } else if (
                path.startsWith(`${prefix}/`)
            ) {
                path = path.slice(
                    prefix.length
                );
            }
        }

        if (!path.startsWith("/")) {
            path = `/${path}`;
        }

        return path;
    }

    function routeFromPath(pathname) {
        const path =
            normalizePath(pathname)
                .replace(
                    /\/index\.html$/,
                    "/"
                );

        if (
            path === "/" ||
            path === ""
        ) {
            return "home";
        }

        if (
            path === "/doacoes" ||
            path.startsWith("/doacoes/")
        ) {
            return "doacoes";
        }

        return "other";
    }

    function clearArrivalState() {
        root.classList.remove(
            "site-page-arriving"
        );

        delete root.dataset.pageTransition;
    }

    function readArrivalState() {
        let state = null;

        try {
            const raw =
                sessionStorage.getItem(
                    STORAGE_KEY
                );

            if (raw) {
                sessionStorage.removeItem(
                    STORAGE_KEY
                );

                state = JSON.parse(raw);
            }
        } catch {
            state = null;
        }

        if (
            !state ||
            !animationAllowed()
        ) {
            clearArrivalState();
            return;
        }

        const age =
            Date.now() -
            Number(state.timestamp || 0);

        const currentRoute =
            routeFromPath(
                window.location.pathname
            );

        if (
            age < 0 ||
            age > MAX_AGE_MS ||
            state.to !== currentRoute ||
            state.direction !== "forward"
        ) {
            clearArrivalState();
            return;
        }

        root.dataset.pageTransition =
            "forward";

        root.classList.add(
            "site-page-arriving"
        );
    }

    function getInternalLink(event) {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return null;
        }

        if (
            !(event.target instanceof Element)
        ) {
            return null;
        }

        const link =
            event.target.closest("a[href]");

        if (
            !link ||
            link.hasAttribute("download")
        ) {
            return null;
        }

        const target =
            link.getAttribute("target");

        if (
            target &&
            target !== "_self"
        ) {
            return null;
        }

        let url;

        try {
            url = new URL(
                link.href,
                window.location.href
            );
        } catch {
            return null;
        }

        if (
            !["http:", "https:"].includes(
                url.protocol
            ) ||
            url.origin !==
                window.location.origin
        ) {
            return null;
        }

        return { link, url };
    }

    function rememberTransition(
        from,
        to
    ) {
        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    from,
                    to,
                    direction: "forward",
                    timestamp: Date.now()
                })
            );
        } catch {
            /* sessionStorage pode estar indisponível. */
        }
    }

    function clearLeavingState() {
        const wasLeaving =
            root.classList.contains(
                "site-page-leaving"
            );

        root.classList.remove(
            "site-page-leaving",
            "site-page-leaving-forward"
        );

        if (
            wasLeaving &&
            !root.classList.contains(
                "site-page-arriving"
            )
        ) {
            delete root.dataset.pageTransition;
        }
    }

    readArrivalState();

    document.addEventListener(
        "click",
        event => {
            const internal =
                getInternalLink(event);

            if (!internal) {
                return;
            }

            const currentRoute =
                routeFromPath(
                    window.location.pathname
                );

            const targetRoute =
                routeFromPath(
                    internal.url.pathname
                );

            /*
             * Escopo V41:
             * somente Home -> /doacoes/.
             */
            if (
                currentRoute !== "home" ||
                targetRoute !== "doacoes"
            ) {
                return;
            }

            if (!animationAllowed()) {
                return;
            }

            event.preventDefault();

            rememberTransition(
                currentRoute,
                targetRoute
            );

            root.dataset.pageTransition =
                "forward";

            root.classList.add(
                "site-page-leaving",
                "site-page-leaving-forward"
            );

            window.setTimeout(
                () => {
                    window.location.assign(
                        internal.url.href
                    );
                },
                EXIT_MS
            );
        }
    );

    window.addEventListener(
        "pageshow",
        event => {
            if (event.persisted) {
                clearLeavingState();
            }
        }
    );
})();
