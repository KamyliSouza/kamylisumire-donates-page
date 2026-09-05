// Substitua pela URL gerada pelo seu Worker no Cloudflare
const WORKER_URL = 'https://api.kamylisumire.com'; 

let rankingData = { monthly: [], allTime: [] };
let currentTab = 'monthly';
const listElement = document.getElementById('rankingList');
const tabButtons = document.querySelectorAll('.tab-btn');

function getRankStyle(index) {
    const pos = index + 1;
    if (pos === 1) return { symbol: '🥇', class: 'rank-1' };
    if (pos === 2) return { symbol: '🥈', class: 'rank-2' };
    if (pos === 3) return { symbol: '🥉', class: 'rank-3' };
    return { symbol: `#${pos}`, class: 'rank-other' };
}

function renderRanking() {
    listElement.innerHTML = '';
    const dataToRender = rankingData[currentTab];

    if (!dataToRender || dataToRender.length === 0) {
        listElement.innerHTML = `<div class="ranking-status">Nenhuma doação registrada ainda. 🥺</div>`;
        return;
    }

    dataToRender.forEach((donator, index) => {
        const rankInfo = getRankStyle(index);
        const li = document.createElement('li');
        li.className = `ranking-item ${rankInfo.class}`;
        
        li.innerHTML = `
            <span class="ranking-rank">${rankInfo.symbol}</span>
            <span class="ranking-name">${donator.name}</span>
            <span class="ranking-amount">R$ ${donator.amount}</span>
        `;
        listElement.appendChild(li);
    });
}

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentTab = button.dataset.tab;
        renderRanking();
    });
});

async function fetchRankingData() {
    try {
        const response = await fetch(WORKER_URL);
        if (!response.ok) throw new Error('Erro ao buscar dados');
        
        rankingData = await response.json();
        renderRanking();
    } catch (error) {
        console.error(error);
        listElement.innerHTML = `<div class="ranking-status">Erro ao carregar o ranking. Tente novamente mais tarde.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', fetchRankingData);