```js
const WORKER_URL =
    'https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev/';

let rankingData = {
    monthly: [],
    allTime: []
};

let currentTab = 'monthly';

const listElement = document.getElementById('rankingList');
const tabButtons = document.querySelectorAll('.tab-btn');

function getRankStyle(index) {
    const position = index + 1;

    if (position === 1) {
        return {
            symbol: '🥇',
            className: 'rank-1'
        };
    }

    if (position === 2) {
        return {
            symbol: '🥈',
            className: 'rank-2'
        };
    }

    if (position === 3) {
        return {
            symbol: '🥉',
            className: 'rank-3'
        };
    }

    return {
        symbol: `#${position}`,
        className: 'rank-other'
    };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderRanking() {
    if (!listElement) {
        console.error('[Ranking] #rankingList não encontrado.');
        return;
    }

    let dataToRender = Array.isArray(rankingData[currentTab])
        ? rankingData[currentTab]
        : [];

    // Garante que o site nunca mostre mais de 5.
    dataToRender = dataToRender
        .slice()
        .sort((a, b) => {
            return Number(b.amount || 0) - Number(a.amount || 0);
        })
        .slice(0, 5);

    listElement.innerHTML = '';

    if (dataToRender.length === 0) {
        listElement.innerHTML = `
            <div class="ranking-status">
                Nenhuma doação registrada ainda. 🥺
            </div>
        `;
        return;
    }

    dataToRender.forEach((donator, index) => {
        const rankInfo = getRankStyle(index);

        const item = document.createElement('li');

        item.className = `ranking-item ${rankInfo.className}`;

        const name = donator.name || 'Anônimo';

        const amount = Number(donator.amount || 0).toLocaleString(
            'pt-BR',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

        item.innerHTML = `
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

        listElement.appendChild(item);
    });
}

tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
        tabButtons.forEach((btn) => {
            btn.classList.remove('active');
        });

        button.classList.add('active');

        currentTab = button.dataset.tab;

        console.log('[Ranking] Aba selecionada:', currentTab);

        renderRanking();
    });
});

async function fetchRankingData() {
    if (!listElement) {
        console.error('[Ranking] Elemento #rankingList não existe.');
        return;
    }

    console.log('[Ranking] Buscando dados:', WORKER_URL);

    listElement.innerHTML = `
        <div class="ranking-status">
            Carregando dados...
        </div>
    `;

    try {
        const response = await fetch(WORKER_URL, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                Accept: 'application/json'
            }
        });

        console.log('[Ranking] HTTP:', response.status);

        if (!response.ok) {
            throw new Error(
                `API retornou HTTP ${response.status}`
            );
        }

        const contentType =
            response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            throw new Error(
                'A API não retornou JSON.'
            );
        }

        const data = await response.json();

        console.log('[Ranking] Dados recebidos:', data);

        rankingData = {
            monthly: Array.isArray(data.monthly)
                ? data.monthly
                : [],

            allTime: Array.isArray(data.allTime)
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
        console.error('[Ranking] Erro:', error);

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

// O ranking.js é carregado no final do body,
// então o DOM já está disponível.
fetchRankingData();
```
