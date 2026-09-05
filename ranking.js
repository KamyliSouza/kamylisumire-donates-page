// URL original do Worker mantida
const API_URL = 'https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev'; 

let rankingData = {
    monthly: [],
    allTime: []
};
let currentTab = 'monthly';

// Mapeamento dos elementos do DOM
const listElement = document.getElementById('ranking-list');
const monthlyTab = document.getElementById('tab-monthly');
const allTimeTab = document.getElementById('tab-all-time');

// Busca os dados do Cloudflare Worker
async function fetchRankingData() {
    try {
        listElement.innerHTML = '<div class="ranking-status">Carregando ranking... ☁️</div>';
        
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Erro ao buscar os dados da API');
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

// Define os ícones e classes dos primeiros colocados
function getRankStyle(index) {
    switch(index) {
        case 0: return { class: 'rank-1', symbol: '🥇' };
        case 1: return { class: 'rank-2', symbol: '🥈' };
        case 2: return { class: 'rank-3', symbol: '🥉' };
        default: return { class: 'rank-other', symbol: `${index + 1}º` };
    }
}

// Renderiza a lista na tela com a trava do Top 5
function renderRanking() {
    listElement.innerHTML = '';
    const dataToRender = rankingData[currentTab];

    if (!dataToRender || dataToRender.length === 0) {
        listElement.innerHTML = '<div class="ranking-status">Nenhuma doação registrada ainda. 🥺</div>';
        return;
    }

    // TRAVA DE SEGURANÇA: .slice(0, 5) garante que o frontend nunca renderize mais de 5 itens
    dataToRender.slice(0, 5).forEach((donator, index) => {
        const rankInfo = getRankStyle(index);
        const li = document.createElement('li');
        li.className = `ranking-item ${rankInfo.class}`;
        
        // Como o Worker já envia o valor formatado, usamos apenas "R$ " + donator.amount
        li.innerHTML = `
            <span class="ranking-rank">${rankInfo.symbol}</span>
            <span class="ranking-name">${donator.name}</span>
            <span class="ranking-amount">R$ ${donator.amount}</span>
        `;
        listElement.appendChild(li);
    });
}

// Alterna entre as abas Mensal e Global
function setTab(tab) {
    currentTab = tab;
    
    if (tab === 'monthly') {
        monthlyTab.classList.add('active');
        allTimeTab.classList.remove('active');
    } else {
        allTimeTab.classList.add('active');
        monthlyTab.classList.remove('active');
    }
    
    renderRanking();
}

// Event Listeners dos botões
monthlyTab.addEventListener('click', () => setTab('monthly'));
allTimeTab.addEventListener('click', () => setTab('allTime'));

// Dispara a busca inicial quando o script carrega
fetchRankingData();
