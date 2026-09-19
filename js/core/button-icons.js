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
        twitch: [
            ["path", { d: "M4 3h17v11.2l-4.7 4.7h-3.6L10 21.5v-2.6H5.8L4 17.1V3Zm2.3 2.3v10.4h4.6v2.2l2.2-2.2h3l2.6-2.6V5.3H6.3Zm4 2.2h2.1v5.4h-2.1V7.5Zm5 0h2.1v5.4h-2.1V7.5Z", fill: "currentColor", stroke: "none" }]
        ],
        tiktok: [
            ["path", { d: "M14.1 3h3a5.2 5.2 0 0 0 3.1 3.1v3a8 8 0 0 1-3.1-.8v6.4a6 6 0 1 1-5.2-5.9v3.1a3 3 0 1 0 2.2 2.8V3Z", fill: "currentColor", stroke: "none" }]
        ],
        "x-social": [
            ["path", { d: "M5.3 4h3.8l3.5 4.7L16.5 4h2.2l-5.1 6.2L19 20h-3.8l-3.9-5.3L6.9 20H4.7l5.6-6.8L5.3 4Zm2.8 1.7 8 12.6h1.4l-8-12.6H8.1Z", fill: "currentColor", stroke: "none" }]
        ],
        instagram: [
            ["path", { d: "M7.4 3h9.2A4.4 4.4 0 0 1 21 7.4v9.2a4.4 4.4 0 0 1-4.4 4.4H7.4A4.4 4.4 0 0 1 3 16.6V7.4A4.4 4.4 0 0 1 7.4 3Zm0 2A2.4 2.4 0 0 0 5 7.4v9.2A2.4 2.4 0 0 0 7.4 19h9.2a2.4 2.4 0 0 0 2.4-2.4V7.4A2.4 2.4 0 0 0 16.6 5H7.4Zm9.7 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z", fill: "currentColor", stroke: "none" }]
        ],
        discord: [
            ["path", { d: "M18.9 5.3A16 16 0 0 0 15.4 4l-.4.9a13 13 0 0 0-6 0L8.6 4a16 16 0 0 0-3.5 1.3A14.8 14.8 0 0 0 2.7 15a13.9 13.9 0 0 0 4.3 2.2l1.1-1.5a9.5 9.5 0 0 1-1.7-.8l.4-.3a10.9 10.9 0 0 0 10.4 0l.4.3a9.5 9.5 0 0 1-1.7.8l1.1 1.5a13.9 13.9 0 0 0 4.3-2.2 14.8 14.8 0 0 0-2.4-9.7ZM9.1 13.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.8 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z", fill: "currentColor", stroke: "none" }]
        ],
        share: [
            ["circle", { cx: "18", cy: "5", r: "2.2" }],
            ["circle", { cx: "6", cy: "12", r: "2.2" }],
            ["circle", { cx: "18", cy: "19", r: "2.2" }],
            ["path", { d: "m8 11 7.9-4.6M8 13l7.9 4.6" }]
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
        video: [
            ["rect", { x: "3", y: "5", width: "18", height: "14", rx: "2" }],
            ["path", { d: "m10 9 5 3-5 3V9Z" }]
        ],
        image: [
            ["rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }],
            ["circle", { cx: "8.5", cy: "9", r: "1.5" }],
            ["path", { d: "m4.5 17 4.5-4.5 3.5 3 2.5-2.5 4.5 4" }]
        ],
        "file-text": [
            ["path", { d: "M6 3h8l4 4v14H6V3Z" }],
            ["path", { d: "M14 3v5h5M9 12h6M9 16h6M9 8h2" }]
        ],
        gamepad: [
            ["path", { d: "M7.5 8h9a4.5 4.5 0 0 1 4.2 6.1l-1.2 3.2a2 2 0 0 1-3.4.6L14.7 16H9.3l-1.4 1.9a2 2 0 0 1-3.4-.6l-1.2-3.2A4.5 4.5 0 0 1 7.5 8Z" }],
            ["path", { d: "M7 11.5v5M4.5 14h5" }],
            ["circle", { cx: "16", cy: "12.5", r: ".8" }],
            ["circle", { cx: "18.5", cy: "15", r: ".8" }]
        ],
        "shield-check": [
            ["path", { d: "M12 3 19 6v5c0 4.5-2.8 7.6-7 10-4.2-2.4-7-5.5-7-10V6l7-3Z" }],
            ["path", { d: "m8.5 12 2.2 2.2 4.8-5" }]
        ],
        users: [
            ["circle", { cx: "9", cy: "8", r: "3" }],
            ["path", { d: "M3.5 20a5.5 5.5 0 0 1 11 0" }],
            ["circle", { cx: "17", cy: "9", r: "2.5" }],
            ["path", { d: "M15.5 15.5a4.5 4.5 0 0 1 5 4.5" }]
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
            ["polygon", { points: "9.17,5.16 10.34,4.79 10.17,2.58 13.83,2.58 13.66,4.79 14.83,5.16 15.92,5.72 17.37,4.04 19.96,6.63 18.28,8.08 18.84,9.17 19.21,10.34 21.42,10.17 21.42,13.83 19.21,13.66 18.84,14.83 18.28,15.92 19.96,17.37 17.37,19.96 15.92,18.28 14.83,18.84 13.66,19.21 13.83,21.42 10.17,21.42 10.34,19.21 9.17,18.84 8.08,18.28 6.63,19.96 4.04,17.37 5.72,15.92 5.16,14.83 4.79,13.66 2.58,13.83 2.58,10.17 4.79,10.34 5.16,9.17 5.72,8.08 4.04,6.63 6.63,4.04 8.08,5.72" }],
            ["circle", { cx: "12", cy: "12", r: "3" }]
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
