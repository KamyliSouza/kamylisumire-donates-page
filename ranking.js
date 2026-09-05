const API_URL = 'https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev'; 

let rankingData = { monthly: [], allTime: [] };
let currentTab = 'monthly';

async function fetchRankingData() {
    const listElement = document.getElementById('ranking-list');
    if (!listElement) return; // Evita que o código quebre se o ID não for encontrado

    try {
        listElement.innerHTML = '<div class="ranking-status">Carregando ranking... ☁️</div>';
        
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        rankingData.monthly = data.monthly || [];
        rankingData.allTime = data.allTime || [];
        
        renderRanking();
    } catch (error) {
        console.error('Erro ao buscar doações:', error);
        listElement.innerHTML = '<div class="ranking-status">Erro ao carregar o ranking. Tente novamente mais tarde! 🌧️</div>';
    }
}

function getRankStyle(index) {
    switch(index) {
        case 0: return { class: 'rank-1', symbol: '🥇' };
        case 1: return { class: 'rank-2', symbol: '🥈' };
        case 2: return { class: 'rank-3', symbol: '🥉' };
        default: return { class: 'rank-other', symbol: `${index + 1}º` };
    }
}

function renderRanking() {
    const listElement = document.getElementById('ranking-list');
    if (!listElement) return;

    listElement.innerHTML = '';
    const dataToRender = rankingData[currentTab];

    if (!dataToRender || dataToRender.length === 0) {
        listElement.innerHTML = '<div class="ranking-status">Nenhuma doação registrada ainda. 🥺</div>';
        return;
    }

    // Trava do Top 5 em ação
    dataToRender.slice(0, 5).forEach((donator, index) => {
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

function setTab(tab) {
    currentTab = tab;
    const monthlyTab = document.getElementById('tab-monthly');
    const allTimeTab = document.getElementById('tab-all-time');
    
    if (monthlyTab && allTimeTab) {
        if (tab === 'monthly') {
            monthlyTab.classList.add('active');
            allTimeTab.classList.remove('active');
        } else {
            allTimeTab.classList.add('active');
            monthlyTab.classList.remove('active');
        }
    }
    
    renderRanking();
}

// O código abaixo garante que o script só inicie DEPOIS que a página HTML inteira carregar
document.addEventListener('DOMContentLoaded', () => {
    const monthlyTab = document.getElementById('tab-monthly');
    const allTimeTab = document.getElementById('tab-all-time');
    
    if (monthlyTab) monthlyTab.addEventListener('click', () => setTab('monthly'));
    if (allTimeTab) allTimeTab.addEventListener('click', () => setTab('allTime'));

    fetchRankingData();
});
