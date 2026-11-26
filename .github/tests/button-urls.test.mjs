import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const buttons = JSON.parse(read("data/content/buttons.json"));
const buttonsJs = read("js/core/buttons.js");
const validator = read(".github/scripts/validate-content.py");

const listIn = (source, pattern) => {
  const match = source.match(pattern);
  assert.ok(match, `lista não encontrada: ${pattern}`);
  return [...match[1].matchAll(/"([A-Za-z]+)"/g)].map((m) => m[1]).sort();
};

test("botões com link configurável: JS, validador e buttons.json concordam", () => {
  const inJs = listIn(buttonsJs, /const URL_KEYS = Object\.freeze\(\[([^\]]*)\]\)/);
  const inValidator = listIn(validator, /BUTTON_URL_KEYS = \{([^}]*)\}/);
  assert.deepEqual(inJs, inValidator);
  const withUrl = Object.entries(buttons).filter(([, entry]) => "url" in entry).map(([key]) => key).sort();
  for (const key of withUrl) assert.ok(inJs.includes(key), `${key} tem url mas não está em URL_KEYS`);
});

test("urls em buttons.json são caminho do site (/...) ou http(s), sem espaços", () => {
  for (const [key, entry] of Object.entries(buttons)) {
    if (!("url" in entry)) continue;
    assert.equal(typeof entry.url, "string", key);
    assert.match(entry.url, /^(\/(?!\/)|https?:\/\/)\S*$/, `${key}: ${entry.url}`);
  }
});

test("Hero: o botão Apoie virou o botão da Agenda, com o ícone de calendário (SVG da biblioteca)", () => {
  const html = read("index.html");
  assert.match(html, /id="heroAgendaButton" data-button-key="heroAgenda" href="agenda\/"/);
  assert.doesNotMatch(html, /heroSupport/);
  assert.deepEqual(buttons.heroAgenda, { text: "Agenda", icon: "calendar", url: "/agenda/" });
  assert.ok(!("heroSupport" in buttons));
  assert.match(read("js/core/button-icons.js"), /calendar: \[\s*\["rect"/);
});

test("buttons.js só aceita http(s) ou /caminho e protege o href que o Hero ao vivo troca", () => {
  assert.match(buttonsJs, /raw\.startsWith\("\/"\) && !raw\.startsWith\("\/\/"\)/);
  assert.match(buttonsJs, /parsed\.protocol === "https:" \|\| parsed\.protocol === "http:"/);
  assert.match(buttonsJs, /button\.dataset\.liveOverride === "true"/);
  assert.match(buttonsJs, /button\.dataset\.buttonUrl = href/);
  assert.doesNotMatch(buttonsJs, /innerHTML/);
});

test("twitch-live.js usa o canal de lives.json e devolve o link configurado fora do ar", () => {
  const js = read("js/pages/home/twitch-live.js");
  assert.match(js, /api\.getJSON\("\/data\/content\/lives\.json"\)/);
  assert.match(js, /data\?\.twitchCanalUrl/);
  assert.match(js, /heroLiveAnchor\.dataset\.liveOverride = "true"/);
  assert.match(js, /delete heroLiveAnchor\.dataset\.liveOverride/);
  assert.match(js, /heroLiveAnchor\.dataset\.buttonUrl \|\| defaultHeroLiveUrl/);
  assert.doesNotMatch(js, /DEFAULT_TWITCH_URL/);
});
