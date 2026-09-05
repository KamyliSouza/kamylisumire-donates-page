// Evita novas consultas ao Worker por 30 minutos no mesmo navegador.
const RANKING_CACHE_KEY = "kamyli-ranking-cache-v2";
const RANKING_CACHE_TTL_MS = 30 * 60 * 1000;

function readRankingCache({ allowExpired = false } = {}) {
    try {
        const raw = localStorage.getItem(RANKING_CACHE_KEY);
        if (!raw) return null;

        const cached = JSON.parse(raw);
        const age = Date.now() - Number(cached.savedAt || 0);

        if (!allowExpired && age > RANKING_CACHE_TTL_MS) {
            return null;
        }

        return cached.data || null;
    } catch (error) {
        console.warn("Cache local do ranking indisponível:", error);
        return null;
    }
}

function writeRankingCache(data) {
    try {
        localStorage.setItem(
            RANKING_CACHE_KEY,
            JSON.stringify({ savedAt: Date.now(), data })
        );
    } catch (error) {
        console.warn("Não foi possível salvar o cache do ranking:", error);
    }
}

/* =========================================
   CONFIGURAÇÃO DE PRIVACIDADE DO RANKING
========================================= */
const RANKING_PRIVACY = {
    replacement: "Anônimo",
    names: [
        "Wedrex"
        // "NomeDoUsuario",
        // "OutroUsuario"
    ]
};

function parseAmount(value) {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;

    let normalized = value
        .trim()
        .replace(/^R\$\s*/i, "")
        .replace(/\s/g, "");

    if (normalized.includes(",")) {
        normalized = normalized
            .replace(/\./g, "")
            .replace(",", ".");
    }

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
}

function getDisplayName(name) {
    if (!name) return RANKING_PRIVACY.replacement;

    const normalizedName = String(name).trim().toLowerCase();

    const isPrivate = RANKING_PRIVACY.names.some(
        privateName =>
            String(privateName).trim().toLowerCase() === normalizedName
    );

    return isPrivate ? RANKING_PRIVACY.replacement : name;
}

function formatAmount(value) {
    return parseAmount(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

const rankingList = document.getElementById("rankingList");
const tabButtons = document.querySelectorAll(".tab-btn");

let rankingData = {
    monthly: [],
    allTime: []
};

function renderRanking(items) {
    if (!rankingList) return;

    rankingList.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
        rankingList.innerHTML = `
            <li class="ranking-status">Nenhuma doação encontrada.</li>
        `;
        return;
    }

    const sortedItems = [...items]
        .sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount))
        .slice(0, 5);

    sortedItems.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "ranking-item";

        const rank = document.createElement("span");
        rank.className = "ranking-rank";
        rank.textContent = `${index + 1}º`;

        const name = document.createElement("span");
        name.className = "ranking-name";
        name.textContent = getDisplayName(item.name);

        const amount = document.createElement("span");
        amount.className = "ranking-amount";
        amount.textContent = `R$ ${formatAmount(item.amount)}`;

        li.append(rank, name, amount);
        rankingList.appendChild(li);
    });
}

async function fetchRankingData() {
    return window.KamyliAPI.getJSON("/");
}

async function loadRanking() {
    if (!rankingList) return;

    const freshCache = readRankingCache();

    if (freshCache) {
        rankingData = {
            monthly: Array.isArray(freshCache.monthly) ? freshCache.monthly : [],
            allTime: Array.isArray(freshCache.allTime) ? freshCache.allTime : []
        };
        renderRanking(rankingData.monthly);
        return;
    }

    rankingList.innerHTML = `
        <li class="ranking-status">Carregando ranking...</li>
    `;

    try {
        const data = await fetchRankingData();

        rankingData = {
            monthly: Array.isArray(data.monthly) ? data.monthly : [],
            allTime: Array.isArray(data.allTime) ? data.allTime : []
        };

        writeRankingCache(rankingData);
        renderRanking(rankingData.monthly);
    } catch (error) {
        console.error("Erro ao carregar ranking:", error);

        // Se a API estiver temporariamente indisponível, ainda tentamos
        // mostrar o último cache conhecido, mesmo que tenha expirado.
        const staleCache = readRankingCache({ allowExpired: true });

        if (staleCache) {
            rankingData = {
                monthly: Array.isArray(staleCache.monthly) ? staleCache.monthly : [],
                allTime: Array.isArray(staleCache.allTime) ? staleCache.allTime : []
            };
            renderRanking(rankingData.monthly);
            return;
        }

        rankingList.innerHTML = `
            <li class="ranking-status">
                Não foi possível carregar o ranking.
            </li>
        `;
    }
}

function setActiveTab(tab) {
    tabButtons.forEach(button => {
        const active = button.dataset.tab === tab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });

    renderRanking(
        tab === "allTime"
            ? rankingData.allTime
            : rankingData.monthly
    );
}

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        setActiveTab(button.dataset.tab);
    });
});

document.addEventListener("DOMContentLoaded", loadRanking);
