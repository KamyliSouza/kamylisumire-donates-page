/*
 * Favicon compartilhado — reproduz a máscara colorida da marca na Navbar.
 * A origem externa só substitui os ícones existentes depois de a imagem e o
 * Canvas serem exportados com sucesso; em qualquer falha, o favicon original
 * continua como fallback.
 */
(() => {
    "use strict";

    const LOGO_URL = "https://assets.kamylisumire.com/logo.webp";
    const SIZE = 64;
    const root = document.documentElement;
    const icons = Array.from(document.querySelectorAll('link[rel~="icon"]'));

    if (!icons.length || typeof Image !== "function") return;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;

    const context = canvas.getContext("2d");
    if (!context) return;

    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.referrerPolicy = "no-referrer";

    let logoReady = false;
    let lastColor = "";

    function updateFavicon() {
        if (!logoReady || !logo.naturalWidth || !logo.naturalHeight) return;

        const color = getComputedStyle(root)
            .getPropertyValue("--primary-color")
            .trim();
        if (!color || color === lastColor) return;

        try {
            context.clearRect(0, 0, SIZE, SIZE);

            /* Mesmo comportamento de mask-size: contain da .site-brand-logo. */
            const scale = Math.min(
                SIZE / logo.naturalWidth,
                SIZE / logo.naturalHeight
            );
            const width = logo.naturalWidth * scale;
            const height = logo.naturalHeight * scale;
            const x = (SIZE - width) / 2;
            const y = (SIZE - height) / 2;

            context.drawImage(logo, x, y, width, height);
            context.globalCompositeOperation = "source-in";
            context.fillStyle = color;
            context.fillRect(0, 0, SIZE, SIZE);
            context.globalCompositeOperation = "source-over";

            const dataUrl = canvas.toDataURL("image/png");
            if (!dataUrl.startsWith("data:image/png")) return;

            icons.forEach(icon => {
                icon.type = "image/png";
                icon.sizes = `${SIZE}x${SIZE}`;
                icon.href = dataUrl;
            });

            lastColor = color;
        } catch {
            /* CORS, Canvas ou export indisponível: mantém o favicon original. */
        }
    }

    logo.addEventListener("load", () => {
        logoReady = true;
        updateFavicon();
    }, { once: true });
    logo.addEventListener("error", () => {
        /* O favicon remoto original permanece como fallback. */
    }, { once: true });

    /* A preferência de tema também muda em tempo real, inclusive no modo Auto. */
    window.addEventListener("kamyli:ui-preference-change", updateFavicon);

    logo.src = LOGO_URL;
})();
