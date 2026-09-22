import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const variables = read("css/core/variables.css");

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  assert.match(value, /^[0-9a-f]{6}$/i);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function luminance(hex) {
  const channels = hexToRgb(hex).map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function rootBlock() {
  return variables.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || "";
}

function darkBlocks() {
  return [...variables.matchAll(/(?:^|\n)\s*:root(?:\[data-theme="dark"\]|:not\(\[data-theme\]\))\s*\{([\s\S]*?)\n\s*\}/g)]
    .map((match) => match[1]);
}

function token(block, name) {
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert.ok(match, `token --${name} ausente`);
  return match[1].toLowerCase();
}

const protectedSelectors = [
  ["css/core/global.css", ".button-primary"],
  ["css/core/global.css", ".site-footer-settings-toggle[aria-expanded=\"true\"]"],
  ["css/core/global.css", ".site-settings-option input:checked + span"],
  ["css/core/navbar.css", ".site-nav-donate"],
  ["css/core/navbar.css", ".site-nav-mobile-support"],
  ["css/components/ranking.css", ".ranking-tabs .tab-btn.active"],
  ["css/components/carousels.css", ".lives-carousel-button:hover:not(:disabled)"],
  ["css/pages/doacoes.css", ".donation-btn-primary"],
  ["css/pages/artes.css", ".artes-filter.is-active"],
  ["css/pages/artes.css", ".artes-search-field-option[aria-selected=\"true\"]"],
  ["css/pages/blog.css", ".blog-search-field-option[aria-selected=\"true\"]"],
  ["css/pages/blog.css", ".blog-filter.is-active"],
  ["css/pages/home.css", ".home-blog-all-link:focus-visible"],
  ["css/pages/home.css", ".hero-view-tab[aria-selected=\"true\"]"]
];

test("tokens de ação atingem WCAG AA nos temas claro e escuro", () => {
  const light = rootBlock();
  assert.ok(light, "bloco :root ausente");
  const lightBg = token(light, "button-bg");
  const lightHover = token(light, "button-bg-hover");
  const lightText = token(light, "button-text");
  assert.ok(contrast(lightBg, lightText) >= 4.5, "botão claro em repouso abaixo de 4.5:1");
  assert.ok(contrast(lightHover, lightText) >= 4.5, "botão claro em hover abaixo de 4.5:1");

  const dark = darkBlocks();
  assert.equal(dark.length, 2, "tema escuro explícito e fallback devem declarar tokens de ação");
  for (const block of dark) {
    const bg = token(block, "button-bg");
    const hover = token(block, "button-bg-hover");
    const text = token(block, "button-text");
    assert.ok(contrast(bg, text) >= 4.5, "botão escuro em repouso abaixo de 4.5:1");
    assert.ok(contrast(hover, text) >= 4.5, "botão escuro em hover abaixo de 4.5:1");
  }
});

test("componentes primários usam tokens semânticos de botão", () => {
  for (const [rel, selector] of protectedSelectors) {
    const css = read(rel);
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = css.match(new RegExp(`${escaped}[^\\{]*\\{([^}]*)\\}`))?.[1];
    assert.ok(block, `${rel}: regra ${selector} ausente`);
    assert.match(block, /var\(--button-(?:bg|text)/, `${rel}: ${selector} não usa tokens de ação`);
  }
});

test("textos pequenos de marca usam --primary-text no tema claro", () => {
  const navbar = read("css/core/navbar.css");
  const home = read("css/pages/home.css");
  assert.match(navbar, /\.site-nav-mobile-title\s*\{[\s\S]*?color:\s*var\(--primary-text\);[\s\S]*?font-size:\s*1\.12rem;/);
  assert.match(home, /\.agenda-date-time-separator\s*\{\s*color:\s*var\(--primary-text\);/);
});
