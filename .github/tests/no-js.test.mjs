import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const NOTICE = "Este site precisa de JavaScript. Ative-o no navegador e recarregue a página.";
const JS_PAGES = ["index.html", "agenda/index.html", "jogos/index.html", "artes/index.html", "blog/index.html", "privacidade/index.html", "uso-de-ia/index.html", "404.html"];
const noscriptStyle = (html) => [...html.matchAll(/<noscript>\s*<style>([\s\S]*?)<\/style>\s*<\/noscript>/g)].map((m) => m[1]);

for (const rel of JS_PAGES) {
  test(`${rel}: sem JavaScript esconde o conteúdo e mostra só o aviso curto`, () => {
    const html = read(rel);
    const styles = noscriptStyle(html);
    assert.equal(styles.length, 1);
    assert.match(styles[0], /main,\s*#site-footer\s*\{\s*display: none !important;/);
    assert.match(styles[0], /\.no-js-notice\s*\{/);
    const notices = [...html.matchAll(/<noscript>\s*<p class="no-js-notice" role="alert">([^<]*)<\/p>\s*<\/noscript>/g)].map((m) => m[1]);
    assert.deepEqual(notices, [NOTICE]);
  });
}

test("doacoes: carrega sem JavaScript, mas sem o ranking e sem o aviso", () => {
  const html = read("doacoes/index.html");
  const [style] = noscriptStyle(html);
  assert.match(style, /\.ranking-card\s*\{\s*display: none !important;/);
  assert.doesNotMatch(style, /main/);
  assert.ok(!html.includes("no-js-notice"));
  // os links de apoio continuam estáticos no HTML
  assert.ok(html.includes('href="https://livepix.gg/kamyli"') && html.includes('href="https://pixie.gg/kamyli"'));
});

test("o hash CSP de cada <noscript><style> bate com o conteúdo", async () => {
  const { createHash } = await import("node:crypto");
  for (const rel of [...JS_PAGES, "doacoes/index.html"]) {
    const html = read(rel);
    const csp = /Content-Security-Policy"\s+content="([^"]+)"/.exec(html)[1];
    const [style] = noscriptStyle(html);
    const hash = `'sha256-${createHash("sha256").update(style).digest("base64")}'`;
    assert.ok(csp.includes(hash), `${rel}: hash do noscript ausente da CSP`);
  }
});
