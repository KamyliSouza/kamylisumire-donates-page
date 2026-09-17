/*
 * Faixas horizontais compartilhadas.
 *
 * - click + arrasta com mouse/caneta, seguindo Lives/Agenda da Home;
 * - touch permanece nativo;
 * - impede clique acidental depois de um arraste;
 * - mantém o item selecionado visível sem deslocar a página inteira.
 */
(() => {
    "use strict";

    const DRAG_THRESHOLD = 5;
    const CLICK_SUPPRESSION_MS = 300;
    const SAFE_INLINE_INSET = 6;

    function enableClickDrag(track) {
        if (!track || track.dataset.clickDrag === "ready") return;

        track.dataset.clickDrag = "ready";
        track.classList.add("horizontal-click-drag");

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
        revealItem
    });
})();
