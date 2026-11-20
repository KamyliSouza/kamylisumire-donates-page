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

/*
 * Destaque do dia atual (V48.3.70). "Hoje" é a data do aparelho de quem acessa,
 * não a do servidor, e é reavaliado na virada do dia e ao voltar para a aba.
 * Só marca o card (classe is-today, aria-current="date" e "(hoje)" para leitores
 * de tela); os destaques de dias com live continuam independentes.
 */
let agendaTodayTimer = null;

function localIsoDate(date = new Date()) {
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function markAgendaToday() {
    if (!agendaGrid) return;

    const today = localIsoDate();

    agendaGrid.querySelectorAll(".agenda-card[data-date]").forEach(card => {
        const isToday = card.dataset.date === today;
        card.classList.toggle("is-today", isToday);

        if (isToday) card.setAttribute("aria-current", "date");
        else card.removeAttribute("aria-current");

        const dateElement = card.querySelector(".agenda-date");
        const spoken = dateElement?.querySelector(".agenda-today-sr");

        if (isToday && dateElement && !spoken) {
            const label = document.createElement("span");
            label.className = "sr-only agenda-today-sr";
            label.textContent = " (hoje)";
            dateElement.append(label);
        } else if (!isToday && spoken) {
            spoken.remove();
        }
    });

    window.clearTimeout(agendaTodayTimer);
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    agendaTodayTimer = window.setTimeout(markAgendaToday, Math.max(1000, nextMidnight - now));
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) markAgendaToday();
});

// Leva o carrossel (apenas na horizontal, sem mover a página) até o card de hoje quando
// ele não está totalmente visível. Vale só para a abertura da página: enquanto a pessoa
// não interagir com o carrossel (e por no máximo alguns segundos), o posicionamento é
// refeito se o layout for recalculado (o navegador zera o scroll quando o loader/reveal
// esconde e mostra a página). Não roda na virada do dia.
let agendaTodayPending = false;
let agendaTodayObserver = null;
let agendaTodayTimeout = 0;
let agendaTodayInterval = 0;

function stopAgendaTodayScroll() {
    agendaTodayPending = false;
    clearTimeout(agendaTodayTimeout);
    clearInterval(agendaTodayInterval);
    agendaTodayObserver?.disconnect();
    agendaTodayObserver = null;
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach(type => {
        agendaGrid?.removeEventListener(type, stopAgendaTodayScroll);
    });
}

function applyAgendaTodayScroll() {
    const card = agendaGrid?.querySelector(".agenda-card.is-today");
    if (!card || agendaGrid.clientWidth === 0) return;

    const gridRect = agendaGrid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (cardRect.left >= gridRect.left && cardRect.right <= gridRect.right) return;

    const gutter = parseFloat(getComputedStyle(agendaGrid).scrollPaddingInlineStart) || 0;
    agendaGrid.scrollLeft += cardRect.left - gridRect.left - gutter;
}

function scrollAgendaToToday() {
    stopAgendaTodayScroll();
    if (!agendaGrid?.querySelector(".agenda-card.is-today")) return;

    agendaTodayPending = true;
    applyAgendaTodayScroll();

    ["pointerdown", "wheel", "touchstart", "keydown"].forEach(type => {
        agendaGrid.addEventListener(type, stopAgendaTodayScroll, { passive: true, once: true });
    });
    if (typeof ResizeObserver === "function") {
        agendaTodayObserver = new ResizeObserver(() => {
            if (agendaTodayPending) applyAgendaTodayScroll();
        });
        agendaTodayObserver.observe(agendaGrid);
    }
    // Rede de segurança: o navegador pode zerar o scroll sem avisar quando o reveal termina.
    agendaTodayInterval = setInterval(() => {
        if (agendaTodayPending) applyAgendaTodayScroll();
    }, 120);
    agendaTodayTimeout = setTimeout(stopAgendaTodayScroll, 3500);
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

if (agendaGrid) {
    agendaGrid.addEventListener("error", event => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement) || !image.classList.contains("agenda-game-icon")) return;
        const layout = image.closest(".agenda-live-layout");
        image.remove();
        layout?.classList.remove("has-icon");
        scheduleAgendaOverflowCheck();
    }, true);
}

let agendaOverflowFrame = 0;

function updateAgendaScrollableRegions() {
    if (!agendaGrid) return;

    agendaGrid.querySelectorAll(".agenda-card-content").forEach(content => {
        const isScrollable = content.scrollHeight > content.clientHeight + 1;

        if (isScrollable) {
            content.tabIndex = 0;
            content.setAttribute(
                "aria-label",
                content.dataset.scrollLabel || "Conteúdo rolável da agenda"
            );
            return;
        }

        content.removeAttribute("tabindex");
        content.removeAttribute("aria-label");
    });
}

function scheduleAgendaOverflowCheck() {
    if (!agendaGrid) return;
    cancelAnimationFrame(agendaOverflowFrame);
    agendaOverflowFrame = requestAnimationFrame(() => {
        agendaOverflowFrame = 0;
        updateAgendaScrollableRegions();
    });
}

window.addEventListener("resize", scheduleAgendaOverflowCheck, { passive: true });
document.fonts?.ready?.then(scheduleAgendaOverflowCheck).catch(() => {});

function normalizePlatforms(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeAgendaIcon(value, steamAppId) {
    if (!value || value.provider !== "steam-original") return null;
    if (!Number.isInteger(steamAppId) || steamAppId <= 0 || value.steamAppId !== steamAppId) return null;
    if (typeof value.url !== "string") return null;

    try {
        const url = new URL(value.url);
        const filename = url.pathname.split("/").pop() || "";
        const valid =
            url.protocol === "https:" &&
            url.hostname === "cdn.cloudflare.steamstatic.com" &&
            url.pathname.startsWith(`/steamcommunity/public/images/apps/${steamAppId}/`) &&
            /^[a-f0-9]{40}\.jpg$/i.test(filename);
        return valid ? { url: url.toString() } : null;
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
                icon: normalizeAgendaIcon(live.icon, steamAppId)
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
    // Eles prevalecem na primeira live; metadados do ícone permanecem apenas
    // enquanto o título não mudar, evitando associar uma imagem ao jogo errado.
    const first = { ...stored[0], ...legacy };
    if (legacy.titulo !== stored[0].titulo) {
        first.steamAppId = null;
        first.icon = null;
    }
    return [first, ...stored.slice(1)];
}

function renderLiveContent(live, { showTime = false } = {}) {
    const plataformas = Array.isArray(live.plataformas)
        ? live.plataformas.filter(Boolean).join(" • ")
        : "";
    const iconUrl = live.icon?.url || "";

    return `
        <div class="agenda-live-layout${iconUrl ? " has-icon" : ""}">
            ${iconUrl ? `
                <img
                    class="agenda-game-icon"
                    src="${escapeHtml(iconUrl)}"
                    alt=""
                    width="48"
                    height="48"
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
        if (typeof dia.data === "string") card.dataset.date = dia.data;

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

            <div class="agenda-card-content" data-scroll-label="Lives de ${escapeHtml(dia.nome)}">
                ${liveContent}
            </div>
        `;

        fragment.appendChild(card);
    });

    agendaGrid.replaceChildren(fragment);
    markAgendaToday();

    if (data.ultimaAtualizacao) {
        agendaAtualizacao.textContent =
            `Atualizada em ${data.ultimaAtualizacao}`;
    }

    agendaObservacao.textContent = data.observacao || "";

    agendaGrid.scrollLeft = 0;
    agendaCarousel?.refresh();
    scrollAgendaToToday();
    scheduleAgendaOverflowCheck();
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
