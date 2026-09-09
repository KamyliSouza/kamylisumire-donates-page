(() => {
    "use strict";

    const content = window.KamyliContent;
    const icons = window.KamyliButtonIcons;

    if (!content || !icons) return;

    const DEFAULTS = Object.freeze({
        navbarSupport: { text: "Apoiar", icon: "heart", ariaLabel: "Apoiar a Kamyli" },
        heroSupport: { text: "Apoiar", icon: "heart" },
        heroLive: { text: "Abrir live", icon: "youtube" },
        livesChannel: { text: "Abrir no YouTube", icon: "youtube" },
        homeBlogAll: { text: "Ver todas", icon: "arrow-right" },
        homeDonation: { text: "Apoiar", icon: "heart" },
        notFoundHome: { text: "Voltar para o início", icon: "home" },
        donationLivepix: { text: "Apoiar com PIX (LivePix)", icon: "pix" },
        donationPixie: { text: "Moeda Estrangeira (Pixie)", icon: "globe" },
        rankingMonthly: { text: "Este mês", icon: "calendar" },
        rankingAllTime: { text: "Todos os tempos", icon: "trophy" },
        blogFilterAll: { text: "Todos", icon: "tag" },
        blogArticleBack: { text: "Voltar ao Blog", icon: "arrow-left" },
        externalCancel: { text: "Cancelar", icon: "x" },
        externalContinue: { text: "Continuar", icon: "external-link" },
        settingsOpen: { text: "Configurações", icon: "settings" },
        settingsClose: { text: "", icon: "x", ariaLabel: "Fechar configurações" },
        livesPrev: { text: "", icon: "chevron-left", ariaLabel: "Mostrar live anterior" },
        livesNext: { text: "", icon: "chevron-right", ariaLabel: "Mostrar próxima live" },
        agendaPrev: { text: "", icon: "chevron-left", ariaLabel: "Mostrar dia anterior" },
        agendaNext: { text: "", icon: "chevron-right", ariaLabel: "Mostrar próximo dia" }
    });

    let config = DEFAULTS;
    let scheduled = false;

    function normalizeEntry(key, source) {
        const fallback = DEFAULTS[key] || {};
        const text = typeof source?.text === "string" ? source.text : fallback.text || "";
        const ariaLabel = typeof source?.ariaLabel === "string" ? source.ariaLabel : fallback.ariaLabel || "";
        const icon = icons.allowed.includes(source?.icon) ? source.icon : fallback.icon || "none";
        return { text, ariaLabel, icon };
    }

    function ensureLabel(button) {
        let label = button.querySelector("[data-button-label]");
        if (label) return label;

        label = document.createElement("span");
        label.dataset.buttonLabel = "";
        label.className = "button-config-label";
        button.appendChild(label);
        return label;
    }

    function ensureIconSlot(button) {
        let slot = button.querySelector("[data-button-icon]");
        if (slot) return slot;

        slot = document.createElement("span");
        slot.dataset.buttonIcon = "";
        slot.className = "button-config-icon";
        button.insertBefore(slot, button.firstChild);
        return slot;
    }

    function applyIcon(button, iconName) {
        const slot = ensureIconSlot(button);
        const className = slot instanceof SVGElement
            ? [...slot.classList].filter(name => name !== "button-config-icon-svg").join(" ")
            : "";
        const svg = icons.create(iconName, className);

        if (slot instanceof SVGElement) {
            if (!svg) {
                slot.hidden = true;
                slot.replaceChildren();
                return;
            }
            svg.dataset.buttonIcon = "";
            slot.replaceWith(svg);
            return;
        }

        slot.replaceChildren();
        slot.hidden = !svg;
        if (svg) slot.appendChild(svg);
    }

    function applyButton(button) {
        const key = button.dataset.buttonKey;
        if (!key) return;

        const entry = normalizeEntry(key, config[key]);
        const signature = JSON.stringify(entry);

        if (
            button.dataset.buttonConfigured === "true" &&
            button.dataset.buttonConfigSignature === signature
        ) {
            return;
        }

        const label = ensureLabel(button);
        label.textContent = entry.text;
        label.hidden = !entry.text;

        if (entry.ariaLabel) {
            button.setAttribute("aria-label", entry.ariaLabel);
        } else if (entry.text) {
            button.removeAttribute("aria-label");
        }

        applyIcon(button, entry.icon);
        button.dataset.buttonConfigured = "true";
        button.dataset.buttonConfigSignature = signature;
    }

    function applyAll() {
        document.querySelectorAll("[data-button-key]").forEach(applyButton);
    }

    function scheduleApply() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            applyAll();
        });
    }

    async function init() {
        try {
            const remote = await content.getJSON("/data/content/buttons.json");
            config = { ...DEFAULTS, ...(remote && typeof remote === "object" ? remote : {}) };
        } catch (error) {
            console.warn("Botões: usando configuração padrão.", error);
        }

        applyAll();

        const observer = new MutationObserver(scheduleApply);
        observer.observe(document.documentElement, { childList: true, subtree: true });

        setTimeout(() => observer.disconnect(), 5000);

        window.addEventListener("kamyli:global-ui-ready", scheduleApply, { once: true });
    }

    window.KamyliButtons = Object.freeze({ apply: applyAll, defaults: DEFAULTS });
    init();
})();
