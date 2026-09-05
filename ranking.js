```js
// URL da API
const WORKER_URL =
    'https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev/';

let rankingData = {
    monthly: [],
    allTime: []
};

let currentTab = 'monthly';

const listElement =
    document.getElementById('rankingList');

const tabButtons =
    document.querySelectorAll('.tab-btn');

// ---------------------------------------------------------
// Estilo da posição
// ---------------------------------------------------------

function getRankStyle(index) {
    const pos = index + 1;

    if (pos === 1) {
        return {
            symbol: '🥇',
            class: 'rank-1'
        };
    }

    if (pos === 2) {
        return {
            symbol: '🥈',
            class: 'rank-2'
        };
    }

    if (pos === 3) {
        return {
            symbol: '🥉',
            class: 'rank-3'
        };
    }

    return {
        symbol: `#${pos}`,
        class: 'rank-other'
    };
}

// ---------------------------------------------------------
// Renderiza o ranking
// ---------------------------------------------------------

function renderRanking() {
    if (!listElement) {
        console.error(
            '[Ranking] #rankingList não encontrado.'
        );
        return;
    }

    listElement.innerHTML = '';

    let dataToRender =
        Array.isArray(rankingData[currentTab])
            ? rankingData[currentTab]
            : [];

    // Segurança:
    // o site nunca mostra mais de 5 posições,
    // mesmo que a API envie mais.
    dataToRender = dataToRender
        .slice()
        .sort(
            (a, b) =>
                Number(b.amount || 0) -
                Number(a.amount || 0)
        )
        .slice(0, 5);

    if (dataToRender.length === 0) {
        listElement.innerHTML = `
            <div class="ranking-status">
                Nenhuma doação registrada ainda. 🥺
            </div>
        `;

        return;
    }

    dataToRender.forEach(
        (donator, index) => {
            const rankInfo =
                getRankStyle(index);

            const li =
                document.createElement('li');

            li.className =
                `ranking-item ${rankInfo.class}`;

            const name =
                donator.name ||
                'Anônimo';

            const amount =
                Number(donator.amount || 0)
                    .toLocaleString(
                        'pt-BR',
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );

            li.innerHTML = `
                <span class="ranking-rank">
                    ${rankInfo.symbol}
                </span>

                <span class="ranking-name">
                    ${escapeHtml(name)}
                </span>

                <span class="ranking-amount">
                    R$ ${amount}
                </span>
            `;

            listElement.appendChild(li);
        }
    );
}

// ---------------------------------------------------------
// Evita HTML vindo do nome do doador
// ---------------------------------------------------------

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// ---------------------------------------------------------
// Abas
// ---------------------------------------------------------

tabButtons.forEach(button => {
    button.addEventListener(
        'click',
        () => {
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            button.classList.add('active');

            currentTab =
                button.dataset.tab;

            console.log(
                '[Ranking] Aba selecionada:',
                currentTab
            );

            renderRanking();
        }
    );
});

// ---------------------------------------------------------
// Busca API
// ---------------------------------------------------------

async function fetchRankingData() {
    if (!listElement) {
        console.error(
            '[Ranking] Elemento #rankingList não existe.'
        );

        return;
    }

    console.log(
        '[Ranking] Buscando dados:',
        WORKER_URL
    );

    try {
        listElement.innerHTML = `
            <div class="ranking-status">
                Carregando dados...
            </div>
        `;

        const response =
            await fetch(
                WORKER_URL,
                {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Accept':
                            'application/json'
                    }
                }
            );

        console.log(
            '[Ranking] HTTP:',
            response.status
        );

        if (!response.ok) {
            throw new Error(
                `API retornou HTTP ${response.status}`
            );
        }

        const contentType =
            response.headers.get(
                'content-type'
            ) || '';

        if (
            !contentType.includes(
                'application/json'
            )
        ) {
            throw new Error(
                'A API não retornou JSON.'
            );
        }

        const data =
            await response.json();

        console.log(
            '[Ranking] Dados recebidos:',
            data
        );

        // Validação
        rankingData = {
            monthly:
                Array.isArray(data.monthly)
                    ? data.monthly
                    : [],

            allTime:
                Array.isArray(data.allTime)
                    ? data.allTime
                    : []
        };

        console.log(
            '[Ranking] Mensal:',
            rankingData.monthly
        );

        console.log(
            '[Ranking] Global:',
            rankingData.allTime
        );

        renderRanking();

    } catch (error) {
        console.error(
            '[Ranking] Erro:',
            error
        );

        listElement.innerHTML = `
            <div class="ranking-status">
                Erro ao carregar o ranking.
                <br>
                <small>
                    Tente atualizar a página.
                </small>
            </div>
        `;
    }
}

// ---------------------------------------------------------
// IMPORTANTE
//
// ranking.js é carregado no final do body,
// então o DOM já existe.
// Não precisamos esperar DOMContentLoaded.
// ---------------------------------------------------------

fetchRankingData();
```
