const agendaGrid = document.getElementById("agendaGrid");
const agendaAtualizacao = document.getElementById("agendaAtualizacao");
const agendaObservacao = document.getElementById("agendaObservacao");
const agendaPrev = document.getElementById("agendaPrev");
const agendaNext = document.getElementById("agendaNext");

const escapeHtml = window.KamyliSanitize?.escapeHtml;

if (typeof escapeHtml !== "function") {
    throw new Error("KamyliSanitize.escapeHtml não foi carregado.");
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

let agendaCarousel = null;

function setupAgendaCarousel() {
    if (!agendaGrid) return;

    const carousel = window.KamyliCarousel;

    if (!carousel?.create) {
        console.error(
            "KamyliCarousel não foi carregado antes da Agenda."
        );
        return;
    }

    agendaCarousel = carousel.create({
        track: agendaGrid,
        prev: agendaPrev,
        next: agendaNext,
        itemSelector: ".agenda-card",
        defaultStep: DEFAULT_CAROUSEL_STEP
    });
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
        agendaCarousel?.refresh();
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
    agendaCarousel?.refresh();
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

        agendaCarousel?.refresh();
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
