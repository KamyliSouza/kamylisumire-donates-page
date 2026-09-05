const API_URL =
    "https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev";

/* =========================================
   CONFIGURAÇÃO DE PRIVACIDADE DO RANKING
========================================= */

const RANKING_PRIVACY = {
    // Nome que será exibido no lugar do nome real
    replacement: "Anônimo",

    // Nomes que não devem aparecer publicamente no ranking
    // A comparação ignora maiúsculas/minúsculas.
    names: [
        "Wedrex"
        // "NomeDoUsuario",
        // "OutroUsuario"
    ]
};

/* =========================================
   FUNÇÕES AUXILIARES
========================================= */

// Converte valores como:
// 395,34
// R$ 395,34
// 395.34
// para número.
function parseAmount(value) {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value !== "string") {
        return 0;
    }

    let normalized = value
        .trim()
        .replace(/^R\$\s*/i, "")
        .replace(/\s/g, "");

    // Formato brasileiro: 1.234,56
    if (normalized.includes(",")) {
        normalized = normalized
            .replace(/\./g, "")
            .replace(",", ".");
    }

    const amount = Number(normalized);

    return Number.isFinite(amount) ? amount : 0;
}


// Retorna o nome que deve ser exibido no ranking.
function getDisplayName(name) {
    if (!name) {
        return RANKING_PRIVACY.replacement;
    }

    const normalizedName = String(name).trim().toLowerCase();

    const isPrivate = RANKING_PRIVACY.names.some(
        privateName =>
            String(privateName).trim().toLowerCase() === normalizedName
    );

    return isPrivate
        ? RANKING_PRIVACY.replacement
        : name;
}


// Formata o valor em reais.
function formatAmount(value) {
    return parseAmount(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


/* =========================================
   ELEMENTOS DO RANKING
========================================= */

const rankingList = document.getElementById("rankingList");
const tabButtons = document.querySelectorAll(".tab-btn");


/* =========================================
   RENDERIZAÇÃO
========================================= */

function renderRanking(items) {
    if (!rankingList) {
        return;
    }

    rankingList.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
        rankingList.innerHTML = `
            <li class="ranking-status">
                Nenhuma doação encontrada.
            </li>
        `;
        return;
    }

    // Ordena do maior valor para o menor
    const sortedItems = [...items]
        .sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount))
        .slice(0, 5);

    sortedItems.forEach((item, index) => {
        const position = index + 1;

        const li = document.createElement("li");

        let rankClass = "rank-other";

        if (position === 1) {
            rankClass = "rank-1";
        } else if (position === 2) {
            rankClass = "rank-2";
        } else if (position === 3) {
            rankClass = "rank-3";
        }

        li.className = `ranking-item ${rankClass}`;

        const rank = document.createElement("span");
        rank.className = "ranking-rank";
        rank.textContent = `${position}º`;

        const name = document.createElement("span");
        name.className = "ranking-name";

        // Aplica a proteção de privacidade somente na exibição.
        name.textContent = getDisplayName(item.name);

        const amount = document.createElement("span");
        amount.className = "ranking-amount";
        amount.textContent = `R$ ${formatAmount(item.amount)}`;

        li.appendChild(rank);
        li.appendChild(name);
        li.appendChild(amount);

        rankingList.appendChild(li);
    });
}


/* =========================================
   CARREGAMENTO DA API
========================================= */

let rankingData = {
    monthly: [],
    allTime: []
};

async function loadRanking() {
    if (!rankingList) {
        return;
    }

    rankingList.innerHTML = `
        <li class="ranking-status">
            Carregando ranking...
        </li>
    `;

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        console.log("Ranking recebido:", data);

        rankingData = {
            monthly: Array.isArray(data.monthly)
                ? data.monthly
                : [],

            allTime: Array.isArray(data.allTime)
                ? data.allTime
                : []
        };

        // Mostra o ranking mensal inicialmente
        renderRanking(rankingData.monthly);

    } catch (error) {
        console.error("Erro ao carregar ranking:", error);

        rankingList.innerHTML = `
            <li class="ranking-status">
                Não foi possível carregar o ranking.
            </li>
        `;
    }
}


/* =========================================
   ABAS
========================================= */

function setActiveTab(tab) {
    tabButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.tab === tab
        );
    });

    if (tab === "allTime") {
        renderRanking(rankingData.allTime);
    } else {
        renderRanking(rankingData.monthly);
    }
}


tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        const tab = button.dataset.tab;

        console.log("Aba selecionada:", tab);

        setActiveTab(tab);
    });
});


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadRanking();
});
