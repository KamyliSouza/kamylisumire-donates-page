import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Executa js/core/view-mode.js com um localStorage simulado. */
function load({ initial = {}, throwing = false } = {}) {
  const data = new Map(Object.entries(initial));
  const localStorage = throwing
    ? { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } }
    : { getItem: (key) => (data.has(key) ? data.get(key) : null), setItem: (key, value) => data.set(key, String(value)) };
  const window = {};
  vm.runInNewContext(read("js/core/view-mode.js"), { window, localStorage });
  return { api: window.KAMYLI_VIEW_MODE, data };
}

test("sem preferência salva, cada página usa o seu modo padrão", () => {
  const { api } = load();
  assert.equal(api.get("agenda"), "standard");
  assert.equal(api.get("jogos"), "poster");
});

test("a escolha é salva por página, em chaves separadas", () => {
  const { api, data } = load();
  assert.equal(api.set("agenda", "compact"), "compact");
  assert.equal(data.get("kamyli:ui-view-agenda"), "compact");
  assert.equal(api.get("agenda"), "compact");
  assert.equal(api.get("jogos"), "poster", "Jogos não muda quando só a Agenda muda");
  api.set("jogos", "compact");
  assert.equal(data.get("kamyli:ui-view-jogos"), "compact");
  api.set("agenda", "standard");
  assert.equal(api.get("agenda"), "standard");
  assert.equal(api.get("jogos"), "compact");
});

test("a preferência salva é restaurada numa nova visita", () => {
  const { api } = load({ initial: { "kamyli:ui-view-agenda": "compact", "kamyli:ui-view-jogos": "compact" } });
  assert.equal(api.get("agenda"), "compact");
  assert.equal(api.get("jogos"), "compact");
});

test("valores inválidos ou de outra página são ignorados", () => {
  const { api, data } = load({ initial: { "kamyli:ui-view-agenda": "poster", "kamyli:ui-view-jogos": "<b>x</b>" } });
  assert.equal(api.get("agenda"), "standard", "'poster' não é modo da Agenda");
  assert.equal(api.get("jogos"), "poster");
  assert.equal(api.set("agenda", "poster"), "standard");
  assert.equal(data.get("kamyli:ui-view-agenda"), "poster", "valor inválido não sobrescreve o que já estava salvo");
  assert.equal(api.get("blog"), null);
  assert.equal(api.set("blog", "compact"), null);
});

test("sem localStorage (modo privado/bloqueio) não quebra e usa o padrão", () => {
  const { api } = load({ throwing: true });
  assert.equal(api.get("agenda"), "standard");
  assert.equal(api.set("agenda", "compact"), "compact");
});

for (const [page, script, buttons, version] of [
  ["agenda", "js/pages/agenda/agenda.js", ["agendaViewStandard", "agendaViewCompact"], "48.6.0"],
  ["jogos", "js/pages/jogos/jogos.js", ["jogosViewPoster", "jogosViewCompact"], "48.6.0"],
]) {
  test(`${page}: página lê e salva a preferência e carrega o módulo antes do script da página`, () => {
    const html = read(`${page}/index.html`);
    const js = read(script);
    assert.ok(html.indexOf("js/core/view-mode.js?v=48.5.2") > -1);
    assert.ok(html.lastIndexOf("js/core/view-mode.js?v=48.5.2") < html.lastIndexOf(`${script}?v=${version}`));
    for (const id of buttons) assert.match(html, new RegExp(`id="${id}" type="button" aria-pressed="(true|false)"`));
    assert.ok(js.includes(`viewPrefs?.get("${page}")`));
    assert.ok(js.includes(`viewPrefs?.set("${page}", `));
    assert.ok(js.includes("window.KAMYLI_VIEW_MODE"));
  });
}

test("agenda compacta: arte só numa faixa (sem análise de contraste), sem descrição, só textContent", () => {
  const js = read("js/pages/agenda/agenda.js");
  assert.match(js, /if \(day\.hasLive && day\.art\.length\)/);
  assert.match(js, /onLoad: compact \? null : image => analyzeCardArtwork\(image, card\)/);
  assert.match(js, /!compact && live\.description/);
  assert.doesNotMatch(js, /planRow|is-row/, "o plano de faixa inteira foi substituído pela faixa de arte");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML/);
  const css = read("css/pages/agenda.css");
  assert.match(css, /\.agenda-days\.is-compact \.agenda-day-art \{[^}]*mask-image: linear-gradient\(90deg, transparent 0%, #000 62%\)/);
  assert.match(css, /grid-template-columns: minmax\(130px, 190px\) minmax\(0, 1fr\) var\(--row-art-w\)/);
});

test("a política de privacidade cita o modo de visualização salvo", () => {
  assert.match(read("privacidade/index.html"), /modo de visualização \(padrão ou compacto\)/);
});
