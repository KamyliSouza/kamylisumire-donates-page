// Define --vh com a altura real da tela (funciona melhor que a
// unidade "vh" nativa, que pula quando a barra do navegador
// aparece/desaparece no Chrome Android e no Safari/iOS).
function setViewportHeight() {
    document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
}

// Inicializa a altura na primeira carga
setViewportHeight();

// Recalcula ao redimensionar ou virar o dispositivo
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);

// Suporte adicional para navegadores modernos
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportHeight);
}

// Bloqueia o menu de contexto (botão direito) na página
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});