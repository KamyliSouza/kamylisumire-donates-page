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
        delete root.dataset.blurPriming;
        root.classList.add("site-ready");
        return;
    }

    const MIN_DISPLAY_MS = 1000;
    const MAX_WAIT_MS = 4000;
    const EXIT_MS = 320;
    const REVEAL_STATE_MS = 420;

    /*
     * V45.1 — BLUR PRIMING FIX
     *
     * A V45 preparava navbar/main/footer, mas o blur real da Home vive
     * principalmente nos próprios .glass-panel. Agora:
     *
     * 1. o contêiner de reveal fica quase invisível atrás do loader;
     * 2. as superfícies que realmente usam backdrop-filter recebem
     *    will-change durante o priming;
     * 3. três frames são reservadas para style/layout/composição;
     * 4. o will-change permanece durante TODO o reveal;
     * 5. a otimização só é limpa depois que a animação termina.
     *
     * O trabalho continua ocorrendo dentro do tempo mínimo do loader sempre
     * que possível, sem penalizar perfil reduzido ou blur desligado.
     */
    const BLUR_PRIME_LEAD_MS = 120;
    const BLUR_PRIME_FRAMES = 3;

    const startedAt =
        Number(window.KAMYLI_LOADER_STARTED_AT) || performance.now();

    const needsAgenda = Boolean(document.getElementById("agendaGrid"));

    let domReady = document.readyState !== "loading";
    let finished = false;
    let revealPreparing = false;
    let finishTimer = null;
    let blurPrimeSession = null;
    let blurWasPrimed = false;

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
                    blurPrimed: blurWasPrimed
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

    function uniqueElements(elements) {
        return [
            ...new Set(
                elements.filter(
                    element => element instanceof Element
                )
            )
        ];
    }

    function shouldPrimeBlur() {
        return (
            root.dataset.blur === "on" &&
            root.dataset.performance === "normal" &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }

    function getRevealContainers() {
        return uniqueElements([
            document.querySelector("#site-navbar .site-nav"),
            document.querySelector("body > main"),
            document.querySelector(".site-footer")
        ]);
    }

    function getBlurSurfaces() {
        return uniqueElements([
            document.querySelector("#site-navbar .site-nav"),
            ...document.querySelectorAll(".glass-panel"),
            document.querySelector(".site-footer")
        ]);
    }

    function cleanupBlurPriming() {
        if (!blurPrimeSession) {
            delete root.dataset.blurPriming;
            return;
        }

        blurPrimeSession.snapshots.forEach(
            ({ element, opacity, willChange }) => {
                element.style.opacity = opacity;
                element.style.willChange = willChange;
            }
        );

        blurPrimeSession = null;
        delete root.dataset.blurPriming;
    }

    async function primeBlurLayers() {
        if (!shouldPrimeBlur()) {
            return false;
        }

        const revealContainers = getRevealContainers();
        const blurSurfaces = getBlurSurfaces();

        if (!blurSurfaces.length) {
            return false;
        }

        const allTargets = uniqueElements([
            ...revealContainers,
            ...blurSurfaces
        ]);

        const snapshots = allTargets.map(element => ({
            element,
            opacity: element.style.opacity,
            willChange: element.style.willChange
        }));

        blurPrimeSession = {
            snapshots,
            revealContainers,
            blurSurfaces
        };

        root.dataset.blurPriming = "true";

        /*
         * O CSS de loading usa opacity: 0 nos contêineres. Isso pode permitir
         * ao navegador adiar a pintura da subárvore. Um valor praticamente
         * invisível mantém a página escondida pelo loader, mas deixa o
         * compositor preparar o conteúdo real atrás dele.
         */
        revealContainers.forEach(element => {
            element.style.opacity = "0.001";
        });

        /*
         * Mantém a dica ativa até o fim do reveal. Não restauramos
         * will-change depois de duas frames como acontecia na V45.
         */
        allTargets.forEach(element => {
            const needsBackdrop =
                blurSurfaces.includes(element);

            element.style.willChange =
                needsBackdrop
                    ? "opacity, transform, backdrop-filter"
                    : "opacity, transform";
        });

        /*
         * Força resolução dos estilos das superfícies de blur reais.
         * A leitura é deliberada e acontece somente uma vez por carregamento.
         */
        blurSurfaces.forEach(element => {
            void element.offsetHeight;

            const styles = getComputedStyle(element);

            /*
             * Acessar ambas as propriedades força a resolução em engines
             * WebKit/Blink sem depender de uma implementação específica.
             */
            void styles.backdropFilter;
            void styles.webkitBackdropFilter;
        });

        for (let index = 0; index < BLUR_PRIME_FRAMES; index += 1) {
            await frame();
        }

        /*
         * Inicia a animação antes de restaurar a opacidade inline. Assim não
         * existe uma frame intermediária entre o priming e o estado reveal.
         */
        root.classList.add("site-revealing");

        revealContainers.forEach(element => {
            const snapshot = snapshots.find(
                item => item.element === element
            );

            element.style.opacity =
                snapshot?.opacity ?? "";
        });

        blurWasPrimed = true;
        return true;
    }

    function finishReveal() {
        loader.classList.add("is-leaving");

        root.classList.remove(
            "site-loading-pending",
            "site-loading-visible"
        );

        setTimeout(
            () => loader.remove(),
            EXIT_MS
        );

        setTimeout(() => {
            /*
             * V45.1: a otimização é removida SOMENTE depois que as animações
             * de navbar/main/footer já terminaram.
             */
            root.classList.remove("site-revealing");
            root.classList.add("site-ready");

            cleanupBlurPriming();
            dispatchRevealed();
            clearPageArrival();
        }, REVEAL_STATE_MS);
    }

    async function prepareReveal() {
        if (finished || revealPreparing) {
            return;
        }

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
            await new Promise(resolve =>
                setTimeout(resolve, remaining)
            );
        }

        if (finished) {
            cleanupBlurPriming();
            return;
        }

        finished = true;

        if (!root.classList.contains("site-revealing")) {
            root.classList.add("site-revealing");
        }

        finishReveal();
    }

    function scheduleReveal(force = false) {
        if (finished || revealPreparing) {
            return;
        }

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

        /*
         * O priming começa antes do fim do período mínimo. Em um carregamento
         * normal, as três frames ficam "escondidas" dentro do 1 segundo que
         * o loader já permaneceria aberto.
         */
        const untilPrime = Math.max(
            0,
            remaining - BLUR_PRIME_LEAD_MS
        );

        if (untilPrime === 0) {
            prepareReveal();
            return;
        }

        if (finishTimer !== null) {
            return;
        }

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

    window.addEventListener(
        "kamyli:loader-ready",
        checkReady
    );

    window.addEventListener(
        "kamyli:global-ui-ready",
        checkReady
    );

    setTimeout(
        () => scheduleReveal(true),
        MAX_WAIT_MS
    );

    checkReady();
})();
