(() => {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    const ICONS = Object.freeze({
        none: [],
        heart: [
            ["path", { d: "M12 21s-7.2-4.35-9.6-8.35C.65 9.95 1.5 6.4 4.6 5.1c2-.85 4.25-.3 5.65 1.35L12 8.5l1.75-2.05c1.4-1.65 3.65-2.2 5.65-1.35 3.1 1.3 3.95 4.85 2.2 7.55C19.2 16.65 12 21 12 21Z", fill: "currentColor", stroke: "none" }]
        ],
        youtube: [
            ["path", { d: "M21.6 7.2a2.9 2.9 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.9 2.9 0 0 0-2 2A30 30 0 0 0 2 12a30 30 0 0 0 .4 4.8 2.9 2.9 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.9 2.9 0 0 0 2-2A30 30 0 0 0 22 12a30 30 0 0 0-.4-4.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z", fill: "currentColor", stroke: "none" }]
        ],
        "arrow-right": [["path", { d: "M5 12h14M14 7l5 5-5 5" }]],
        "arrow-left": [["path", { d: "M19 12H5m5-5-5 5 5 5" }]],
        "chevron-left": [["path", { d: "m15 18-6-6 6-6" }]],
        "chevron-right": [["path", { d: "m9 18 6-6-6-6" }]],
        home: [["path", { d: "M3 11.5 12 4l9 7.5M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6" }]],
        pix: [
            ["path", { d: "M12 3v18" }],
            ["path", { d: "M17 7.2c-1.1-.9-2.6-1.4-4.3-1.4-2.3 0-4.2 1.1-4.2 3 0 4.6 8.1 2.3 8.1 7 0 1.9-1.7 3.2-4.5 3.2-1.9 0-3.6-.6-4.8-1.6" }]
        ],
        globe: [
            ["circle", { cx: "12", cy: "12", r: "8.5" }],
            ["path", { d: "M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" }]
        ],
        calendar: [
            ["rect", { x: "4", y: "5", width: "16", height: "15", rx: "2" }],
            ["path", { d: "M8 3v4m8-4v4M4 10h16" }]
        ],
        trophy: [
            ["path", { d: "M8 4h8v5a4 4 0 0 1-8 0V4Zm4 9v4m-4 3h8M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4" }]
        ],
        tag: [
            ["path", { d: "M4 5v6l8 8 7-7-8-8H5a1 1 0 0 0-1 1Z" }],
            ["circle", { cx: "8.5", cy: "8.5", r: "1" }]
        ],
        x: [["path", { d: "M6 6l12 12M18 6 6 18" }]],
        "external-link": [
            ["path", { d: "M14 5h5v5M19 5l-8 8" }],
            ["path", { d: "M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" }]
        ],
        settings: [
            ["circle", { cx: "12", cy: "12", r: "3" }],
            ["path", { d: "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.55V20.3h-3v-.09a1.7 1.7 0 0 0-1.04-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.55-1.04H5.3v-3h.15A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 7.98l2.12-2.12.06.06A1.7 1.7 0 0 0 10.66 6.26 1.7 1.7 0 0 0 11.7 4.7V4.6h3v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1.04h.15v3h-.15A1.7 1.7 0 0 0 19.4 15Z" }]
        ]
    });

    const ALLOWED = Object.freeze(Object.keys(ICONS));

    function create(name, className = "") {
        const iconName = ALLOWED.includes(name) ? name : "none";
        if (iconName === "none") return null;

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.classList.add("button-config-icon-svg");
        if (className) svg.classList.add(...String(className).split(/\s+/).filter(Boolean));

        ICONS[iconName].forEach(([tag, attrs]) => {
            const node = document.createElementNS(SVG_NS, tag);
            Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
            if (!Object.prototype.hasOwnProperty.call(attrs, "fill")) node.setAttribute("fill", "none");
            if (!Object.prototype.hasOwnProperty.call(attrs, "stroke")) node.setAttribute("stroke", "currentColor");
            node.setAttribute("stroke-width", "1.8");
            node.setAttribute("stroke-linecap", "round");
            node.setAttribute("stroke-linejoin", "round");
            svg.appendChild(node);
        });

        return svg;
    }

    window.KamyliButtonIcons = Object.freeze({ create, allowed: ALLOWED });
})();
