(() => {
    const mount = document.getElementById("site-navbar");
    if (!mount) return;

    const path = window.location.pathname;
    const onDonations = path.includes("/doacoes");
    const onHome = Boolean(document.getElementById("inicio"));
    const sitePath = window.KAMYLI_SITE_PATH || (value => value);

    mount.innerHTML = `
        <nav class="site-nav" aria-label="Navegação principal">
            <div class="site-nav-inner">
                <a
                    class="site-brand"
                    href="${sitePath("/")}"
                    aria-label="Ir para a página inicial"
                >
                    <span
                        class="site-brand-logo"
                        aria-hidden="true"
                    ></span>
                </a>

                <span class="site-nav-divider" aria-hidden="true"></span>

                <div class="site-nav-links">
                    <a
                        class="site-nav-link"
                        data-nav-section="inicio"
                        href="${sitePath("/")}"
                    >
                        Início
                    </a>

                    <a
                        class="site-nav-link"
                        data-nav-section="agenda"
                        href="${sitePath("/#agenda")}"
                    >
                        Agenda
                    </a>

                    <a
                        class="site-nav-link"
                        href="https://trello.com/b/IfgV0jXS/jogos-das-lives"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Jogos
                    </a>

                    <a
                        class="site-nav-link"
                        data-nav-section="regras"
                        href="${sitePath("/#regras")}"
                    >
                        Regras
                    </a>

                    <a
                        class="site-nav-link"
                        data-nav-section="creditos"
                        href="${sitePath("/#creditos")}"
                    >
                        Créditos
                    </a>
                </div>

                <span
                    class="site-nav-divider site-nav-support-divider"
                    aria-hidden="true"
                ></span>

                <div class="site-nav-support-wrap">
                    <a
                        class="site-nav-link site-nav-donate site-nav-support"
                        data-nav-page="doacoes"
                        href="${sitePath("/doacoes/")}"
                    >
                        <svg
                            class="site-nav-support-icon"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="M12 21s-7.2-4.35-9.6-8.35C.65 9.95 1.5 6.4 4.6 5.1c2-.85 4.25-.3 5.65 1.35L12 8.5l1.75-2.05c1.4-1.65 3.65-2.2 5.65-1.35 3.1 1.3 3.95 4.85 2.2 7.55C19.2 16.65 12 21 12 21Z"></path>
                        </svg>
                        <span>Apoiar</span>
                    </a>
                </div>
            </div>
        </nav>
    `;

    const navLinksContainer = mount.querySelector(".site-nav-links");
    const navSectionLinks = [
        ...mount.querySelectorAll("[data-nav-section]")
    ];
    const donationsLink = mount.querySelector(
        '[data-nav-page="doacoes"]'
    );

    function keepActiveLinkVisible(link, behavior = "smooth") {
        if (
            !link ||
            !navLinksContainer ||
            !navLinksContainer.contains(link)
        ) {
            return;
        }

        const containerRect = navLinksContainer.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        const targetLeft =
            navLinksContainer.scrollLeft +
            (linkRect.left - containerRect.left) -
            (containerRect.width / 2) +
            (linkRect.width / 2);

        navLinksContainer.scrollTo({
            left: Math.max(0, targetLeft),
            behavior
        });
    }

    function setActiveLink(link, behavior = "smooth") {
        mount.querySelectorAll(".site-nav-link").forEach(item => {
            const active = item === link;

            item.classList.toggle("is-active", active);

            if (active) {
                item.setAttribute(
                    "aria-current",
                    onDonations && item === donationsLink
                        ? "page"
                        : "location"
                );
            } else {
                item.removeAttribute("aria-current");
            }
        });

        if (link) {
            keepActiveLinkVisible(link, behavior);
        }
    }

    const HOME_NAV_TARGET_KEY = "kamyli:home-nav-target";

    let pageScrollFrame = null;
    let isProgrammaticScroll = false;
    let previousRootScrollBehavior = "";

    function prefersReducedMotion() {
        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }

    function easeInOutCubic(progress) {
        return progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    }

    function getSectionTop(section) {
        if (!section) return 0;

        const nav = mount.querySelector(".site-nav");
        const navHeight = nav?.getBoundingClientRect().height || 68;
        const extraGap = 14;

        return Math.max(
            0,
            window.scrollY +
            section.getBoundingClientRect().top -
            navHeight -
            extraGap
        );
    }

    function restoreRootScrollBehavior() {
        document.documentElement.style.scrollBehavior =
            previousRootScrollBehavior;
    }

    function cancelPageScrollAnimation() {
        if (!pageScrollFrame) return;

        cancelAnimationFrame(pageScrollFrame);
        pageScrollFrame = null;
        isProgrammaticScroll = false;
        restoreRootScrollBehavior();
    }

    function animatePageScroll(targetTop, onComplete) {
        cancelPageScrollAnimation();

        const startTop = window.scrollY;
        const maxTop = Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight
        );

        const destination = Math.max(
            0,
            Math.min(targetTop, maxTop)
        );

        const distance = destination - startTop;

        if (
            prefersReducedMotion() ||
            Math.abs(distance) < 2
        ) {
            window.scrollTo(0, destination);
            onComplete?.();
            return;
        }

        /*
         * Quanto maior a distância, um pouco maior a duração.
         * O limite evita tanto movimentos secos quanto animações lentas.
         */
        const duration = Math.min(
            900,
            Math.max(520, Math.abs(distance) * 0.42)
        );

        const startTime = performance.now();

        previousRootScrollBehavior =
            document.documentElement.style.scrollBehavior;

        /*
         * global.css possui scroll-behavior: smooth.
         * Durante a animação própria precisamos usar "auto" para que
         * cada frame seja aplicado imediatamente e o easing fique limpo.
         */
        document.documentElement.style.scrollBehavior = "auto";
        isProgrammaticScroll = true;

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeInOutCubic(progress);

            window.scrollTo(
                0,
                startTop + (distance * eased)
            );

            if (progress < 1) {
                pageScrollFrame = requestAnimationFrame(step);
                return;
            }

            window.scrollTo(0, destination);

            pageScrollFrame = null;
            isProgrammaticScroll = false;
            restoreRootScrollBehavior();

            onComplete?.();
        }

        pageScrollFrame = requestAnimationFrame(step);
    }

    function updateSectionHash(sectionId) {
        if (!sectionId) return;

        const nextUrl =
            `${window.location.pathname}` +
            `${window.location.search}` +
            `#${sectionId}`;

        history.replaceState(null, "", nextUrl);
    }

    function scrollToSection(section, link, updateHash = true) {
        if (!section) return;

        setActiveLink(link);

        animatePageScroll(
            getSectionTop(section),
            () => {
                setActiveLink(link);

                if (updateHash) {
                    updateSectionHash(section.id);
                }
            }
        );
    }

    /*
     * Se o usuário interagir durante a animação, ele reassume o controle
     * imediatamente.
     */
    ["wheel", "touchstart", "pointerdown"].forEach(eventName => {
        window.addEventListener(
            eventName,
            cancelPageScrollAnimation,
            { passive: true }
        );
    });

    window.addEventListener("keydown", event => {
        const interruptKeys = new Set([
            "ArrowUp",
            "ArrowDown",
            "PageUp",
            "PageDown",
            "Home",
            "End",
            " "
        ]);

        if (interruptKeys.has(event.key)) {
            cancelPageScrollAnimation();
        }
    });

    if (onDonations) {
        setActiveLink(donationsLink, "auto");

        /*
         * Ao sair de /doacoes/ para uma seção da Home, não usamos o hash
         * na navegação. Guardamos o destino e deixamos a Home animar
         * naturalmente depois de carregar.
         */
        navSectionLinks.forEach(link => {
            link.addEventListener("click", event => {
                event.preventDefault();

                const sectionId = link.dataset.navSection;

                try {
                    sessionStorage.setItem(
                        HOME_NAV_TARGET_KEY,
                        sectionId
                    );
                } catch {
                    // sessionStorage pode estar indisponível em modos restritos.
                }

                window.location.href = sitePath("/");
            });
        });
    } else if (onHome) {
        const sectionMap = new Map();

        navSectionLinks.forEach(link => {
            const sectionId = link.dataset.navSection;
            const section = document.getElementById(sectionId);

            if (section) {
                sectionMap.set(section, link);
            }
        });

        const visibleSections = new Map();

        function chooseActiveSection() {
            /*
             * Durante um clique na navbar mantemos o destino selecionado;
             * assim o scrollspy não passa rapidamente por Agenda/Regras
             * enquanto a animação vai até Créditos.
             */
            if (isProgrammaticScroll || !visibleSections.size) return;

            const entries = [...visibleSections.entries()]
                .filter(([, value]) => value.isIntersecting)
                .sort((a, b) => {
                    const aTop = Math.abs(
                        a[1].boundingClientRect.top
                    );

                    const bTop = Math.abs(
                        b[1].boundingClientRect.top
                    );

                    return aTop - bTop;
                });

            if (!entries.length) return;

            const [section] = entries[0];
            const link = sectionMap.get(section);

            setActiveLink(link);
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                visibleSections.set(entry.target, entry);
            });

            chooseActiveSection();
        }, {
            root: null,
            rootMargin: "-22% 0px -58% 0px",
            threshold: [0, 0.05, 0.2, 0.5]
        });

        sectionMap.forEach((link, section) => {
            observer.observe(section);
        });

        let pendingSectionId = "";

        try {
            pendingSectionId =
                sessionStorage.getItem(HOME_NAV_TARGET_KEY) || "";

            if (pendingSectionId) {
                sessionStorage.removeItem(HOME_NAV_TARGET_KEY);
            }
        } catch {
            pendingSectionId = "";
        }

        const initialHash =
            window.location.hash.replace("#", "");

        const targetSectionId =
            pendingSectionId || initialHash || "inicio";

        const initialLink =
            navSectionLinks.find(link =>
                link.dataset.navSection === targetSectionId
            ) ||
            navSectionLinks.find(link =>
                link.dataset.navSection === "inicio"
            );

        setActiveLink(initialLink, "auto");

        /*
         * Para navegação vinda de outra página usamos sessionStorage,
         * então a Home chega realmente ao topo e começa a animação dali.
         *
         * Para URLs abertas diretamente com #agenda/#creditos, corrigimos
         * primeiro o salto automático do navegador e então animamos.
         */
        if (targetSectionId !== "inicio") {
            const initialSection =
                document.getElementById(targetSectionId);

            if (initialSection && initialLink) {
                previousRootScrollBehavior =
                    document.documentElement.style.scrollBehavior;

                document.documentElement.style.scrollBehavior = "auto";
                window.scrollTo(0, 0);
                restoreRootScrollBehavior();

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        scrollToSection(
                            initialSection,
                            initialLink,
                            true
                        );
                    });
                });
            }
        }

        navSectionLinks.forEach(link => {
            link.addEventListener("click", event => {
                const targetUrl =
                    new URL(link.href, window.location.href);

                if (
                    targetUrl.pathname !==
                    window.location.pathname
                ) {
                    return;
                }

                const sectionId =
                    link.dataset.navSection;

                const section =
                    document.getElementById(sectionId);

                if (!section) return;

                event.preventDefault();

                scrollToSection(
                    section,
                    link,
                    true
                );
            });
        });
    }

})();
