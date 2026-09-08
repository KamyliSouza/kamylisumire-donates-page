(() => {
    "use strict";

    const root = document.documentElement;

    function reducedMotion() {
        try {
            return (
                window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches ||
                root.dataset.performance === "reduced"
            );
        } catch {
            return root.dataset.performance === "reduced";
        }
    }

    function create(options = {}) {
        const track = options.track;
        const prev = options.prev || null;
        const next = options.next || null;
        const itemSelector = options.itemSelector || "";
        const defaultStep = Number(options.defaultStep) || 300;

        if (!track || !itemSelector) {
            return null;
        }

        const metrics = {
            step: defaultStep,
            maxScrollLeft: 0
        };

        let measureFrame = null;
        let buttonFrame = null;
        let resizeObserver = null;

        function updateButtons() {
            const max = Math.max(
                0,
                track.scrollWidth - track.clientWidth
            );

            metrics.maxScrollLeft = max;

            if (prev) {
                const disabled = track.scrollLeft <= 2;
                prev.disabled = disabled;
                prev.setAttribute(
                    "aria-disabled",
                    String(disabled)
                );
            }

            if (next) {
                const disabled =
                    track.scrollLeft >= max - 2;

                next.disabled = disabled;
                next.setAttribute(
                    "aria-disabled",
                    String(disabled)
                );
            }
        }

        function scheduleButtonUpdate() {
            if (buttonFrame !== null) {
                return;
            }

            buttonFrame = requestAnimationFrame(() => {
                buttonFrame = null;
                updateButtons();
            });
        }

        function measure() {
            measureFrame = null;

            const item = track.querySelector(itemSelector);
            const styles = getComputedStyle(track);
            const gap =
                Number.parseFloat(
                    styles.columnGap || styles.gap || "0"
                ) || 0;
            const width = item
                ? item.getBoundingClientRect().width
                : 0;

            metrics.step =
                width > 0
                    ? width + gap
                    : defaultStep;

            updateButtons();
        }

        function refresh() {
            if (measureFrame !== null) {
                cancelAnimationFrame(measureFrame);
            }

            measureFrame = requestAnimationFrame(measure);
        }

        function scrollByStep(direction) {
            const normalizedDirection =
                direction < 0 ? -1 : 1;

            const destination = Math.max(
                0,
                Math.min(
                    track.scrollLeft +
                        metrics.step * normalizedDirection,
                    metrics.maxScrollLeft
                )
            );

            track.scrollTo({
                left: destination,
                behavior: reducedMotion() ? "auto" : "smooth"
            });

            /*
             * O evento scroll atualiza as setas durante o movimento.
             * O frame abaixo cobre navegadores que entregam poucos eventos
             * durante um smooth scroll curto.
             */
            requestAnimationFrame(scheduleButtonUpdate);
        }

        function onKeyDown(event) {
            if (
                event.key !== "ArrowLeft" &&
                event.key !== "ArrowRight"
            ) {
                return;
            }

            event.preventDefault();
            scrollByStep(
                event.key === "ArrowLeft" ? -1 : 1
            );
        }

        prev?.addEventListener(
            "click",
            () => scrollByStep(-1)
        );

        next?.addEventListener(
            "click",
            () => scrollByStep(1)
        );

        track.addEventListener(
            "scroll",
            scheduleButtonUpdate,
            { passive: true }
        );

        track.addEventListener(
            "keydown",
            onKeyDown
        );

        if ("scrollend" in window) {
            track.addEventListener(
                "scrollend",
                scheduleButtonUpdate
            );
        }

        if ("ResizeObserver" in window) {
            resizeObserver = new ResizeObserver(refresh);
            resizeObserver.observe(track);
        } else {
            window.addEventListener(
                "resize",
                refresh,
                { passive: true }
            );
        }

        refresh();

        return Object.freeze({
            refresh,
            scrollByStep,
            updateButtons
        });
    }

    window.KamyliCarousel = Object.freeze({
        create
    });
})();
