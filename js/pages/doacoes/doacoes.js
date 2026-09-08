// Mantém uma variável CSS com a altura real da viewport em navegadores móveis.
function setViewportHeight() {
    document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
    );
}

setViewportHeight();

window.addEventListener("resize", setViewportHeight);
window.addEventListener("orientationchange", setViewportHeight);

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setViewportHeight);
}
