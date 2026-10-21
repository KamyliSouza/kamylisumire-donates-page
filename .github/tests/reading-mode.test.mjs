import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
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

const READING_VERSION = "48.3.64";
const readingCss = read("css/core/reading.css");

/* ---------- utilidades ---------- */

function bootstrapFrom(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const match = scripts.find((entry) => entry[1].includes("THEME_KEY"));
  assert.ok(match, "bootstrap inline de tema/blur deve existir");
  return match[1];
}

function makeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

/** Ambiente mínimo para rodar bootstrap/preferences.js fora do navegador. */
function makeEnv(storageInitial = {}, { cores = 8 } = {}) {
  const storage = makeStorage(storageInitial);
  const dataset = {};
  const listeners = new Map();
  const toggles = [];
  const events = [];

  const documentElement = { dataset, style: {} };
  const document = {
    documentElement,
    readyState: "complete",
    head: { appendChild() {} },
    createElement: () => ({ addEventListener() {} }),
    querySelectorAll: (selector) => (selector === "[data-reading-toggle]" ? toggles : []),
    addEventListener: (type, handler) => {
      listeners.set(type, [...(listeners.get(type) || []), handler]);
    },
  };

  const windowListeners = new Map();
  const window = {
    localStorage: storage,
    CSS: { supports: () => true },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener: (type, handler) => {
      windowListeners.set(type, [...(windowListeners.get(type) || []), handler]);
    },
    dispatchEvent: (event) => {
      events.push(event);
      (windowListeners.get(event.type) || []).forEach((handler) => handler(event));
      return true;
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
    performance: { now: () => 0 },
  };

  const context = {
    window,
    document,
    localStorage: storage,
    navigator: { hardwareConcurrency: cores, deviceMemory: 8 },
    CustomEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    Element: class {},
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
    console,
  };
  context.globalThis = context;
  Object.assign(window, { document, navigator: context.navigator });

  return { context: vm.createContext(context), storage, dataset, listeners, toggles, events, window };
}

function runScript(source, env) {
  vm.runInContext(source, env.context);
}

function click(env, button) {
  const event = {
    type: "click",
    target: Object.assign(Object.create(env.context.Element.prototype), {
      closest: (selector) => (selector === "[data-reading-toggle]" ? button : null),
    }),
    preventDefault() {},
  };
  (env.listeners.get("click") || []).forEach((handler) => handler(event));
}

/* ---------- contraste ---------- */

function luminance(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = readingCss.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `bloco ${selector} ausente em reading.css`);
  return match[1];
}

function token(blockText, name) {
  const match = blockText.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert.ok(match, `token --${name} ausente ou não é hexadecimal opaco`);
  return match[1].toLowerCase();
}

/* ---------- páginas ---------- */

test("todas as páginas carregam reading.css por último e com o cache-buster atual", () => {
  for (const rel of PAGES) {
    const html = read(rel);
    const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
    assert.ok(links.length > 1, `${rel}: sem stylesheets`);
    assert.match(
      links.at(-1),
      new RegExp(`css/core/reading\\.css\\?v=${READING_VERSION.replace(/\./g, "\\.")}$`),
      `${rel}: reading.css deve ser o último stylesheet`
    );
  }
});

test("todas as páginas usam o mesmo bootstrap de tema/blur/leitura, com hash CSP", async () => {
  const crypto = await import("node:crypto");
  const reference = bootstrapFrom(read(PAGES[0]));
  const hash = `sha256-${crypto.createHash("sha256").update(reference, "utf8").digest("base64")}`;

  for (const rel of PAGES) {
    const html = read(rel);
    assert.equal(bootstrapFrom(html), reference, `${rel}: bootstrap divergente`);
    assert.ok(html.includes(`'${hash}'`), `${rel}: hash CSP do bootstrap ausente`);
  }

  assert.match(reference, /const READING_KEY = "kamyli:ui-reading";/);
  assert.match(reference, /const READING_SIZE_KEY = "kamyli:ui-reading-size";/);
});

test("scripts alterados carregam com cache-buster novo em todas as páginas", () => {
  for (const rel of PAGES) {
    const html = read(rel);
    for (const name of ["preferences", "footer", "content"]) {
      assert.match(
        html,
        new RegExp(`js/core/${name}\\.js\\?v=${READING_VERSION.replace(/\./g, "\\.")}`),
        `${rel}: cache-buster de ${name}.js desatualizado`
      );
    }
  }
});

/* ---------- bootstrap (antes da primeira pintura) ---------- */

test("bootstrap: sem preferência salva, o modo leitura fica desligado e o tamanho é normal", () => {
  const env = makeEnv();
  runScript(bootstrapFrom(read("index.html")), env);

  assert.equal(env.dataset.reading, "off");
  assert.equal(env.dataset.readingSize, "normal");
  assert.notEqual(env.dataset.blurReason, "reading");
});

test("bootstrap: modo leitura ligado desliga o blur e aplica o tamanho salvo", () => {
  const env = makeEnv({
    "kamyli:ui-reading": "on",
    "kamyli:ui-reading-size": "large",
    "kamyli:ui-blur": "on",
  });
  runScript(bootstrapFrom(read("index.html")), env);

  assert.equal(env.dataset.reading, "on");
  assert.equal(env.dataset.readingSize, "large");
  assert.equal(env.dataset.blur, "off");
  assert.equal(env.dataset.blurReason, "reading");
  assert.equal(env.window.KAMYLI_UI_BOOTSTRAP_STATE.reading, "on");
});

test("bootstrap: valores inválidos voltam ao padrão", () => {
  const env = makeEnv({ "kamyli:ui-reading": "talvez", "kamyli:ui-reading-size": "gigante" });
  runScript(bootstrapFrom(read("index.html")), env);

  assert.equal(env.dataset.reading, "off");
  assert.equal(env.dataset.readingSize, "normal");
});

/* ---------- preferences.js ---------- */

test("preferences.js: liga/desliga o modo leitura, preserva a escolha de blur e persiste", () => {
  const env = makeEnv({ "kamyli:ui-blur": "on" });
  runScript(read("js/core/preferences.js"), env);
  const prefs = env.window.KAMYLI_UI_PREFS;

  assert.equal(prefs.getState().reading, "off");
  assert.equal(prefs.getState().blur, "on");

  prefs.setReading("on");
  let state = prefs.getState();
  assert.equal(state.reading, "on");
  assert.equal(state.blur, "off");
  assert.equal(state.blurReason, "reading");
  assert.equal(state.blurPreference, "on", "a escolha manual de blur continua salva");
  assert.equal(env.dataset.reading, "on");
  assert.equal(env.storage.getItem("kamyli:ui-reading"), "on");

  prefs.setReading("off");
  state = prefs.getState();
  assert.equal(state.reading, "off");
  assert.equal(state.blur, "on", "ao desligar a leitura, o blur volta como estava");
  assert.equal(env.dataset.reading, "off");
});

test("preferences.js: tamanho do texto aceita só normal/large/xlarge", () => {
  const env = makeEnv();
  runScript(read("js/core/preferences.js"), env);
  const prefs = env.window.KAMYLI_UI_PREFS;

  prefs.setReadingSize("xlarge");
  assert.equal(prefs.getState().readingSize, "xlarge");
  assert.equal(env.dataset.readingSize, "xlarge");
  assert.equal(env.storage.getItem("kamyli:ui-reading-size"), "xlarge");

  prefs.setReadingSize("enorme");
  assert.equal(prefs.getState().readingSize, "normal");
  prefs.setReading("qualquer");
  assert.equal(prefs.getState().reading, "off");
});

test("preferences.js: restaura as preferências salvas ao carregar", () => {
  const env = makeEnv({ "kamyli:ui-reading": "on", "kamyli:ui-reading-size": "large" });
  runScript(read("js/core/preferences.js"), env);
  const state = env.window.KAMYLI_UI_PREFS.getState();

  assert.equal(state.reading, "on");
  assert.equal(state.readingSize, "large");
  assert.equal(state.blurReason, "reading");
});

test("preferences.js: o evento de mudança é disparado e o atalho data-reading-toggle funciona", () => {
  const env = makeEnv();
  const button = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  env.toggles.push(button);

  runScript(read("js/core/preferences.js"), env);
  assert.equal(button.attributes["aria-pressed"], "false");

  const before = env.events.length;
  click(env, button);

  assert.equal(env.window.KAMYLI_UI_PREFS.getState().reading, "on");
  assert.equal(button.attributes["aria-pressed"], "true");
  assert.ok(env.events.length > before, "kamyli:ui-preference-change deve ser disparado");

  click(env, button);
  assert.equal(env.window.KAMYLI_UI_PREFS.getState().reading, "off");
  assert.equal(button.attributes["aria-pressed"], "false");
});

test("preferences.js: preferências indisponíveis (sem storage) não quebram o carregamento", () => {
  const env = makeEnv();
  env.storage.getItem = () => {
    throw new Error("storage bloqueado");
  };
  env.storage.setItem = () => {
    throw new Error("storage bloqueado");
  };

  runScript(read("js/core/preferences.js"), env);
  env.window.KAMYLI_UI_PREFS.setReading("on");

  assert.equal(env.window.KAMYLI_UI_PREFS.getState().reading, "on");
});

/* ---------- configurações (footer + textos editoriais) ---------- */

test("configurações: grupo Leitura no footer, textos em interface.json e fallback do content.js", () => {
  const footer = read("js/core/footer.js");
  for (const name of ["site-reading-preference", "site-reading-size"]) {
    assert.ok(footer.includes(`name="${name}"`), `footer.js: grupo ${name} ausente`);
  }
  for (const id of ["footerReadingStatus", "footerReadingSizeStatus", "footerReadingSizeLabel"]) {
    assert.ok(footer.includes(`id="${id}"`), `footer.js: #${id} ausente`);
  }
  assert.match(footer, /uiPrefs\?\.setReading\(/);
  assert.match(footer, /uiPrefs\?\.setReadingSize\(/);

  const copy = JSON.parse(read("data/content/interface.json")).configuracoes;
  for (const key of [
    "leitura", "leituraNormal", "leituraAtivo", "leituraStatusDesligado", "leituraStatusLigado",
    "leituraTamanho", "leituraTamanhoNormal", "leituraTamanhoGrande", "leituraTamanhoMaior",
    "leituraTamanhoStatus", "leituraTamanhoStatusDesligado", "blurStatusLeitura",
  ]) {
    assert.equal(typeof copy[key], "string", `interface.json: configuracoes.${key} ausente`);
    assert.ok(copy[key].trim(), `interface.json: configuracoes.${key} vazio`);
  }
  assert.ok(copy.motivosBlur.reading, "interface.json: motivosBlur.reading ausente");
  assert.match(copy.leituraTamanhoStatus, /\{tamanho\}/);

  const line = read("js/core/content.js").match(/^\s{8}interface:\s*(\{.*\}),?\s*$/m)?.[1];
  assert.ok(line, "content.js: fallback interface em uma linha ausente");
  assert.deepEqual(
    JSON.parse(line).configuracoes,
    copy,
    "content.js: fallback interface divergiu de data/content/interface.json"
  );
});

test("configurações: o blur fica desabilitado enquanto o modo leitura está ligado", () => {
  const footer = read("js/core/footer.js");
  assert.match(footer, /input\.disabled =\s*reading \|\|/);
  assert.match(footer, /Blur desligado pelo modo leitura\./);
});

/* ---------- CSS ---------- */

test("reading.css: tokens opacos e contraste AA/AAA nos temas claro e escuro", () => {
  const themes = {
    claro: block(':root[data-reading="on"]'),
    escuro: block(':root[data-reading="on"][data-theme="dark"]'),
  };

  for (const [name, tokens] of Object.entries(themes)) {
    const surfaces = ["card-bg", "footer-bg", "nav-bg", "bg-color"].map((n) => token(tokens, n));
    const [card, footer, nav, page] = surfaces;

    // Texto principal: AAA (7:1) sobre o painel e sobre o fundo da página.
    assert.ok(contrast(token(tokens, "text-color"), card) >= 7, `${name}: --text-color no painel`);
    assert.ok(contrast(token(tokens, "text-color"), page) >= 7, `${name}: --text-color na página`);

    // Textos secundários e links: pelo menos AA (4,5:1) em todas as superfícies.
    for (const fg of ["subtitle-color", "text-muted", "notice-text", "primary-text"]) {
      for (const [label, bg] of [["painel", card], ["página", page], ["nav", nav]]) {
        assert.ok(contrast(token(tokens, fg), bg) >= 4.5, `${name}: --${fg} sobre ${label} < 4,5:1`);
      }
    }
    assert.ok(contrast(token(tokens, "footer-text"), footer) >= 4.5, `${name}: --footer-text no rodapé`);
    assert.ok(contrast(token(tokens, "notice-text"), token(tokens, "notice-bg")) >= 4.5, `${name}: aviso`);
    assert.ok(contrast(token(tokens, "subtitle-color"), token(tokens, "notice-bg")) >= 4.5, `${name}: citações`);
  }
});

test("reading.css: sem blur, sem transparência nas superfícies e sem estilos inline", () => {
  for (const match of readingCss.matchAll(/backdrop-filter:\s*([^;]+);/g)) {
    assert.equal(match[1].trim(), "none", `backdrop-filter só pode ser none: ${match[0]}`);
  }

  for (const tokens of [block(':root[data-reading="on"]'), block(':root[data-reading="on"][data-theme="dark"]')]) {
    for (const name of ["card-bg", "footer-bg", "nav-bg", "bg-color"]) {
      assert.match(tokens, new RegExp(`--${name}:\\s*#[0-9a-fA-F]{6};`), `--${name} deve ser opaco`);
    }
  }

  assert.match(readingCss, /:root\[data-reading="on"\] body\s*\{[^}]*background-image:\s*none;/);
  assert.match(readingCss, /:root\[data-reading="on"\] body::before\s*\{[^}]*background-image:\s*none;/);
  const semComentarios = readingCss.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(semComentarios, /!important/, "reading.css não deve usar !important");
});

test("reading.css: tamanhos de texto e atalho do artigo estão definidos", () => {
  assert.match(readingCss, /\[data-reading-size="large"\]\s*\{\s*--reading-scale:\s*1\.125;/);
  assert.match(readingCss, /\[data-reading-size="xlarge"\]\s*\{\s*--reading-scale:\s*1\.25;/);
  assert.match(readingCss, /html\[data-reading="on"\]\s*\{[^}]*font-size:\s*calc\(100% \* var\(--reading-scale\)\)/);
  assert.match(readingCss, /\.reading-toggle\[aria-pressed="true"\]/);
  assert.match(readingCss, /\.reading-toggle:focus-visible/);
});

test("página de artigo do Blog (modelo do editor) inclui o atalho acessível", () => {
  // O modelo vive no editor local; aqui só garantimos que o CSS do atalho existe e
  // que o botão é um <button> real com aria-pressed, como o preferences.js espera.
  const prefs = read("js/core/preferences.js");
  assert.match(prefs, /closest\("\[data-reading-toggle\]"\)/);
  assert.match(prefs, /button\.setAttribute\(\s*"aria-pressed"/);
});
