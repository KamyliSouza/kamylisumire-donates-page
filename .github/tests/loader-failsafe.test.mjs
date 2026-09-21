import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HTML_FILES = [
  "index.html",
  "404.html",
  "doacoes/index.html",
  "artes/index.html",
  "blog/index.html",
  "jogos/index.html",
  "privacidade/index.html",
  "uso-de-ia/index.html"
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function bootstrapFrom(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const match = scripts.find((entry) => entry[1].includes("KAMYLI_LOADER_STARTED_AT"));
  assert.ok(match, "bootstrap inline do loader deve existir");
  return match[1];
}

function cspHash(source) {
  return `sha256-${crypto.createHash("sha256").update(source, "utf8").digest("base64")}`;
}

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    values
  };
}

test("todas as páginas usam o mesmo bootstrap fail-safe e hash CSP válido", () => {
  const reference = bootstrapFrom(read(HTML_FILES[0]));
  const expectedHash = cspHash(reference);

  for (const rel of HTML_FILES) {
    const html = read(rel);
    assert.equal(bootstrapFrom(html), reference, `${rel}: bootstrap divergente`);
    assert.match(html, /loader\.js\?v=48\.3\.57/);
    assert.ok(html.includes(`'${expectedHash}'`), `${rel}: hash CSP do bootstrap ausente`);
  }
});

test("fail-safe libera interface e scroll lógico após 6 segundos sem loader.js", () => {
  const source = bootstrapFrom(read("index.html"));
  const rootClassList = makeClassList([
    "site-page-arriving",
    "site-page-delay",
    "site-page-leaving",
    "site-revealing"
  ]);
  const loaderClassList = makeClassList();
  const loaderAttrs = new Map();
  let scheduled = null;

  const root = { classList: rootClassList, dataset: { pageTransition: "internal", blurPreparing: "1" } };
  const loader = {
    classList: loaderClassList,
    setAttribute(name, value) { loaderAttrs.set(name, value); }
  };
  const windowObject = {
    setTimeout(callback, delay) {
      scheduled = { callback, delay };
      return 77;
    }
  };

  vm.runInNewContext(source, {
    document: {
      documentElement: root,
      getElementById(id) { return id === "site-loader" ? loader : null; }
    },
    performance: { now: () => 123 },
    window: windowObject
  });

  assert.equal(windowObject.KAMYLI_LOADER_STARTED_AT, 123);
  assert.equal(windowObject.KAMYLI_LOADER_FAILSAFE_TIMER, 77);
  assert.equal(scheduled?.delay, 6000);
  assert.equal(rootClassList.contains("site-loading-pending"), true);

  scheduled.callback();

  for (const name of [
    "site-loading-pending",
    "site-loading-visible",
    "site-navigation-loading",
    "site-page-arriving",
    "site-page-delay",
    "site-page-leaving",
    "site-revealing"
  ]) {
    assert.equal(rootClassList.contains(name), false, `${name} deve ser removida`);
  }
  assert.equal(rootClassList.contains("site-ready"), true);
  assert.equal(root.dataset.pageTransition, undefined);
  assert.equal(root.dataset.blurPreparing, undefined);
  assert.equal(loaderAttrs.get("aria-hidden"), "true");
  assert.equal(loaderClassList.contains("is-leaving"), true);
  assert.equal(windowObject.KAMYLI_LOADER_FAILSAFE_FIRED, true);
  assert.equal(windowObject.KAMYLI_LOADER_FAILSAFE_TIMER, null);
});

test("loader normal cancela o fail-safe e usa mínimo inicial reduzido", () => {
  const loader = read("js/core/loader.js");
  assert.match(loader, /const INITIAL_MIN_DISPLAY_MS = 320;/);
  assert.match(loader, /const INITIAL_MAX_WAIT_MS = 2500;/);
  assert.match(loader, /function clearInitialFailsafe\(\)/);
  assert.match(loader, /clearInitialFailsafe\(\);/);
  assert.match(loader, /KAMYLI_LOADER_FAILSAFE_FIRED === true/);
  assert.match(loader, /loaderTimingVersion = "48\.3\.57"/);
  assert.doesNotMatch(loader, /const INITIAL_MIN_DISPLAY_MS = 500;/);
});
