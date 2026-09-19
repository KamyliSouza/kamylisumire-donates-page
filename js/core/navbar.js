(() => {
    const mount = document.getElementById("site-navbar");
    if (!mount) return;

    const path = window.location.pathname;
    const onDonations = path.includes("/doacoes");
    const onArts = /\/artes(?:\/|$)/.test(path);
    const onGames = /\/jogos(?:\/|$)/.test(path);
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

                <span class="site-nav-mobile-title" aria-live="polite" aria-atomic="true">
                    <span class="site-nav-mobile-title-text">Início</span>
                </span>

                <button
                    class="site-nav-mobile-trigger"
                    type="button"
                    aria-expanded="false"
                    aria-controls="site-nav-mobile-panel"
                >
                    <span class="site-nav-mobile-trigger-mark" aria-hidden="true">☰</span>
                    <span class="site-nav-mobile-trigger-label">Menu</span>
                </button>

                <div class="site-nav-links" id="site-nav-mobile-menu">
                    <a class="site-nav-link" data-nav-key="inicio" data-nav-section="inicio" href="${sitePath("/")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Início</span>
                    </a>

                    <a class="site-nav-link" data-nav-key="lives" data-nav-section="lives" href="${sitePath("/#lives")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Lives</span>
                    </a>

                    <a class="site-nav-link" data-nav-key="agenda" data-nav-section="agenda" href="${sitePath("/#agenda")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Agenda</span>
                    </a>

                    <a class="site-nav-link" data-nav-key="artes" data-nav-page="artes" href="${sitePath("/artes/")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Artes</span>
                    </a>

                    <a class="site-nav-link" data-nav-key="blog" data-nav-page="blog" href="${sitePath("/blog/")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Blog</span>
                    </a>

                    <a class="site-nav-link" data-nav-key="jogos" data-nav-page="jogos" href="${sitePath("/jogos/")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Jogos</span>
                    </a>

                    <a class="site-nav-link" data-nav-key="regras" data-nav-section="regras" href="${sitePath("/#regras")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Regras</span>
                    </a>

                    <a class="site-nav-link" data-nav-key="creditos" data-nav-section="creditos" href="${sitePath("/#creditos")}">
                        <span class="site-nav-item-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Créditos</span>
                    </a>
                </div>

                <div class="site-nav-mobile-footer" aria-label="Ação de apoio"></div>

                <span
                    class="site-nav-divider site-nav-support-divider"
                    aria-hidden="true"
                ></span>

                <div class="site-nav-support-wrap">
                    <a
                        class="site-nav-link site-nav-donate site-nav-support"
                        data-nav-key="apoio"
                        data-nav-page="doacoes"
                        href="${sitePath("/doacoes/")}"
                    >
                        <span class="site-nav-item-icon site-nav-support-icon" data-nav-icon aria-hidden="true" hidden></span>
                        <span data-nav-label>Apoiar</span>
                    </a>
                </div>
            </div>
        </nav>
    `;

    const nav = mount.querySelector(".site-nav");
    const navInner = mount.querySelector(".site-nav-inner");
    const navLinksContainer = mount.querySelector(".site-nav-links");
    const mobileTrigger = mount.querySelector(".site-nav-mobile-trigger");
    const mobileTitle = mount.querySelector(".site-nav-mobile-title");
    const mobileFooter = mount.querySelector(".site-nav-mobile-footer");
    const supportLink = mount.querySelector('[data-nav-key="apoio"]');
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    /*
     * Chromium/Brave trata ancestrais com backdrop-filter como containing
     * block de descendentes position: fixed. No mobile, Menu e seu painel
     * precisam ficar fora de .site-nav para serem realmente relativos à
     * viewport, assim como o componente @ Redes.
     */
    const mobileLayer = document.createElement("div");
    mobileLayer.className = "site-nav-mobile-layer";

    const mobileEdgeGesture = document.createElement("div");
    mobileEdgeGesture.className = "site-nav-mobile-edge-gesture";
    mobileEdgeGesture.setAttribute("aria-hidden", "true");

    const mobileBackdrop = document.createElement("div");
    mobileBackdrop.className = "site-nav-mobile-backdrop";
    mobileBackdrop.setAttribute("aria-hidden", "true");

    const mobilePanel = document.createElement("div");
    mobilePanel.className = "site-nav-mobile-panel";
    mobilePanel.id = "site-nav-mobile-panel";
    mobilePanel.setAttribute("role", "dialog");
    mobilePanel.setAttribute("aria-modal", "true");
    mobilePanel.setAttribute("aria-labelledby", "site-nav-mobile-panel-title");
    mobilePanel.setAttribute("aria-hidden", "true");
    mobilePanel.inert = true;

    const mobilePanelHeader = document.createElement("div");
    mobilePanelHeader.className = "site-nav-mobile-panel-header";

    const mobilePanelTitle = document.createElement("span");
    mobilePanelTitle.className = "site-nav-mobile-panel-title";
    mobilePanelTitle.id = "site-nav-mobile-panel-title";
    mobilePanelTitle.textContent = "Menu";

    const mobileClose = document.createElement("button");
    mobileClose.className = "site-nav-mobile-close";
    mobileClose.type = "button";
    mobileClose.setAttribute("aria-label", "Fechar menu");
    mobileClose.title = "Fechar menu";
    mobileClose.textContent = "×";

    mobilePanelHeader.append(mobilePanelTitle, mobileClose);
    mobilePanel.appendChild(mobilePanelHeader);
    mobileLayer.append(mobileEdgeGesture, mobileBackdrop, mobilePanel);
    mount.appendChild(mobileLayer);

    const linksHome = document.createComment("site-nav-links-home");
    navLinksContainer?.before(linksHome);

    const MOBILE_TITLE_MEMORY_KEY = "kamyli:mobile-nav-title";
    let mobileTitleAnimationTimer = null;
    let deferMobileTitleUntilReveal = false;
    let pendingRevealedMobileTitle = "";

    const MOBILE_FALLBACK_ICONS = Object.freeze({
        inicio: "home",
        lives: "video",
        agenda: "calendar",
        artes: "image",
        blog: "file-text",
        jogos: "gamepad",
        regras: "shield-check",
        creditos: "users"
    });

    const DRAWER_GESTURE_COMMIT_RATIO = 0.36;
    const DRAWER_GESTURE_FLICK_PX_MS = 0.45;
    const DRAWER_GESTURE_AXIS_LOCK_PX = 10;
    let drawerGesture = null;

    function ensureMobileFallbackIcons() {
        if (!navLinksContainer) return;

        const icons = window.KamyliButtonIcons;
        navLinksContainer
            .querySelectorAll(".site-nav-link[data-nav-key]")
            .forEach(link => {
                if (link.querySelector("[data-mobile-nav-fallback]")) return;

                const slot = link.querySelector("[data-nav-icon]");
                const iconName = MOBILE_FALLBACK_ICONS[link.dataset.navKey];
                const svg = icons?.create(
                    iconName,
                    "site-nav-mobile-fallback-svg"
                );

                if (!slot || !svg) return;

                const fallback = document.createElement("span");
                fallback.className = "site-nav-mobile-generic-icon";
                fallback.dataset.mobileNavFallback = "";
                fallback.setAttribute("aria-hidden", "true");
                fallback.appendChild(svg);
                slot.after(fallback);
            });
    }

    function syncMobileSupport() {
        if (!mobileFooter || !supportLink) return;

        const mobileSupport = supportLink.cloneNode(true);
        mobileSupport.classList.add("site-nav-mobile-support");
        mobileSupport.classList.remove("is-active");
        mobileSupport.removeAttribute("aria-current");
        mobileSupport.removeAttribute("data-nav-key");
        mobileSupport.removeAttribute("data-nav-page");
        mobileFooter.replaceChildren(mobileSupport);
    }

    function syncMobileLayer() {
        if (!navLinksContainer || !mobileTrigger || !navInner || !mobileFooter) return;

        if (mobileQuery.matches) {
            mobileLayer.appendChild(mobileTrigger);
            mobilePanel.append(navLinksContainer, mobileFooter);
            ensureMobileFallbackIcons();
            return;
        }

        closeMobileMenu();
        linksHome.after(navLinksContainer);
        navLinksContainer.before(mobileTrigger);
        navLinksContainer.after(mobileFooter);
        ensureMobileFallbackIcons();
    }

    function fallbackMobileTitle() {
        const title = document.title
            .split(/\s*[|·—]\s*/)[0]
            .trim();
        return title || "Kamyli Sumire";
    }

    function createMobileTitleText(label, state = "") {
        const text = document.createElement("span");
        text.className = "site-nav-mobile-title-text";
        if (state) text.classList.add(state);
        text.textContent = label;
        return text;
    }

    function currentMobileTitleText() {
        return mobileTitle?.querySelector(
            ".site-nav-mobile-title-text:last-child"
        ) || null;
    }

    function updateMobileTitle(link, { animate = true } = {}) {
        if (!mobileTitle) return;

        const label =
            link?.querySelector("[data-nav-label]")?.textContent?.trim() ||
            fallbackMobileTitle();

        const current = currentMobileTitleText();
        if (current?.textContent === label) return;

        if (animate && deferMobileTitleUntilReveal) {
            pendingRevealedMobileTitle = label;
            return;
        }

        if (mobileTitleAnimationTimer !== null) {
            window.clearTimeout(mobileTitleAnimationTimer);
            mobileTitleAnimationTimer = null;
        }

        if (!current || !animate || !mobileQuery.matches || prefersReducedMotion()) {
            mobileTitle.replaceChildren(createMobileTitleText(label));
            return;
        }

        const outgoing = createMobileTitleText(
            current.textContent || fallbackMobileTitle(),
            "is-leaving"
        );
        outgoing.setAttribute("aria-hidden", "true");

        const incoming = createMobileTitleText(label, "is-entering");
        mobileTitle.replaceChildren(outgoing, incoming);

        mobileTitleAnimationTimer = window.setTimeout(() => {
            mobileTitle.replaceChildren(createMobileTitleText(label));
            mobileTitleAnimationTimer = null;
        }, 300);
    }

    function initializeMobileTitle() {
        let previousTitle = "";

        try {
            previousTitle = sessionStorage.getItem(MOBILE_TITLE_MEMORY_KEY) || "";
            sessionStorage.removeItem(MOBILE_TITLE_MEMORY_KEY);
        } catch {
            previousTitle = "";
        }

        if (mobileQuery.matches && previousTitle) {
            mobileTitle?.replaceChildren(createMobileTitleText(previousTitle));

            if (!document.documentElement.classList.contains("site-ready")) {
                deferMobileTitleUntilReveal = true;

                let revealFallback = window.setTimeout(() => {
                    revealFallback = null;
                    finishDeferredMobileTitle();
                }, 5500);

                window.addEventListener(
                    "kamyli:site-revealed",
                    () => {
                        if (revealFallback !== null) {
                            window.clearTimeout(revealFallback);
                            revealFallback = null;
                        }
                        finishDeferredMobileTitle();
                    },
                    { once: true }
                );
            }
            return;
        }

        updateMobileTitle(null, { animate: false });
    }

    function finishDeferredMobileTitle() {
        if (!deferMobileTitleUntilReveal) return;

        deferMobileTitleUntilReveal = false;
        const label = pendingRevealedMobileTitle;
        pendingRevealedMobileTitle = "";

        if (!label) return;
        const pseudoLink = document.createElement("span");
        const pseudoLabel = document.createElement("span");
        pseudoLabel.dataset.navLabel = "";
        pseudoLabel.textContent = label;
        pseudoLink.appendChild(pseudoLabel);
        updateMobileTitle(pseudoLink);
    }

    function rememberMobileTitleForNavigation(anchor) {
        if (!mobileQuery.matches || !anchor?.href) return;

        let target;
        try {
            target = new URL(anchor.href, window.location.href);
        } catch {
            return;
        }

        if (target.origin !== window.location.origin || target.pathname === window.location.pathname) {
            return;
        }

        const title = currentMobileTitleText()?.textContent?.trim();
        if (!title) return;

        try {
            sessionStorage.setItem(MOBILE_TITLE_MEMORY_KEY, title);
        } catch {
            // sessionStorage pode estar indisponível em modos restritos.
        }
    }

    function clearDrawerGestureVisuals() {
        mobileLayer.classList.remove("is-mobile-menu-dragging");
        mobilePanel.style.removeProperty("transform");
        mobilePanel.style.removeProperty("transition");
        mobileBackdrop.style.removeProperty("opacity");
        mobileBackdrop.style.removeProperty("transition");
    }

    function drawerWidth() {
        const measured = mobilePanel.getBoundingClientRect().width;
        if (measured > 0) return measured;
        return Math.min(288, Math.max(248, window.innerWidth * 0.74));
    }

    function renderDrawerGesture(progress) {
        const value = Math.max(0, Math.min(1, progress));
        mobileLayer.classList.add("is-mobile-menu-dragging");
        mobilePanel.style.transition = "none";
        mobileBackdrop.style.transition = "none";
        mobilePanel.style.transform =
            `translateX(${(value - 1) * 100}%)`;
        mobileBackdrop.style.opacity = String(value);

        if (drawerGesture) drawerGesture.progress = value;
    }

    function cancelDrawerGesture() {
        drawerGesture = null;
        clearDrawerGestureVisuals();
    }

    function beginDrawerGesture(event, mode) {
        if (
            !mobileQuery.matches ||
            event.isPrimary === false ||
            event.pointerType === "mouse"
        ) {
            return;
        }

        drawerGesture = {
            pointerId: event.pointerId,
            mode,
            startX: event.clientX,
            startY: event.clientY,
            startTime: performance.now(),
            lastX: event.clientX,
            lastTime: performance.now(),
            velocityX: 0,
            progress: mode === "open" ? 0 : 1,
            locked: false
        };
    }

    function moveDrawerGesture(event) {
        if (!drawerGesture || event.pointerId !== drawerGesture.pointerId) {
            return;
        }

        const deltaX = event.clientX - drawerGesture.startX;
        const deltaY = event.clientY - drawerGesture.startY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (!drawerGesture.locked) {
            if (
                absX < DRAWER_GESTURE_AXIS_LOCK_PX &&
                absY < DRAWER_GESTURE_AXIS_LOCK_PX
            ) {
                return;
            }

            const wrongDirection =
                (drawerGesture.mode === "open" && deltaX <= 0) ||
                (drawerGesture.mode === "close" && deltaX >= 0);

            if (absY >= absX || wrongDirection) {
                cancelDrawerGesture();
                return;
            }

            drawerGesture.locked = true;
        }

        event.preventDefault();

        const now = performance.now();
        const elapsed = Math.max(1, now - drawerGesture.lastTime);
        drawerGesture.velocityX =
            (event.clientX - drawerGesture.lastX) / elapsed;
        drawerGesture.lastX = event.clientX;
        drawerGesture.lastTime = now;

        const width = drawerWidth();
        const progress = drawerGesture.mode === "open"
            ? deltaX / width
            : 1 + (deltaX / width);

        renderDrawerGesture(progress);
    }

    function endDrawerGesture(event) {
        if (!drawerGesture || event.pointerId !== drawerGesture.pointerId) {
            return;
        }

        const gesture = drawerGesture;
        drawerGesture = null;

        if (!gesture.locked) {
            clearDrawerGestureVisuals();
            return;
        }

        const flingOpen =
            gesture.mode === "open" &&
            gesture.velocityX >= DRAWER_GESTURE_FLICK_PX_MS;
        const flingClose =
            gesture.mode === "close" &&
            gesture.velocityX <= -DRAWER_GESTURE_FLICK_PX_MS;

        let shouldOpen = gesture.progress >= DRAWER_GESTURE_COMMIT_RATIO;
        if (flingOpen) shouldOpen = true;
        if (flingClose) shouldOpen = false;

        clearDrawerGestureVisuals();
        setMobileMenuOpen(shouldOpen);
    }

    function closeMobileMenu({ restoreFocus = false } = {}) {
        if (!nav || !mobileTrigger) return;
        setMobileMenuOpen(false);
        if (restoreFocus) mobileTrigger.focus();
    }

    function setMobileMenuOpen(open) {
        if (!nav || !mobileTrigger) return;

        clearDrawerGestureVisuals();

        const shouldOpen = Boolean(open && mobileQuery.matches);
        mobileLayer.classList.toggle("is-mobile-menu-open", shouldOpen);
        mobileTrigger.setAttribute("aria-expanded", String(shouldOpen));
        mobilePanel.setAttribute("aria-hidden", String(!shouldOpen));
        mobilePanel.inert = !shouldOpen;
        document.documentElement.classList.toggle(
            "site-mobile-drawer-open",
            shouldOpen
        );

        if (shouldOpen) {
            document.querySelector(".site-socials-mobile[open]")?.removeAttribute("open");
            requestAnimationFrame(() => mobileClose.focus());
        }
    }

    mobileTrigger?.addEventListener("click", () => {
        setMobileMenuOpen(!mobileLayer.classList.contains("is-mobile-menu-open"));
    });

    mobileClose.addEventListener("click", () => {
        closeMobileMenu({ restoreFocus: true });
    });

    mobileBackdrop.addEventListener("click", () => {
        closeMobileMenu();
    });

    mobileEdgeGesture.addEventListener("pointerdown", event => {
        if (mobileLayer.classList.contains("is-mobile-menu-open")) return;
        beginDrawerGesture(event, "open");
    });

    mobilePanel.addEventListener("pointerdown", event => {
        if (!mobileLayer.classList.contains("is-mobile-menu-open")) return;
        beginDrawerGesture(event, "close");
    });

    window.addEventListener("pointermove", moveDrawerGesture, {
        passive: false
    });
    window.addEventListener("pointerup", endDrawerGesture);
    window.addEventListener("pointercancel", event => {
        if (drawerGesture?.pointerId === event.pointerId) {
            cancelDrawerGesture();
        }
    });

    document.addEventListener("click", event => {
        if (
            mobileLayer.classList.contains("is-mobile-menu-open") &&
            event.target instanceof Node &&
            !mobileLayer.contains(event.target)
        ) {
            closeMobileMenu();
        }
    });

    function mobileDrawerFocusable() {
        return [...mobilePanel.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter(element => !element.hasAttribute("hidden"));
    }

    document.addEventListener("keydown", event => {
        if (!mobileLayer.classList.contains("is-mobile-menu-open")) return;

        if (event.key === "Escape") {
            event.preventDefault();
            closeMobileMenu({ restoreFocus: true });
            return;
        }

        if (event.key !== "Tab") return;

        const focusable = mobileDrawerFocusable();
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        } else if (!mobilePanel.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
        }
    });

    mobileQuery.addEventListener?.("change", event => {
        if (!event.matches) closeMobileMenu();
        syncMobileLayer();
    });

    syncMobileSupport();
    syncMobileLayer();

    mount.addEventListener("click", event => {
        const anchor = event.target.closest("a[href]");
        if (anchor) rememberMobileTitleForNavigation(anchor);
    });

    navLinksContainer?.addEventListener("click", event => {
        if (mobileQuery.matches && event.target.closest(".site-nav-link")) {
            closeMobileMenu();
        }
    });

    mobileFooter?.addEventListener("click", event => {
        if (mobileQuery.matches && event.target.closest("a[href]")) {
            closeMobileMenu();
        }
    });

    initializeMobileTitle();

    function getNavSectionLinks() {
        return [...mount.querySelectorAll("[data-nav-section]")];
    }
    const donationsLink = mount.querySelector(
        '[data-nav-page="doacoes"]'
    );
    const artsLink = mount.querySelector(
        '[data-nav-page="artes"]'
    );
    const blogLink = mount.querySelector(
        '[data-nav-page="blog"]'
    );
    const gamesLink = mount.querySelector(
        '[data-nav-page="jogos"]'
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
                    (onDonations && item === donationsLink) ||
                    (onArts && item === artsLink) ||
                    (/\/blog(?:\/|$)/.test(path) && item === blogLink) ||
                    (onGames && item === gamesLink)
                        ? "page"
                        : "location"
                );
            } else {
                item.removeAttribute("aria-current");
            }
        });

        updateMobileTitle(link);

        if (link) {
            keepActiveLinkVisible(link, behavior);
        }
    }

    /*
     * navbar.json é carregado de forma assíncrona por content.js e pode
     * reordenar os links depois que a página atual já foi marcada como ativa.
     * Quando isso acontece, o scrollLeft calculado com a ordem fallback fica
     * desatualizado (especialmente em Artes/Blog/Jogos). Reposicionamos o item
     * ativo somente depois que a configuração editorial global terminou.
     */
    function realignActiveLinkAfterEditorialNavbar() {
        requestAnimationFrame(() => {
            syncMobileSupport();
            ensureMobileFallbackIcons();
            const activeLink = mount.querySelector(
                ".site-nav-link.is-active"
            );

            if (activeLink) {
                updateMobileTitle(activeLink);
                keepActiveLinkVisible(activeLink, "auto");
            } else {
                updateMobileTitle(null);
            }
        });
    }

    window.addEventListener(
        "kamyli:global-ui-ready",
        realignActiveLinkAfterEditorialNavbar,
        { once: true }
    );

    if (window.KAMYLI_GLOBAL_UI_READY) {
        realignActiveLinkAfterEditorialNavbar();
    }

    const HOME_NAV_TARGET_KEY = "kamyli:home-nav-target";

    let pageScrollFrame = null;
    let isProgrammaticScroll = false;
    let isSectionStabilizing = false;
    let previousRootScrollBehavior = "";
    let sectionStabilizationCleanup = null;
    let pendingRevealNavigationCleanup = null;

    const SECTION_STABILIZATION_MS = 9000;
    const SECTION_STABILIZATION_INTERVAL_MS = 250;
    const SECTION_POSITION_TOLERANCE_PX = 3;
    const SITE_REVEAL_FALLBACK_MS = 5500;

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

    function cancelSectionStabilization() {
        sectionStabilizationCleanup?.();
        sectionStabilizationCleanup = null;
        isSectionStabilizing = false;
    }

    function cancelPendingRevealNavigation() {
        pendingRevealNavigationCleanup?.();
        pendingRevealNavigationCleanup = null;
    }

    function cancelAutomatedSectionNavigation() {
        cancelPendingRevealNavigation();
        cancelPageScrollAnimation();
        cancelSectionStabilization();
    }

    function scrollInstantlyTo(targetTop) {
        const currentScrollBehavior =
            document.documentElement.style.scrollBehavior;

        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, targetTop);
        document.documentElement.style.scrollBehavior =
            currentScrollBehavior;
    }

    function startSectionStabilization(section, link) {
        cancelSectionStabilization();

        if (!section?.isConnected) return;

        let stopped = false;
        let correctionFrame = null;
        let intervalId = null;
        let timeoutId = null;
        let resizeObserver = null;

        const layoutRoot =
            document.querySelector("main") || document.body;

        function stop() {
            if (stopped) return;
            stopped = true;

            if (correctionFrame !== null) {
                cancelAnimationFrame(correctionFrame);
                correctionFrame = null;
            }

            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }

            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            resizeObserver?.disconnect();
            resizeObserver = null;

            window.removeEventListener("resize", scheduleCorrection);
            window.removeEventListener("load", scheduleCorrection);

            if (sectionStabilizationCleanup === stop) {
                sectionStabilizationCleanup = null;
            }

            isSectionStabilizing = false;
        }

        function correctPosition() {
            if (stopped || isProgrammaticScroll || !section.isConnected) {
                return;
            }

            const maxTop = Math.max(
                0,
                document.documentElement.scrollHeight - window.innerHeight
            );

            const expectedTop = Math.max(
                0,
                Math.min(getSectionTop(section), maxTop)
            );

            const difference = expectedTop - window.scrollY;

            if (Math.abs(difference) <= SECTION_POSITION_TOLERANCE_PX) {
                return;
            }

            scrollInstantlyTo(expectedTop);
            setActiveLink(link, "auto");
        }

        function scheduleCorrection() {
            if (stopped || correctionFrame !== null) return;

            correctionFrame = requestAnimationFrame(() => {
                correctionFrame = null;
                correctPosition();
            });
        }

        if (typeof ResizeObserver === "function" && layoutRoot) {
            resizeObserver = new ResizeObserver(scheduleCorrection);
            resizeObserver.observe(layoutRoot);
        }

        window.addEventListener("resize", scheduleCorrection, { passive: true });
        window.addEventListener("load", scheduleCorrection);

        intervalId = window.setInterval(
            scheduleCorrection,
            SECTION_STABILIZATION_INTERVAL_MS
        );

        timeoutId = window.setTimeout(
            stop,
            SECTION_STABILIZATION_MS
        );

        sectionStabilizationCleanup = stop;
        isSectionStabilizing = true;
        scheduleCorrection();
    }

    function runAfterSiteReveal(callback) {
        cancelPendingRevealNavigation();

        let finished = false;
        let timeoutId = null;

        function cleanup() {
            window.removeEventListener(
                "kamyli:site-revealed",
                finish
            );

            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            if (pendingRevealNavigationCleanup === cancel) {
                pendingRevealNavigationCleanup = null;
            }
        }

        function cancel() {
            if (finished) return;
            finished = true;
            cleanup();
        }

        function finish() {
            if (finished) return;
            finished = true;
            cleanup();

            requestAnimationFrame(() => {
                requestAnimationFrame(callback);
            });
        }

        pendingRevealNavigationCleanup = cancel;

        if (document.documentElement.classList.contains("site-ready")) {
            finish();
            return;
        }

        window.addEventListener(
            "kamyli:site-revealed",
            finish,
            { once: true }
        );

        timeoutId = window.setTimeout(
            finish,
            SITE_REVEAL_FALLBACK_MS
        );
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

        cancelSectionStabilization();
        setActiveLink(link);

        animatePageScroll(
            getSectionTop(section),
            () => {
                setActiveLink(link);

                if (updateHash) {
                    updateSectionHash(section.id);
                }

                startSectionStabilization(section, link);
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
            cancelAutomatedSectionNavigation,
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
            cancelAutomatedSectionNavigation();
        }
    });

    if (onArts) {
        setActiveLink(artsLink, "auto");
    } else if (onGames) {
        setActiveLink(gamesLink, "auto");
    } else if (/\/blog(?:\/|$)/.test(path)) {
        setActiveLink(blogLink, "auto");
    } else if (onDonations) {
        setActiveLink(donationsLink, "auto");

        /*
         * Ao sair de /doacoes/ para uma seção da Home, não usamos o hash
         * na navegação. Guardamos o destino e deixamos a Home animar
         * naturalmente depois de carregar.
         */
        getNavSectionLinks().forEach(link => {
            link.addEventListener("click", () => {
                const sectionId = link.dataset.navSection;
                if (!sectionId) return;

                try {
                    sessionStorage.setItem(
                        HOME_NAV_TARGET_KEY,
                        sectionId
                    );
                } catch {
                    // sessionStorage pode estar indisponível em modos restritos.
                }

                /*
                 * Não cancelamos mais o clique. A navegação normal permite
                 * que page-transitions.js aplique a mesma saída usada entre
                 * Home, Doações e Blog.
                 */
            });
        });
    } else if (onHome) {
        const sectionMap = new Map();

        getNavSectionLinks().forEach(link => {
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
            if (
                isProgrammaticScroll ||
                isSectionStabilizing ||
                !visibleSections.size
            ) {
                return;
            }

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
            const link = getNavSectionLinks().find(item =>
                item.dataset.navSection === section.id
            );

            if (link) setActiveLink(link);
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
            getNavSectionLinks().find(link =>
                link.dataset.navSection === targetSectionId
            ) ||
            getNavSectionLinks().find(link =>
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

                runAfterSiteReveal(() => {
                    scrollToSection(
                        initialSection,
                        initialLink,
                        true
                    );
                });
            }
        }

        getNavSectionLinks().forEach(link => {
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

        window.addEventListener("hashchange", () => {
            const sectionId =
                window.location.hash.replace(/^#/, "") || "inicio";

            const section = document.getElementById(sectionId);
            const link = getNavSectionLinks().find(item =>
                item.dataset.navSection === sectionId
            );

            if (!section || !link) return;

            scrollToSection(
                section,
                link,
                false
            );
        });
    }

})();
