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

function getCarouselStep() {
    const card = agendaGrid?.querySelector(".agenda-card");
    if (!card) return 280;

    const styles = getComputedStyle(agendaGrid);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;

    return card.getBoundingClientRect().width + gap;
}

function updateCarouselButtons() {
    if (!agendaGrid || !agendaPrev || !agendaNext) return;

    const maxScrollLeft = Math.max(
        0,
        agendaGrid.scrollWidth - agendaGrid.clientWidth
    );

    agendaPrev.disabled = agendaGrid.scrollLeft <= 2;
    agendaNext.disabled = agendaGrid.scrollLeft >= maxScrollLeft - 2;
}

function scrollAgenda(direction) {
    if (!agendaGrid) return;

    agendaGrid.scrollBy({
        left: getCarouselStep() * direction,
        behavior: "smooth"
    });
}

function setupAgendaCarousel() {
    if (!agendaGrid) return;

    updateCarouselButtons();

    agendaPrev?.addEventListener("click", () => scrollAgenda(-1));
    agendaNext?.addEventListener("click", () => scrollAgenda(1));

    agendaGrid.addEventListener("scroll", () => {
        window.requestAnimationFrame(updateCarouselButtons);
    }, { passive: true });

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

    window.addEventListener("resize", updateCarouselButtons);
}

function renderAgenda(data) {
    const dias = Array.isArray(data.dias) ? data.dias : [];

    agendaGrid.innerHTML = "";

    if (!dias.length) {
        agendaGrid.innerHTML =
            '<p class="loading-message">Nenhum dia configurado na agenda.</p>';

        updateCarouselButtons();
        return;
    }

    dias.forEach(dia => {
        const card = document.createElement("article");
        card.className = `agenda-card ${dia.temLive ? "has-live" : "no-live"}`;

        const plataformas = Array.isArray(dia.plataformas)
            ? dia.plataformas.filter(Boolean).join(" • ")
            : "";

        card.innerHTML = `
            <span class="agenda-day">${escapeHtml(dia.nome)}</span>
            <span class="agenda-date">${formatDate(dia.data)}</span>

            <span class="agenda-status">
                ${dia.temLive ? "● TEM LIVE" : "○ SEM LIVE"}
            </span>

            ${
                dia.temLive
                    ? `
                        <strong class="agenda-time">${escapeHtml(dia.horario || "A definir")}</strong>
                        <h3 class="agenda-title">${escapeHtml(dia.titulo || "Live")}</h3>
                        ${dia.descricao ? `<p class="agenda-description">${escapeHtml(dia.descricao)}</p>` : ""}
                        ${plataformas ? `<div class="agenda-platforms">${escapeHtml(plataformas)}</div>` : ""}
                    `
                    : `<p class="agenda-description">Sem transmissão programada.</p>`
            }
        `;

        agendaGrid.appendChild(card);
    });

    if (data.ultimaAtualizacao) {
        agendaAtualizacao.textContent =
            `Atualizada em ${data.ultimaAtualizacao}`;
    }

    agendaObservacao.textContent = data.observacao || "";

    agendaGrid.scrollLeft = 0;
    window.requestAnimationFrame(updateCarouselButtons);
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

        updateCarouselButtons();
    }
}

setupAgendaCarousel();
carregarAgenda();
