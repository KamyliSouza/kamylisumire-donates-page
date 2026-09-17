/*
 * Faixas horizontais compartilhadas.
 *
 * - click + arrasta com mouse/caneta, seguindo Lives/Agenda da Home;
 * - touch permanece nativo;
 * - impede clique acidental depois de um arraste;
 * - mantém o item selecionado visível sem deslocar a página inteira;
 * - mostra setas laterais apenas quando há conteúdo oculto na direção.
 */
(() => {
    "use strict";

    const DRAG_THRESHOLD = 5;
    const CLICK_SUPPRESSION_MS = 300;
    const SAFE_INLINE_INSET = 6;
    const OVERFLOW_TOLERANCE = 2;
    const SCROLL_STEP_RATIO = 0.72;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function enableOverflowControls(track) {
        if (!track || track.dataset.overflowControls === "ready") return;

        const shell = track.closest("[data-horizontal-scroll-shell]");
        const previous = shell?.querySelector("[data-horizontal-scroll-prev]");
        const next = shell?.querySelector("[data-horizontal-scroll-next]");
        if (!shell || !previous || !next) return;

        track.dataset.overflowControls = "ready";
        let updateFrame = null;

        function syncDirectionState() {
            updateFrame = null;

            const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
            const hasOverflow = maxScroll > OVERFLOW_TOLERANCE;

            shell.classList.toggle("has-horizontal-overflow", hasOverflow);
            previous.hidden = !hasOverflow;
            next.hidden = !hasOverflow;

            if (!hasOverflow) {
                previous.disabled = true;
                next.disabled = true;
                return;
            }

            previous.disabled = track.scrollLeft <= OVERFLOW_TOLERANCE;
            next.disabled = track.scrollLeft >= maxScroll - OVERFLOW_TOLERANCE;
        }

        function scheduleDirectionSync() {
            if (updateFrame !== null) cancelAnimationFrame(updateFrame);
            updateFrame = requestAnimationFrame(syncDirectionState);
        }

        function scrollTrack(direction) {
            const amount = Math.max(160, track.clientWidth * SCROLL_STEP_RATIO);
            const behavior = reducedMotion.matches ? "auto" : "smooth";

            if (typeof track.scrollBy === "function") {
                track.scrollBy({ left: amount * direction, behavior });
            } else {
                track.scrollLeft += amount * direction;
            }
        }

        previous.addEventListener("click", () => scrollTrack(-1));
        next.addEventListener("click", () => scrollTrack(1));
        track.addEventListener("scroll", scheduleDirectionSync, { passive: true });

        if (typeof ResizeObserver === "function") {
            const resizeObserver = new ResizeObserver(scheduleDirectionSync);
            resizeObserver.observe(track);
            resizeObserver.observe(shell);
        } else {
            window.addEventListener("resize", scheduleDirectionSync, { passive: true });
        }

        if (typeof MutationObserver === "function") {
            const mutationObserver = new MutationObserver(scheduleDirectionSync);
            mutationObserver.observe(track, { childList: true, subtree: true });
        }

        scheduleDirectionSync();
    }

    function enableClickDrag(track) {
        if (!track || track.dataset.clickDrag === "ready") return;

        track.dataset.clickDrag = "ready";
        track.classList.add("horizontal-click-drag");
        enableOverflowControls(track);

        let pointerId = null;
        let startX = 0;
        let startScrollLeft = 0;
        let dragging = false;
        let suppressClickUntil = 0;

        function finishDrag() {
            if (dragging) {
                suppressClickUntil = performance.now() + CLICK_SUPPRESSION_MS;
            }

            pointerId = null;
            dragging = false;
            track.classList.remove("is-click-dragging");
        }

        track.addEventListener("pointerdown", event => {
            if (
                event.pointerType === "touch" ||
                event.button !== 0 ||
                event.isPrimary === false
            ) {
                return;
            }

            pointerId = event.pointerId;
            startX = event.clientX;
            startScrollLeft = track.scrollLeft;
            dragging = false;
        });

        window.addEventListener(
            "pointermove",
            event => {
                if (pointerId === null || event.pointerId !== pointerId) return;

                const deltaX = event.clientX - startX;
                if (!dragging && Math.abs(deltaX) < DRAG_THRESHOLD) return;

                if (!dragging) {
                    dragging = true;
                    track.classList.add("is-click-dragging");
                }

                event.preventDefault();
                track.scrollLeft = startScrollLeft - deltaX;
            },
            { passive: false }
        );

        window.addEventListener("pointerup", event => {
            if (pointerId !== null && event.pointerId === pointerId) finishDrag();
        });

        window.addEventListener("pointercancel", event => {
            if (pointerId !== null && event.pointerId === pointerId) finishDrag();
        });

        window.addEventListener("blur", finishDrag);

        track.addEventListener(
            "click",
            event => {
                if (performance.now() >= suppressClickUntil) return;
                event.preventDefault();
                event.stopPropagation();
            },
            true
        );

        track.addEventListener("dragstart", event => {
            event.preventDefault();
        });
    }

    function revealItem(track, item, { behavior = "smooth" } = {}) {
        if (!track || !item) return;

        const trackRect = track.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const viewportLeft = track.scrollLeft + SAFE_INLINE_INSET;
        const viewportRight = track.scrollLeft + track.clientWidth - SAFE_INLINE_INSET;
        const itemLeft = track.scrollLeft + itemRect.left - trackRect.left;
        const itemRight = track.scrollLeft + itemRect.right - trackRect.left;
        let target = track.scrollLeft;

        if (itemLeft < viewportLeft) {
            target = itemLeft - SAFE_INLINE_INSET;
        } else if (itemRight > viewportRight) {
            target = itemRight - track.clientWidth + SAFE_INLINE_INSET;
        }

        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        target = Math.max(0, Math.min(target, maxScroll));
        if (Math.abs(target - track.scrollLeft) < 1) return;

        if (typeof track.scrollTo === "function") {
            track.scrollTo({ left: target, behavior });
        } else {
            track.scrollLeft = target;
        }
    }

    window.KamyliHorizontalScroll = Object.freeze({
        enableClickDrag,
        enableOverflowControls,
        revealItem
    });
})();
