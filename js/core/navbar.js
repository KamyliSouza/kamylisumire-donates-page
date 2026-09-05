(() => {
    const mount = document.getElementById("site-navbar");
    if (!mount) return;

    const path = window.location.pathname;
    const onDonations = path.includes("/doacoes");

    const sitePath = window.KAMYLI_SITE_PATH || (value => value);

    mount.innerHTML = `
        <nav class="site-nav" aria-label="Navegação principal">
            <div class="site-nav-inner">
                <a class="site-brand" href="${sitePath("/")}">✦ KAMYLI SUMIRE</a>

                <button class="nav-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">
                    ☰
                </button>

                <div class="site-nav-links">
                    <a class="site-nav-link ${!onDonations ? "is-active" : ""}" href="${sitePath("/")}">Início</a>
                    <a class="site-nav-link" href="${sitePath("/#agenda")}">Agenda</a>
                    <a class="site-nav-link" href="${sitePath("/#redes")}">Redes</a>
                    <a class="site-nav-link" href="${sitePath("/#links")}">Links</a>
                    <a class="site-nav-link site-nav-donate ${onDonations ? "is-active" : ""}" href="${sitePath("/doacoes/")}">Doações 💜</a>
                </div>
            </div>
        </nav>
    `;

    const toggle = mount.querySelector(".nav-toggle");
    const links = mount.querySelector(".site-nav-links");

    toggle?.addEventListener("click", () => {
        const open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "✕" : "☰";
    });

    links?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            links.classList.remove("is-open");
            toggle?.setAttribute("aria-expanded", "false");
            if (toggle) toggle.textContent = "☰";
        });
    });
})();
