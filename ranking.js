const API_URL = 'https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev';

var rankingData = {
    monthly: [],
    allTime: []
};

var currentTab = 'monthly';

function fetchRankingData() {
    var listElement = document.getElementById('rankingList');

    if (!listElement) {
        console.error('[Ranking] Elemento rankingList não encontrado.');
        return;
    }

    listElement.innerHTML =
        '<div class="ranking-status">Carregando dados...</div>';

    console.log('[Ranking] Buscando API:', API_URL);

    fetch(API_URL, {
        method: 'GET',
        cache: 'no-store'
    })
        .then(function(response) {
            console.log('[Ranking] HTTP:', response.status);

            if (!response.ok) {
                throw new Error(
                    'Erro na API: HTTP ' + response.status
                );
            }

            return response.json();
        })
        .then(function(data) {
            console.log('[Ranking] Dados recebidos:', data);

            rankingData.monthly =
                Array.isArray(data.monthly)
                    ? data.monthly
                    : [];

            rankingData.allTime =
                Array.isArray(data.allTime)
                    ? data.allTime
                    : [];

            console.log(
                '[Ranking] Mensal:',
                rankingData.monthly
            );

            console.log(
                '[Ranking] Global:',
                rankingData.allTime
            );

            renderRanking();
        })
        .catch(function(error) {
            console.error(
                '[Ranking] Erro ao buscar API:',
                error
            );

            listElement.innerHTML =
                '<div class="ranking-status">' +
                'Erro ao carregar o ranking.' +
                '<br>' +
                '<small>Verifique o console para mais detalhes.</small>' +
                '</div>';
        });
}


function getRankStyle(index) {
    if (index === 0) {
        return {
            className: 'rank-1',
            symbol: '🥇'
        };
    }

    if (index === 1) {
        return {
            className: 'rank-2',
            symbol: '🥈'
        };
    }

    if (index === 2) {
        return {
            className: 'rank-3',
            symbol: '🥉'
        };
    }

    return {
        className: 'rank-other',
        symbol: (index + 1) + 'º'
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
    var listElement =
        document.getElementById('rankingList');

    if (!listElement) {
        console.error(
            '[Ranking] Elemento rankingList não encontrado.'
        );
        return;
    }

    var dataToRender =
        currentTab === 'monthly'
            ? rankingData.monthly
            : rankingData.allTime;

    if (!Array.isArray(dataToRender)) {
        dataToRender = [];
    }

    /*
     * Segurança:
     * Mesmo que a API envie mais de 5,
     * o site mostra somente as 5 maiores.
     */
    dataToRender = dataToRender
        .slice()
        .sort(function(a, b) {
            return Number(b.amount || 0) -
                   Number(a.amount || 0);
        })
        .slice(0, 5);

    listElement.innerHTML = '';

    if (dataToRender.length === 0) {
        listElement.innerHTML =
            '<div class="ranking-status">' +
            'Nenhuma doação registrada ainda. 🥺' +
            '</div>';

        return;
    }

    dataToRender.forEach(function(donator, index) {
        var rankInfo = getRankStyle(index);

        var li = document.createElement('li');

        li.className =
            'ranking-item ' + rankInfo.className;

        var name =
            donator.name || 'Anônimo';

        var amount =
            Number(donator.amount || 0).toLocaleString(
                'pt-BR',
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

        var rankSpan =
            document.createElement('span');

        rankSpan.className =
            'ranking-rank';

        rankSpan.textContent =
            rankInfo.symbol;

        var nameSpan =
            document.createElement('span');

        nameSpan.className =
            'ranking-name';

        nameSpan.textContent =
            name;

        var amountSpan =
            document.createElement('span');

        amountSpan.className =
            'ranking-amount';

        amountSpan.textContent =
            'R$ ' + amount;

        li.appendChild(rankSpan);
        li.appendChild(nameSpan);
        li.appendChild(amountSpan);

        listElement.appendChild(li);
    });
}


function setTab(tab) {
    if (tab !== 'monthly' && tab !== 'allTime') {
        return;
    }

    currentTab = tab;

    var buttons =
        document.querySelectorAll('.tab-btn');

    buttons.forEach(function(button) {
        if (button.getAttribute('data-tab') === tab) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    console.log(
        '[Ranking] Aba:',
        currentTab
    );

    renderRanking();
}


document.addEventListener(
    'DOMContentLoaded',
    function() {
        var buttons =
            document.querySelectorAll('.tab-btn');

        buttons.forEach(function(button) {
            button.addEventListener(
                'click',
                function() {
                    setTab(
                        button.getAttribute('data-tab')
                    );
                }
            );
        });

        fetchRankingData();
    }
);
