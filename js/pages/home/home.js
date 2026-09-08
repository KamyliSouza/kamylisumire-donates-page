const agendaGrid = document.getElementById("agendaGrid");
const agendaAtualizacao = document.getElementById("agendaAtualizacao");
const agendaObservacao = document.getElementById("agendaObservacao");
const agendaPrev = document.getElementById("agendaPrev");
const agendaNext = document.getElementById("agendaNext");

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return escapeHtml(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit"
    }).format(new Date(year, month - 1, day));
}

const DEFAULT_CAROUSEL_STEP = 280;

const agendaMetrics = {
    step: DEFAULT_CAROUSEL_STEP,
    maxScrollLeft: 0
};

let agendaAnimationFrame = null;
let agendaMeasureFrame = null;
let agendaButtonFrame = null;
let agendaResizeObserver = null;

function applyCarouselButtonState() {
    if (!agendaGrid || !agendaPrev || !agendaNext) return;

    const currentLeft = agendaGrid.scrollLeft;
    const prevDisabled = currentLeft <= 2;
    const nextDisabled =
        currentLeft >= agendaMetrics.maxScrollLeft - 2;

    if (agendaPrev.disabled !== prevDisabled) {
        agendaPrev.disabled = prevDisabled;
    }

    if (agendaNext.disabled !== nextDisabled) {
        agendaNext.disabled = nextDisabled;
    }
}

function scheduleCarouselButtonUpdate() {
    if (agendaButtonFrame !== null) return;

    agendaButtonFrame = requestAnimationFrame(() => {
        agendaButtonFrame = null;
        applyCarouselButtonState();
    });
}

function measureCarousel() {
    if (!agendaGrid) return;

    /*
     * Todas as leituras geométricas ficam agrupadas neste único frame.
     * Durante a animação do scroll reutilizamos os valores em cache.
     */
    const card =
        agendaGrid.querySelector(".agenda-card");
    const styles =
        getComputedStyle(agendaGrid);
    const gap =
        Number.parseFloat(
            styles.columnGap || styles.gap || "0"
        ) || 0;
    const cardWidth =
        card
            ? card.getBoundingClientRect().width
            : 0;
    const clientWidth =
        agendaGrid.clientWidth;
    const scrollWidth =
        agendaGrid.scrollWidth;

    agendaMetrics.step =
        cardWidth > 0
            ? cardWidth + gap
            : DEFAULT_CAROUSEL_STEP;
    agendaMetrics.maxScrollLeft =
        Math.max(
            0,
            scrollWidth - clientWidth
        );

    applyCarouselButtonState();
}

function scheduleCarouselMeasure() {
    if (agendaMeasureFrame !== null) return;

    agendaMeasureFrame = requestAnimationFrame(() => {
        agendaMeasureFrame = null;
        measureCarousel();
    });
}

function easeInOutQuint(t) {
    return t < 0.5
        ? 16 * t * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function animateAgendaTo(targetLeft, duration = 520) {
    if (!agendaGrid) return;

    if (agendaAnimationFrame) {
        cancelAnimationFrame(agendaAnimationFrame);
        agendaAnimationFrame = null;
    }

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const destination = Math.max(
        0,
        Math.min(
            targetLeft,
            agendaMetrics.maxScrollLeft
        )
    );

    if (prefersReducedMotion) {
        agendaGrid.scrollLeft = destination;
        scheduleCarouselButtonUpdate();
        return;
    }

    const startLeft = agendaGrid.scrollLeft;
    const distance = destination - startLeft;

    if (Math.abs(distance) < 1) {
        scheduleCarouselButtonUpdate();
        return;
    }

    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutQuint(progress);

        /*
         * Só escrevemos scrollLeft neste loop. Leituras de largura ficam
         * fora da animação para evitar layout síncrono a cada frame.
         */
        agendaGrid.scrollLeft =
            startLeft + (distance * eased);

        if (progress < 1) {
            agendaAnimationFrame =
                requestAnimationFrame(step);
        } else {
            agendaGrid.scrollLeft = destination;
            agendaAnimationFrame = null;
            scheduleCarouselButtonUpdate();
        }
    }

    agendaAnimationFrame = requestAnimationFrame(step);
}

function scrollAgenda(direction) {
    if (!agendaGrid) return;

    const target =
        agendaGrid.scrollLeft +
        (agendaMetrics.step * direction);

    animateAgendaTo(target);
}

function setupAgendaCarousel() {
    if (!agendaGrid) return;

    scheduleCarouselMeasure();

    agendaPrev?.addEventListener(
        "click",
        () => scrollAgenda(-1)
    );
    agendaNext?.addEventListener(
        "click",
        () => scrollAgenda(1)
    );

    agendaGrid.addEventListener(
        "scroll",
        scheduleCarouselButtonUpdate,
        { passive: true }
    );

    const cancelProgrammaticAnimation = () => {
        if (!agendaAnimationFrame) return;

        cancelAnimationFrame(agendaAnimationFrame);
        agendaAnimationFrame = null;
        scheduleCarouselButtonUpdate();
    };

    agendaGrid.addEventListener(
        "pointerdown",
        cancelProgrammaticAnimation,
        { passive: true }
    );
    agendaGrid.addEventListener(
        "touchstart",
        cancelProgrammaticAnimation,
        { passive: true }
    );
    agendaGrid.addEventListener(
        "wheel",
        cancelProgrammaticAnimation,
        { passive: true }
    );

    if ("onscrollend" in window) {
        agendaGrid.addEventListener(
            "scrollend",
            scheduleCarouselButtonUpdate
        );
    }

    agendaGrid.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollAgenda(-1);
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollAgenda(1);
        }
    });

    if ("ResizeObserver" in window) {
        agendaResizeObserver =
            new ResizeObserver(
                scheduleCarouselMeasure
            );
        agendaResizeObserver.observe(
            agendaGrid
        );
    } else {
        window.addEventListener(
            "resize",
            scheduleCarouselMeasure,
            { passive: true }
        );
    }
}

function renderAgenda(data) {
    const dias = Array.isArray(data.dias) ? data.dias : [];

    if (!dias.length) {
        const emptyMessage =
            document.createElement("p");
        emptyMessage.className =
            "loading-message";
        emptyMessage.textContent =
            "Nenhum dia configurado na agenda.";

        agendaGrid.replaceChildren(
            emptyMessage
        );
        scheduleCarouselMeasure();
        return;
    }

    const fragment =
        document.createDocumentFragment();

    dias.forEach(dia => {
        const card = document.createElement("article");
        card.className = `agenda-card ${dia.temLive ? "has-live" : "no-live"}`;

        const plataformas = Array.isArray(dia.plataformas)
            ? dia.plataformas.filter(Boolean).join(" • ")
            : "";

        card.innerHTML = `
            <div class="agenda-card-top">
                <div class="agenda-card-date">
                    <span class="agenda-day">${escapeHtml(dia.nome)}</span>

                    <div class="agenda-date-time">
                        <span class="agenda-date">${formatDate(dia.data)}</span>

                        ${
                            dia.temLive
                                ? `
                                    <span class="agenda-date-time-separator" aria-hidden="true">•</span>
                                    <strong class="agenda-time">${escapeHtml(dia.horario || "A definir")}</strong>
                                `
                                : ""
                        }
                    </div>
                </div>

                <div class="agenda-card-live">
                    <span class="agenda-status">
                        ${dia.temLive ? "● TEM LIVE" : "○ SEM LIVE"}
                    </span>
                </div>
            </div>

            <div class="agenda-card-content">
                ${
                    dia.temLive
                        ? `
                            <h3 class="agenda-title">${escapeHtml(dia.titulo || "Live")}</h3>
                            ${dia.descricao ? `<p class="agenda-description">${escapeHtml(dia.descricao)}</p>` : ""}
                            ${plataformas ? `<div class="agenda-platforms">${escapeHtml(plataformas)}</div>` : ""}
                        `
                        : `
                            <h3 class="agenda-title agenda-title-off">Sem live</h3>
                            <p class="agenda-description">Sem transmissão programada.</p>
                        `
                }
            </div>
        `;

        fragment.appendChild(card);
    });

    agendaGrid.replaceChildren(fragment);

    if (data.ultimaAtualizacao) {
        agendaAtualizacao.textContent =
            `Atualizada em ${data.ultimaAtualizacao}`;
    }

    agendaObservacao.textContent = data.observacao || "";

    agendaGrid.scrollLeft = 0;
    scheduleCarouselMeasure();
}

async function carregarAgenda() {
    try {
        const agendaUrl = window.KAMYLI_SITE_PATH
            ? window.KAMYLI_SITE_PATH("/data/agenda.json")
            : "data/agenda.json";

        const response = await fetch(agendaUrl, { cache: "no-cache" });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        renderAgenda(data);
    } catch (error) {
        console.error("Erro ao carregar a agenda:", error);

        agendaGrid.innerHTML = `
            <p class="loading-message">
                Não foi possível carregar a agenda agora.
                Confira novamente em instantes.
            </p>
        `;

        scheduleCarouselMeasure();
    }
}

function signalAgendaReady() {
    window.KAMYLI_AGENDA_READY = true;

    window.dispatchEvent(
        new CustomEvent(
            "kamyli:loader-ready",
            {
                detail: {
                    key: "agenda"
                }
            }
        )
    );
}

setupAgendaCarousel();

carregarAgenda()
    .catch(error => {
        console.error(
            "Erro inesperado ao finalizar a agenda:",
            error
        );
    })
    .finally(signalAgendaReady);
