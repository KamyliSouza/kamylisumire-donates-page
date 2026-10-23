import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const PAGES = [
  "index.html",
  "404.html",
  "doacoes/index.html",
  "artes/index.html",
  "blog/index.html",
  "jogos/index.html",
  "privacidade/index.html",
  "uso-de-ia/index.html",
];

const SETTINGS_VERSION = "48.3.66";
const NAVBAR_CSS_VERSION = "48.3.67"; // correção do destaque da engrenagem

/** Corpos de todas as regras CSS cuja lista de seletores contém `selector` (inclusive dentro de @media). */
function ruleBodies(css, selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const bodies = [];
  for (const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const list = match[1].split(",").map((item) => item.trim());
    if (list.includes(selector)) bodies.push(match[2]);
  }
  return bodies;
}

const ruleBody = (css, selector) => ruleBodies(css, selector)[0] ?? null;

test("Configurações ficam na barra superior: slot próprio, antes do slot opcional de Apoiar", () => {
  const navbar = read("js/core/navbar.js");
  const actions = navbar.indexOf('class="site-nav-actions"');
  const slot = navbar.indexOf('id="site-nav-settings-slot"');
  const support = navbar.indexOf('class="site-nav-support-wrap"');
  assert.ok(actions >= 0 && actions < slot && slot < support, "slot de Configurações deve preceder o de Apoiar, dentro de .site-nav-actions");

  // O slot de Apoiar pode ficar hidden (navbar.json); a engrenagem não pode viver dentro dele.
  const supportBlock = navbar.slice(support, navbar.indexOf("</nav>", support));
  assert.ok(!supportBlock.includes("site-nav-settings-slot"), "engrenagem não pode ficar dentro de .site-nav-support-wrap");

  const content = read("js/core/content.js");
  assert.match(content, /\.site-settings-toggle/, "content.js: o observer global deve reagir à montagem do botão");
  assert.match(content, /function applySettings\(copy\)/);
});

test("painel é montado em <body> e participa do controlador de overlays do celular", () => {
  const settings = read("js/core/settings.js");
  assert.match(settings, /document\.body\.appendChild\(popover\)/, "painel deve sair de .site-nav (backdrop-filter)");
  assert.match(settings, /mobileOverlay\?\.register\(OVERLAY_NAME/);
  assert.match(settings, /mobileOverlay\.open\(OVERLAY_NAME/);
  assert.match(settings, /mobileOverlay\.close\(OVERLAY_NAME/);
  assert.match(settings, /event\.key === "Escape"/);
  assert.match(settings, /toggle\.focus\(\)/, "foco deve voltar para a engrenagem");
  assert.match(settings, /aria-expanded/);
  assert.match(settings, /aria-controls="siteSettingsPopover"/);
  assert.match(settings, /data-button-key="settingsOpen"/);
});

test("footer.js não carrega mais as Configurações", () => {
  const footer = read("js/core/footer.js");
  for (const legacy of ["footerSettings", "site-footer-settings", "site-settings", "bindSettings", "KAMYLI_UI_PREFS"]) {
    assert.ok(!footer.includes(legacy), `footer.js: resquício ${legacy}`);
  }
  for (const rel of ["css/core/global.css", "css/core/navbar.css", "css/core/reading.css"]) {
    const css = read(rel);
    assert.ok(!css.includes("site-footer-settings"), `${rel}: resquício site-footer-settings`);
    assert.ok(!css.includes("site-settings-open"), `${rel}: resquício site-settings-open`);
  }
});

test("painel: fixo, opaco, sem backdrop-filter, abaixo da barra e centralizado no celular", () => {
  const css = read("css/core/global.css");
  const body = ruleBody(css, ".site-settings-popover");
  assert.ok(body, ".site-settings-popover ausente");
  assert.match(body, /position:\s*fixed/);
  assert.match(body, /background-color:\s*var\(--bg-color\)/);
  assert.match(body, /linear-gradient\(var\(--card-bg\), var\(--card-bg\)\)/);
  assert.ok(!/backdrop-filter/.test(body), "painel opaco não usa backdrop-filter");
  assert.match(body, /overflow-y:\s*auto/, "painel rola por dentro em telas baixas");
  assert.match(body, /right:\s*max\(14px, calc\(\(100% - 1120px\) \/ 2\)\)/, "alinha à borda direita do conteúdo da navbar");
  assert.match(css, /@media \(max-width: 767px\)\s*\{\s*\.site-settings-popover\s*\{[^}]*margin-inline:\s*auto/, "celular: centralizado");

  const navbarCss = read("css/core/navbar.css");
  for (const state of ["site-loading-pending", "site-loading-visible", "site-navigation-loading", "site-page-leaving"]) {
    assert.ok(navbarCss.includes(`html.${state} .site-settings-popover`), `painel deve sumir em ${state}`);
  }
});

test("botão: só o ícone, com alvo de toque de 38–40 px e estado ativo com tokens de ação", () => {
  const css = read("css/core/navbar.css");
  const sizes = ruleBodies(css, ".site-settings-toggle").map((body) => body.match(/width:\s*(\d+)px;\s*height:\s*(\d+)px/)?.slice(1, 3).join("x"));
  assert.ok(sizes.includes("40x40"), "desktop: 40x40");
  assert.ok(sizes.includes("38x38"), "celular: 38x38");

  const active = ruleBody(css, '.site-settings-toggle[aria-expanded="true"]');
  assert.ok(active, "estado aberto do botão ausente");
  assert.match(active, /color:\s*var\(--button-text\)/);
  assert.match(active, /background-color:\s*var\(--button-bg\)/);

  const buttons = JSON.parse(read("data/content/buttons.json")).settingsOpen;
  assert.equal(buttons.text, "");
  assert.equal(buttons.icon, "settings");
  assert.ok(buttons.ariaLabel.trim(), "botão só de ícone precisa de ariaLabel");
  assert.ok(
    read("js/core/buttons.js").includes(
      `settingsOpen: { text: "", icon: "settings", ariaLabel: "${buttons.ariaLabel}" }`
    ),
    "buttons.js: fallback deve espelhar buttons.json"
  );
});

test("todas as páginas carregam settings.js depois do navbar.js e com o cache-buster atual", () => {
  for (const rel of PAGES) {
    const html = read(rel);
    const prefs = html.indexOf("js/core/preferences.js");
    const overlay = html.indexOf("js/core/mobile-overlay.js");
    const navbar = html.indexOf("js/core/navbar.js");
    const settings = html.indexOf(`js/core/settings.js?v=${SETTINGS_VERSION}`);
    assert.ok(settings >= 0, `${rel}: settings.js ausente`);
    assert.ok(prefs >= 0 && prefs < overlay && overlay < navbar && navbar < settings, `${rel}: ordem preferences → mobile-overlay → navbar → settings`);
    assert.ok(!html.includes("footerSettings"), `${rel}: id antigo footerSettings*`);
  }
});

test("destaque da engrenagem: preenchimento só com o painel aberto; hover só com mouse e só no contorno", () => {
  const css = read("css/core/navbar.css").replace(/\/\*[\s\S]*?\*\//g, "");

  // Nenhum estado transitório (hover, foco, toque) pode preencher o botão ou imitar o estado aberto.
  let transient = 0;
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((item) => item.trim());
    const hits = selectors.filter((item) => /\.site-settings-toggle[^,]*:(hover|focus|focus-visible|active)\b/.test(item));
    if (!hits.length) continue;
    transient += 1;
    assert.ok(!/background/.test(match[2]), `${hits[0]}: estado transitório não pode alterar o fundo`);
    assert.ok(!/(^|[;\s])color:\s*var\(--button-text\)/.test(match[2]), `${hits[0]}: estado transitório não pode usar --button-text`);
    assert.ok(!/border-color:\s*var\(--button-bg\)/.test(match[2]), `${hits[0]}: estado transitório não pode usar --button-bg`);
  }
  assert.ok(transient >= 2, "regras de foco e hover da engrenagem ausentes");

  // O único preenchimento do botão vem de aria-expanded="true".
  const filled = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
    (match) => /\.site-settings-toggle/.test(match[1]) && /background-color:\s*var\(--button-bg\)/.test(match[2])
  );
  assert.equal(filled.length, 1, "apenas uma regra pode preencher a engrenagem");
  assert.match(filled[0][1], /\[aria-expanded="true"\]/);

  // Hover só em dispositivos com mouse: o hover "gruda" depois de um toque.
  const hover = css.search(/\.site-settings-toggle:hover/);
  assert.ok(hover > 0, "regra de hover ausente");
  const before = css.slice(0, hover);
  const media = before.lastIndexOf("@media");
  const depth = [...before.slice(media)].reduce((n, ch) => n + (ch === "{" ? 1 : ch === "}" ? -1 : 0), 0);
  assert.ok(media >= 0 && depth >= 1, "hover deve ficar dentro de um @media");
  assert.match(before.slice(media), /^@media \(hover: hover\) and \(pointer: fine\)/);

  // Foco de teclado continua visível (só contorno).
  assert.match(css, /\.site-settings-toggle:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--primary-text\)/);
});

test("todas as páginas carregam navbar.css com o cache-buster da correção do destaque", () => {
  for (const rel of PAGES) {
    assert.ok(read(rel).includes(`css/core/navbar.css?v=${NAVBAR_CSS_VERSION}`), `${rel}: navbar.css?v=${NAVBAR_CSS_VERSION} ausente`);
  }
});
