(() => {
    const mount = document.getElementById("site-footer");
    if (!mount) return;

    const year = new Date().getFullYear();

    mount.innerHTML = `
        <div class="site-footer-content">
            <p class="site-footer-credits">
                <span>
                    Arte do fundo por
                    <a
                        href="https://www.instagram.com/h0wl_oficial/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @h0wl_oficial
                    </a>
                </span>

                <span
                    class="site-footer-separator"
                    aria-hidden="true"
                >
                    ·
                </span>

                <span>
                    Avatar por
                    <a
                        href="https://bsky.app/profile/maililac.bsky.social"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @maililac
                    </a>
                </span>
            </p>

            <p class="site-footer-meta">
                <span>
                    © ${year} Kamyli Sumire. Todos os direitos reservados.
                </span>

                <span
                    class="site-footer-separator"
                    aria-hidden="true"
                >
                    ·
                </span>

                <a
                    href="https://github.com/KamyliSouza/kamylisumire-donates-page"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Ver código fonte
                </a>
            </p>
        </div>
    `;
})();
