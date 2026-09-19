(() => {
    "use strict";

    const DATA_PATH = "/data/content/redes.json";
    const sitePath = window.KAMYLI_SITE_PATH || (value => value);
    const iconLibrary = window.KamyliButtonIcons;

    if (!iconLibrary || typeof iconLibrary.create !== "function") return;

    function safeHttpsUrl(value) {
        try {
            const url = new URL(String(value || ""), window.location.href);
            return url.protocol === "https:" ? url.href : null;
        } catch {
            return null;
        }
    }

    function normalizeConfig(data) {
        if (!data || typeof data !== "object" || Array.isArray(data)) return null;
        if (!Array.isArray(data.redes)) return null;

        const seen = new Set();
        const redes = data.redes.flatMap(item => {
            if (!item || typeof item !== "object" || item.visivel !== true) return [];

            const id = String(item.id || "").trim();
            const nome = String(item.nome || "").trim();
            const icone = String(item.icone || "").trim();
            const url = safeHttpsUrl(item.url);

            if (!id || seen.has(id) || !nome || !url || !iconLibrary.allowed.includes(icone)) {
                return [];
            }

            seen.add(id);
            return [{ id, nome, icone, url }];
        });

        if (!redes.length) return null;

        return {
            ariaLabel: String(data.ariaLabel || "Redes sociais").trim() || "Redes sociais",
            mobileButtonAriaLabel:
                String(data.mobileButtonAriaLabel || "Abrir redes sociais").trim() ||
                "Abrir redes sociais",
            redes
        };
    }

    function socialLink(item, mobile = false) {
        const link = document.createElement("a");
        link.className = mobile
            ? "site-socials-mobile-link"
            : "site-social-link";
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", item.nome);
        link.title = item.nome;
        link.dataset.socialId = item.id;

        const icon = iconLibrary.create(item.icone, "site-social-icon");
        if (icon) link.appendChild(icon);

        if (mobile) {
            const label = document.createElement("span");
            label.textContent = item.nome;
            link.appendChild(label);
        }

        return link;
    }

    function buildSocials(config) {
        const root = document.createElement("aside");
        root.id = "site-socials";
        root.className = "site-socials";

        const desktop = document.createElement("nav");
        desktop.className = "site-socials-desktop";
        desktop.setAttribute("aria-label", config.ariaLabel);
        config.redes.forEach(item => desktop.appendChild(socialLink(item)));

        const mobile = document.createElement("details");
        mobile.className = "site-socials-mobile";
        mobile.addEventListener("toggle", () => {
            if (mobile.open) {
                document.querySelector(
                    "#site-navbar .site-nav-mobile-layer.is-mobile-menu-open .site-nav-mobile-trigger"
                )?.click();
            }
        });

        const summary = document.createElement("summary");
        summary.className = "site-socials-mobile-trigger";
        summary.setAttribute("aria-label", config.mobileButtonAriaLabel);
        summary.title = "Redes sociais";

        const triggerMark = document.createElement("span");
        triggerMark.className = "site-socials-mobile-trigger-mark";
        triggerMark.setAttribute("aria-hidden", "true");
        triggerMark.textContent = "@";

        const triggerLabel = document.createElement("span");
        triggerLabel.className = "site-socials-mobile-trigger-label";
        triggerLabel.textContent = "Redes";

        summary.append(triggerMark, triggerLabel);

        const menu = document.createElement("nav");
        menu.className = "site-socials-mobile-menu";
        menu.setAttribute("aria-label", config.ariaLabel);
        config.redes.forEach(item => {
            const link = socialLink(item, true);
            link.addEventListener("click", () => mobile.removeAttribute("open"));
            menu.appendChild(link);
        });

        mobile.append(summary, menu);
        root.append(desktop, mobile);
        document.body.appendChild(root);

        document.addEventListener("click", event => {
            if (mobile.open && event.target instanceof Node && !mobile.contains(event.target)) {
                mobile.removeAttribute("open");
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && mobile.open) {
                mobile.removeAttribute("open");
                summary.focus();
            }
        });

        const mobileQuery = window.matchMedia("(max-width: 767px)");
        mobileQuery.addEventListener?.("change", event => {
            if (!event.matches) mobile.removeAttribute("open");
        });
    }

    fetch(sitePath(DATA_PATH), {
        cache: "no-cache",
        headers: { "Accept": "application/json" }
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(normalizeConfig)
        .then(config => {
            if (config) buildSocials(config);
        })
        .catch(error => {
            console.warn("Redes sociais editoriais indisponíveis; componente global ocultado.", error);
        });
})();
