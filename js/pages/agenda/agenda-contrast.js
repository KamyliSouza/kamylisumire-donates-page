/*
 * Agenda semanal — contraste adaptativo (regras puras, sem DOM e sem rede).
 *
 * Objetivo: manter o texto legível sobre a capa do jogo alterando a capa o
 * mínimo possível. Para cada região de texto (topo e base do card):
 *
 *   1. escolhe entre texto claro e texto escuro (o que pede menos véu);
 *   2. calcula o véu mínimo (alfa) para atingir TARGET_RATIO;
 *   3. limita o véu a MAX_VEIL; acima disso o halo do texto complementa.
 *
 * Capas em que um dos dois textos já passa não recebem véu nenhum.
 *
 * O pior pixel é o que decide: para texto claro vale o percentil alto de
 * luminância da região; para texto escuro, o percentil baixo. Por isso a
 * média não é usada. As cores abaixo espelham `agenda.css`
 * (`[data-art-top-text]` / `[data-art-bottom-text]`) e são conferidas em
 * `.github/tests/agenda-contrast.test.mjs`.
 */
(() => {
    "use strict";

    const TARGET_RATIO = 4.5;
    const MAX_VEIL = 0.4;
    const VEIL_STEP = 0.01;
    const PERCENTILE = 0.9;

    /* Texto mais fraco de cada tom (platforms) e cor do véu correspondente. */
    const TONES = Object.freeze({
        light: Object.freeze({ weakest: [245, 236, 245], veil: [22, 9, 27] }),
        dark: Object.freeze({ weakest: [47, 34, 49], veil: [255, 247, 255] })
    });

    function toLinear(value) {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }

    function fromLinear(value) {
        const clamped = Math.min(1, Math.max(0, value));
        const channel = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
        return channel * 255;
    }

    function luminance(rgb) {
        return 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
    }

    function contrastRatio(a, b) {
        const high = Math.max(a, b);
        const low = Math.min(a, b);
        return (high + 0.05) / (low + 0.05);
    }

    /* Luminância de um fundo cinza de luminância `bgLum` coberto por um véu de cor `veil` e alfa `alpha`. */
    function veiledLuminance(bgLum, veil, alpha) {
        const gray = fromLinear(bgLum);
        return luminance(veil.map(channel => gray * (1 - alpha) + channel * alpha));
    }

    function minimumVeil(bgLum, tone) {
        const { weakest, veil } = TONES[tone];
        const textLum = luminance(weakest);
        let best = { alpha: MAX_VEIL, ratio: 0, met: false };
        for (let alpha = 0; alpha <= MAX_VEIL + 1e-9; alpha += VEIL_STEP) {
            const rounded = Math.round(alpha * 100) / 100;
            const ratio = contrastRatio(textLum, veiledLuminance(bgLum, veil, rounded));
            best = { alpha: rounded, ratio, met: ratio >= TARGET_RATIO };
            if (best.met) return best;
        }
        return best;
    }

    /* Luminâncias (alta e baixa) da região, em percentil; `bounds` em frações 0–1. */
    function regionStats(pixels, width, height, bounds) {
        const startX = Math.max(0, Math.floor(width * bounds.x1));
        const endX = Math.min(width, Math.ceil(width * bounds.x2));
        const startY = Math.max(0, Math.floor(height * bounds.y1));
        const endY = Math.min(height, Math.ceil(height * bounds.y2));
        const values = [];
        for (let y = startY; y < endY; y += 1) {
            for (let x = startX; x < endX; x += 1) {
                const offset = (y * width + x) * 4;
                /* Pixels transparentes não dizem nada sobre o fundo. */
                if (pixels[offset + 3] < 8) continue;
                values.push(luminance([pixels[offset], pixels[offset + 1], pixels[offset + 2]]));
            }
        }
        if (!values.length) return null;
        values.sort((a, b) => a - b);
        const last = values.length - 1;
        return {
            high: values[Math.min(last, Math.floor(PERCENTILE * last))],
            low: values[Math.max(0, Math.floor((1 - PERCENTILE) * last))]
        };
    }

    /* Decide tom do texto e véu mínimo; null quando não há dados. */
    function planRegion(stats) {
        if (!stats) return null;
        const light = { tone: "light", ...minimumVeil(stats.high, "light") };
        const dark = { tone: "dark", ...minimumVeil(stats.low, "dark") };
        if (light.met !== dark.met) return light.met ? light : dark;
        if (!light.met) return light.ratio >= dark.ratio ? light : dark;
        return light.alpha <= dark.alpha ? light : dark;
    }

    function planCard(pixels, width, height) {
        const top = planRegion(regionStats(pixels, width, height, { x1: 0, x2: 0.78, y1: 0.02, y2: 0.34 }));
        const bottom = planRegion(regionStats(pixels, width, height, { x1: 0, x2: 1, y1: 0.52, y2: 0.98 }));
        return top && bottom ? { top, bottom } : null;
    }

    /*
     * V48.5.2 — Modo compacto: o card vira uma linha baixa e o texto (dia, jogo, plataformas)
     * atravessa a faixa toda, sem "topo" e "base". Uma região só, a faixa inteira, decide o tom
     * e o véu; `top` e `bottom` apontam para o mesmo plano, então o texto fica coerente na linha.
     */
    function planRow(pixels, width, height) {
        const row = planRegion(regionStats(pixels, width, height, { x1: 0, x2: 1, y1: 0.08, y2: 0.92 }));
        return row ? { top: row, bottom: row } : null;
    }

    globalThis.KamyliAgendaContrast = Object.freeze({
        TARGET_RATIO,
        MAX_VEIL,
        TONES,
        luminance,
        contrastRatio,
        veiledLuminance,
        minimumVeil,
        regionStats,
        planRegion,
        planCard,
        planRow
    });
})();
