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

function normalizePlatforms(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeAgendaArtwork(value, steamAppId) {
    if (!value || value.provider !== "steam-original") return null;
    if (!Number.isInteger(steamAppId) || steamAppId <= 0 || value.steamAppId !== steamAppId) return null;
    if (typeof value.url !== "string") return null;

    try {
        const url = new URL(value.url);
        const filename = url.pathname.split("/").pop();
        const legacy =
            url.protocol === "https:" &&
            url.hostname === "cdn.cloudflare.steamstatic.com" &&
            url.pathname.startsWith(`/steam/apps/${steamAppId}/`) &&
            ["library_600x900.jpg", "library_600x900_2x.jpg"].includes(filename);
        const modern =
            url.protocol === "https:" &&
            url.hostname === "shared.fastly.steamstatic.com" &&
            url.pathname.startsWith(`/store_item_assets/steam/apps/${steamAppId}/`) &&
            ["library_capsule.jpg", "library_capsule_2x.jpg", "library_600x900.jpg", "library_600x900_2x.jpg"].includes(filename);
        return legacy || modern ? { url: url.toString() } : null;
    } catch {
        return null;
    }
}

function legacyLiveFromDay(dia) {
    return {
        horario: typeof dia?.horario === "string" ? dia.horario : "",
        titulo: typeof dia?.titulo === "string" ? dia.titulo : "",
        descricao: typeof dia?.descricao === "string" ? dia.descricao : "",
        plataformas: normalizePlatforms(dia?.plataformas)
    };
}

function storedLivesFromDay(dia) {
    if (!Array.isArray(dia?.lives)) return [];

    return dia.lives
        .filter(live => live && typeof live === "object")
        .map(live => {
            const steamAppId = Number.isInteger(live.steamAppId) && live.steamAppId > 0
                ? live.steamAppId
                : null;
            return {
                horario: typeof live.horario === "string" ? live.horario : "",
                titulo: typeof live.titulo === "string" ? live.titulo : "",
                descricao: typeof live.descricao === "string" ? live.descricao : "",
                plataformas: normalizePlatforms(live.plataformas),
                steamAppId,
                artwork: normalizeAgendaArtwork(live.artwork, steamAppId)
            };
        });
}

function getDayLives(dia) {
    if (!dia?.temLive) return [];

    const legacy = legacyLiveFromDay(dia);
    const stored = storedLivesFromDay(dia);

    if (!stored.length) return [legacy];

    const legacyHasContent = Boolean(
        legacy.horario ||
        legacy.titulo ||
        legacy.descricao
    );

    if (!legacyHasContent) return stored;

    // Helpers antigos continuam editando somente os campos legados do dia.
    // Eles prevalecem na primeira live; metadados da capa permanecem apenas
    // enquanto o título não mudar, evitando associar uma imagem ao jogo errado.
    const first = { ...stored[0], ...legacy };
    if (legacy.titulo !== stored[0].titulo) {
        first.steamAppId = null;
        first.artwork = null;
    }
    return [first, ...stored.slice(1)];
}

function renderLiveContent(live, { showTime = false } = {}) {
    const plataformas = Array.isArray(live.plataformas)
        ? live.plataformas.filter(Boolean).join(" • ")
        : "";
    const artworkUrl = live.artwork?.url || "";

    return `
        <div class="agenda-live-layout${artworkUrl ? " has-artwork" : ""}">
            ${artworkUrl ? `
                <img
                    class="agenda-game-cover"
                    src="${escapeHtml(artworkUrl)}"
                    alt=""
                    width="600"
                    height="900"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                >
            ` : ""}
            <div class="agenda-live-copy">
                ${showTime ? `<strong class="agenda-live-time">${escapeHtml(live.horario || "A definir")}</strong>` : ""}
                <h3 class="agenda-title">${escapeHtml(live.titulo || "Live")}</h3>
                ${live.descricao ? `<p class="agenda-description">${escapeHtml(live.descricao)}</p>` : ""}
                ${plataformas ? `<div class="agenda-platforms">${escapeHtml(plataformas)}</div>` : ""}
            </div>
        </div>
    `;
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
        const lives = getDayLives(dia);
        const hasLive = lives.length > 0;
        const hasMultipleLives = lives.length > 1;
        const card = document.createElement("article");
        card.className = `agenda-card ${hasLive ? "has-live" : "no-live"}${hasMultipleLives ? " has-multiple-lives" : ""}`;

        const statusText = hasMultipleLives
            ? `● ${lives.length} LIVES`
            : (hasLive ? "● TEM LIVE" : "○ SEM LIVE");
        const headerTime = hasLive && !hasMultipleLives
            ? lives[0].horario || "A definir"
            : "";

        const liveContent = hasMultipleLives
            ? `<div class="agenda-live-list">${lives.map(live => `
                    <section class="agenda-live-item">
                        ${renderLiveContent(live, { showTime: true })}
                    </section>
                `).join("")}</div>`
            : (hasLive
                ? renderLiveContent(lives[0])
                : `
                    <h3 class="agenda-title agenda-title-off">Sem live</h3>
                    <p class="agenda-description">Sem transmissão programada.</p>
                `);

        card.innerHTML = `
            <div class="agenda-card-top">
                <div class="agenda-card-date">
                    <span class="agenda-day">${escapeHtml(dia.nome)}</span>

                    <div class="agenda-date-time">
                        <span class="agenda-date">${formatDate(dia.data)}</span>

                        ${
                            headerTime
                                ? `
                                    <span class="agenda-date-time-separator" aria-hidden="true">•</span>
                                    <strong class="agenda-time">${escapeHtml(headerTime)}</strong>
                                `
                                : ""
                        }
                    </div>
                </div>

                <div class="agenda-card-live">
                    <span class="agenda-status">${statusText}</span>
                </div>
            </div>

            <div class="agenda-card-content"${hasMultipleLives ? ` tabindex="0" aria-label="Lives de ${escapeHtml(dia.nome)}"` : ""}>
                ${liveContent}
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
