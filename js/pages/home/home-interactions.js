/*
 * Interações específicas da Home.
 *
 * - habilita click + arrasta horizontal com mouse/caneta em Lives e Agenda;
 * - preserva touch nativo, teclado, setas, scroll-snap e clique normal.
 */
(() => {
    const DRAG_THRESHOLD = 5;
    const CLICK_SUPPRESSION_MS = 300;

    function enableClickDrag(track) {
        if (!track || track.dataset.clickDrag === "ready") return;

        track.dataset.clickDrag = "ready";
        track.classList.add("carousel-click-drag");

        let pointerId = null;
        let startX = 0;
        let startScrollLeft = 0;
        let dragging = false;
        let suppressClickUntil = 0;

        function finishDrag() {
            if (dragging) {
                suppressClickUntil =
                    performance.now() + CLICK_SUPPRESSION_MS;
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
                if (
                    pointerId === null ||
                    event.pointerId !== pointerId
                ) {
                    return;
                }

                const deltaX = event.clientX - startX;

                if (
                    !dragging &&
                    Math.abs(deltaX) < DRAG_THRESHOLD
                ) {
                    return;
                }

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
            if (
                pointerId !== null &&
                event.pointerId === pointerId
            ) {
                finishDrag();
            }
        });

        window.addEventListener("pointercancel", event => {
            if (
                pointerId !== null &&
                event.pointerId === pointerId
            ) {
                finishDrag();
            }
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

    enableClickDrag(document.getElementById("livesTrack"));
    enableClickDrag(document.getElementById("agendaGrid"));
})();
