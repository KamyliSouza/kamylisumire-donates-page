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
        const mobileOverlay = window.KamyliMobileOverlay;
        const root = document.createElement("aside");
        root.id = "site-socials";
        root.className = "site-socials";

        const desktop = document.createElement("nav");
        desktop.className = "site-socials-desktop";
        desktop.setAttribute("aria-label", config.ariaLabel);
        config.redes.forEach(item => desktop.appendChild(socialLink(item)));

        const mobile = document.createElement("div");
        mobile.className = "site-socials-mobile";

        const trigger = document.createElement("button");
        trigger.className = "site-socials-mobile-trigger";
        trigger.type = "button";
        trigger.setAttribute("aria-label", config.mobileButtonAriaLabel);
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", "site-socials-mobile-menu");
        trigger.title = "Redes sociais";

        const triggerMark = document.createElement("span");
        triggerMark.className = "site-socials-mobile-trigger-mark";
        triggerMark.setAttribute("aria-hidden", "true");
        triggerMark.textContent = "@";

        const triggerLabel = document.createElement("span");
        triggerLabel.className = "site-socials-mobile-trigger-label";
        triggerLabel.textContent = "Redes";

        trigger.append(triggerMark, triggerLabel);

        const menu = document.createElement("nav");
        menu.id = "site-socials-mobile-menu";
        menu.className = "site-socials-mobile-menu";
        menu.setAttribute("aria-label", config.ariaLabel);
        menu.setAttribute("aria-hidden", "true");
        menu.inert = true;

        function applyOpenState(open) {
            const shouldOpen = Boolean(open);
            mobile.classList.toggle("is-open", shouldOpen);
            trigger.setAttribute("aria-expanded", String(shouldOpen));
            menu.setAttribute("aria-hidden", String(!shouldOpen));
            menu.inert = !shouldOpen;
        }

        config.redes.forEach(item => {
            const link = socialLink(item, true);
            link.addEventListener("click", () => {
                mobileOverlay?.close("socials");
            });
            menu.appendChild(link);
        });

        mobile.append(trigger, menu);
        root.append(desktop, mobile);
        document.body.appendChild(root);

        mobileOverlay?.register("socials", {
            isOpen: () => mobile.classList.contains("is-open"),
            open: () => applyOpenState(true),
            close: () => applyOpenState(false),
            focusTrigger: () => trigger.focus()
        });

        trigger.addEventListener("click", () => {
            mobileOverlay?.toggle("socials");
        });

        document.addEventListener("pointerdown", event => {
            if (
                mobile.classList.contains("is-open") &&
                event.isPrimary !== false &&
                event.target instanceof Node &&
                !mobile.contains(event.target)
            ) {
                mobileOverlay?.close("socials");
            }
        }, { passive: true });
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
