import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const exists = path => existsSync(new URL(path, root));

test("a página independente de transmissão e seus arquivos não existem", () => {
  for (const path of [
    "live/",
    "live/index.html",
    "css/pages/live.css",
    "js/pages/live/",
    ".github/tests/live-page.test.mjs",
  ]) {
    assert.equal(exists(path), false, `${path} não deve fazer parte do site`);
  }
});

test("nenhuma página pública oferece embeds de Twitch ou YouTube", () => {
  const pages = [
    "index.html", "404.html", "agenda/index.html", "artes/index.html",
    "blog/index.html", "doacoes/index.html", "jogos/index.html",
    "privacidade/index.html", "uso-de-ia/index.html",
  ];
  const embedPatterns = [
    /<iframe\b/i,
    /player\.twitch\.tv/i,
    /twitch\.tv\/embed\//i,
    /youtube-nocookie\.com\/embed/i,
    /youtube\.com\/live_chat/i,
    /youtube\.com\/iframe_api/i,
  ];
  for (const path of pages) {
    const html = read(path);
    for (const pattern of embedPatterns) {
      assert.equal(pattern.test(html), false, `${path}: embed detectado (${pattern})`);
    }
  }
  const frontend = [
    "js/pages/home/lives.js",
    "js/pages/home/twitch-live.js",
    "index.html",
  ].map(read).join("\n");
  for (const pattern of embedPatterns.slice(1)) {
    assert.equal(pattern.test(frontend), false, `frontend: embed detectado (${pattern})`);
  }
});

test("sitemap e política de privacidade refletem a remoção", () => {
  const sitemap = read("sitemap.xml");
  const privacy = read("privacidade/index.html");
  assert.doesNotMatch(sitemap, /https:\/\/kamylisumire\.com\/live\//);
  assert.match(privacy, /No momento, o site não incorpora player nem chat oficiais[\s\S]*?YouTube\./);
  assert.doesNotMatch(privacy, /Carregar a transmissão|player e o chat oficiais da Twitch são carregados/i);
  assert.doesNotMatch(privacy, /kamyli:live-|Compacto, Amplo ou Teatro|última plataforma escolhida/i);
});

test("Lives e status ao vivo da Home permanecem ativos", () => {
  const lives = read("js/pages/home/lives.js");
  const hero = read("js/pages/home/twitch-live.js");
  const model = read("data/content/lives.json");
  assert.match(lives, /data\/content\/lives\.json/);
  assert.match(lives, /twitch\.tv/);
  assert.match(hero, /\/twitch\/live/);
  assert.match(model, /youtube/i);
  assert.match(model, /twitch/i);
});
