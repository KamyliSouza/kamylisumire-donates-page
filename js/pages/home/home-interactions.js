/*
 * Interações específicas da Home.
 *
 * - usa o mesmo coração SVG da navbar nos dois CTAs de apoio;
 * - habilita click + arrasta horizontal com mouse/caneta em Lives e Agenda;
 * - preserva touch nativo, teclado, setas, scroll-snap e clique normal.
 */
(() => {
    const HEART_PATH =
        "M12 21s-7.2-4.35-9.6-8.35C.65 9.95 1.5 6.4 4.6 5.1c2-.85 4.25-.3 5.65 1.35L12 8.5l1.75-2.05c1.4-1.65 3.65-2.2 5.65-1.35 3.1 1.3 3.95 4.85 2.2 7.55C19.2 16.65 12 21 12 21Z";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const DRAG_THRESHOLD = 5;
    const CLICK_SUPPRESSION_MS = 300;

    function createHeartIcon() {
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.classList.add("home-support-icon");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");

        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", HEART_PATH);
        svg.appendChild(path);

        return svg;
    }

    function decorateSupportButton(button) {
        if (!button) return;

        const labelText =
            String(button.textContent || "Apoiar").trim() || "Apoiar";

        const currentIcon =
            button.querySelector(":scope > .home-support-icon");
        const currentLabel =
            button.querySelector(":scope > .home-support-label");

        if (
            currentIcon &&
            currentLabel &&
            currentLabel.textContent === labelText
        ) {
            return;
        }

        const label = document.createElement("span");
        label.className = "home-support-label";
        label.textContent = labelText;

        button.replaceChildren(createHeartIcon(), label);
    }

    function keepSupportButtonDecorated(button) {
        if (!button) return;

        decorateSupportButton(button);

        const observer = new MutationObserver(() => {
            decorateSupportButton(button);
        });

        observer.observe(button, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

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

    keepSupportButtonDecorated(
        document.getElementById("heroSupportButton")
    );

    keepSupportButtonDecorated(
        document.getElementById("homeDonationButton")
    );

    enableClickDrag(document.getElementById("livesTrack"));
    enableClickDrag(document.getElementById("agendaGrid"));
})();
