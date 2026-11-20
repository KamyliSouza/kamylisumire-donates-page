import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PAGES = [
  'index.html', '404.html', 'doacoes/index.html', 'blog/index.html', 'artes/index.html',
  'jogos/index.html', 'agenda/index.html', 'privacidade/index.html', 'uso-de-ia/index.html'
];
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

/*
 * V48.3.70: com a CSP em <meta>, o Chromium não descobre os scripts do fim do body
 * antes da hora e os baixa em série (medido: Home ~1,8 s -> ~0,8 s com 80 ms de
 * latência). Cada página precisa pré-carregar exatamente os seus scripts locais.
 */
for (const page of PAGES) {
  test(`${page}: preload de script em sincronia com os scripts da página`, () => {
    const html = read(page);
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
    const preloads = [...html.matchAll(/<link rel="preload" as="script" href="([^"]+)">/g)].map(m => m[1]);
    assert.ok(scripts.length > 0);
    assert.deepEqual(preloads, scripts);
    const firstPreload = html.indexOf('rel="preload" as="script"');
    const firstScript = html.indexOf('<script src=');
    assert.ok(firstPreload > -1 && firstPreload < firstScript, 'preloads devem ficar no head, antes dos scripts');
    assert.ok(firstPreload < html.indexOf('<body'), 'preloads devem ficar no head');
  });
}
