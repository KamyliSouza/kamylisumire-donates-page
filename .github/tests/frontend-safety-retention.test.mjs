import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

function loadSanitize() {
  const window = { location: { href: "https://kamylisumire.com/" } };
  const context = vm.createContext({ window, URL, Set, String, Object });
  vm.runInContext(read("js/core/sanitize.js"), context);
  return window.KamyliSanitize;
}

test("safeHttpUrl rejeita protocolos ativos e aplica allowlist de host", () => {
  const sanitize = loadSanitize();
  assert.equal(sanitize.safeHttpUrl("javascript:alert(1)"), "");
  assert.equal(sanitize.safeHttpUrl("data:text/html,oi"), "");
  assert.equal(
    sanitize.safeHttpUrl("https://www.twitch.tv/videos/123", {
      httpsOnly: true,
      allowedHosts: ["www.twitch.tv", "twitch.tv"],
    }),
    "https://www.twitch.tv/videos/123",
  );
  assert.equal(
    sanitize.safeHttpUrl("https://evil.example/?next=https://www.twitch.tv/", {
      httpsOnly: true,
      allowedHosts: ["www.twitch.tv", "twitch.tv"],
    }),
    "",
  );
  assert.equal(
    sanitize.safeHttpUrl("http://www.twitch.tv/videos/123", {
      httpsOnly: true,
      allowedHosts: ["www.twitch.tv", "twitch.tv"],
    }),
    "",
  );
});

test("Créditos, Steam e Twitch validam href antes da atribuição", () => {
  const home = read("js/pages/home/content.js");
  const jogos = read("js/pages/jogos/jogos.js");
  const lives = read("js/pages/home/lives.js");
  const liveHero = read("js/pages/home/twitch-live.js");

  assert.match(home, /const url = safeHttpUrl\(item\.url\);/);
  assert.match(jogos, /allowedHosts: \["store\.steampowered\.com"\]/);
  assert.doesNotMatch(jogos, /steamLink\.href\s*=\s*game\.steamUrl/);
  assert.match(lives, /allowedHosts: \["www\.twitch\.tv", "twitch\.tv"\]/);
  assert.match(liveHero, /allowedHosts: \["www\.twitch\.tv", "twitch\.tv"\]/);
});

test("gerenciador global mantém TTL de 30 minutos e cobre retomada da página", () => {
  const prefs = read("js/core/preferences.js");
  const ranking = read("js/pages/doacoes/ranking.js");

  assert.match(prefs, /RANKING_CACHE_TTL_MS = 30 \* 60 \* 1000/);
  assert.match(prefs, /function scheduleRankingCacheRetention\(\)/);
  assert.match(prefs, /setTimeout\(\s*removeRankingCache,\s*remaining\s*\)/);
  assert.match(prefs, /window\.addEventListener\("focus", scheduleRankingCacheRetention\)/);
  assert.match(prefs, /window\.addEventListener\("pageshow", scheduleRankingCacheRetention\)/);
  assert.match(prefs, /document\.addEventListener\("visibilitychange"/);
  assert.match(prefs, /event\.key === RANKING_CACHE_KEY/);
  assert.match(ranking, /window\.dispatchEvent\(new Event\(RANKING_CACHE_EVENT\)\);/);
});

test("todas as páginas carregam o gerenciador global e a versão nova do sanitizer", () => {
  const pages = [
    "index.html", "404.html", "doacoes/index.html", "artes/index.html",
    "blog/index.html", "jogos/index.html", "privacidade/index.html", "uso-de-ia/index.html",
  ];

  for (const path of pages) {
    const html = read(path);
    assert.match(html, /js\/core\/preferences\.js\?v=48\.3\.60/);
    assert.match(html, /js\/core\/sanitize\.js\?v=48\.3\.60/);
  }
});
