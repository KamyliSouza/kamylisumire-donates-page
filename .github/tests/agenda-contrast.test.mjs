import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(read('js/pages/agenda/agenda-contrast.js'), sandbox);
const C = sandbox.KamyliAgendaContrast;

/* Imagem cinza uniforme (luminância linear `y`) em RGBA. */
function gray(y, width = 64, height = 32) {
  const value = Math.round((y <= 0.0031308 ? y * 12.92 : 1.055 * y ** (1 / 2.4) - 0.055) * 255);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([value, value, value, 255], i);
  return pixels;
}
const plan = y => C.planCard(gray(y), 64, 32);

test('capa escura usa texto claro sem nenhum véu', () => {
  const result = plan(0.02);
  assert.equal(result.top.tone, 'light');
  assert.equal(result.bottom.tone, 'light');
  assert.equal(result.top.alpha, 0);
  assert.equal(result.bottom.alpha, 0);
});

test('capa clara usa texto escuro sem nenhum véu', () => {
  const result = plan(0.85);
  assert.equal(result.top.tone, 'dark');
  assert.equal(result.top.alpha, 0);
  assert.equal(result.bottom.alpha, 0);
});

test('em qualquer luminância o véu fica pequeno e o contraste atinge o alvo', () => {
  for (let y = 0; y <= 1.0001; y += 0.02) {
    const { top, bottom } = plan(Math.min(1, y));
    for (const region of [top, bottom]) {
      assert.ok(region.met, `luminância ${y.toFixed(2)} não atinge ${C.TARGET_RATIO}:1`);
      assert.ok(region.ratio >= C.TARGET_RATIO);
      assert.ok(region.alpha <= 0.14, `véu de ${region.alpha} em ${y.toFixed(2)} cobre demais a capa`);
    }
  }
});

test('o pior pixel decide: um trecho claro no topo escurece o texto claro', () => {
  const width = 64;
  const height = 32;
  const pixels = gray(0.03, width, height);
  /* 20% da região do topo é branca: a média ainda parece escura. */
  for (let y = 1; y < 11; y += 1) {
    for (let x = 0; x < 13; x += 1) pixels.set([255, 255, 255, 255], (y * width + x) * 4);
  }
  const result = C.planCard(pixels, width, height);
  assert.ok(result.top.tone === 'dark' || result.top.alpha > 0.1);
  assert.equal(result.bottom.tone, 'light');
});

test('sem pixels opacos não há plano (mantém o véu padrão)', () => {
  assert.equal(C.planCard(new Uint8ClampedArray(64 * 32 * 4), 64, 32), null);
});

test('véu nunca passa do teto, mesmo quando o alvo é inalcançável', () => {
  const region = C.minimumVeil(0.21, 'light');
  assert.ok(region.alpha <= C.MAX_VEIL);
});

test('cores de texto do CSS coincidem com as do módulo', () => {
  const css = read('css/pages/agenda.css');
  const hex = rgb => `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
  assert.ok(css.includes(`--ag-card-bottom-platforms: ${hex(C.TONES.light.weakest)}`));
  assert.ok(css.includes(`--ag-card-top-date: ${hex(C.TONES.light.weakest)}`));
  assert.ok(css.includes(`--ag-card-bottom-platforms: ${hex(C.TONES.dark.weakest)}`));
  assert.ok(css.includes(`--ag-card-top-date: ${hex(C.TONES.dark.weakest)}`));
  assert.ok(css.includes(`--ag-veil-top-rgb: ${C.TONES.light.veil.join(', ')}`));
  assert.ok(css.includes(`--ag-veil-top-rgb: ${C.TONES.dark.veil.join(', ')}`));
});

test('CSS adaptativo vale para os dois temas e o véu padrão é leve', () => {
  const css = read('css/pages/agenda.css');
  assert.ok(!/data-theme="light"\]\s+\.agenda-day\.has-live\[data-art/.test(css), 'a adaptação não pode ser só do tema claro');
  assert.match(css, /\[data-art-top-text\]\[data-art-bottom-text\]::after/);
  assert.match(css, /forced-colors: active/);
  for (const [, alpha] of css.matchAll(/rgba\((?:22, 9, 27|255, 247, 255), (\.\d+)\) 100%\)/g)) {
    assert.ok(Number(alpha) <= 0.7, `véu padrão de ${alpha} na base é pesado demais`);
  }
});

test('agenda.js usa o módulo, reanalisa ao redimensionar e preserva o fallback', () => {
  const js = read('js/pages/agenda/agenda.js');
  assert.match(js, /KamyliAgendaContrast/);
  assert.match(js, /ResizeObserver/);
  assert.match(js, /Falha de CORS\/canvas é não crítica/);
  const html = read('agenda/index.html');
  assert.ok(html.indexOf('agenda-model.js') < html.indexOf('agenda-contrast.js'));
  assert.ok(html.indexOf('agenda-contrast.js') < html.indexOf('agenda/agenda.js'));
});

/* ---------- V48.5.2: linhas do modo compacto ---------- */

test('linha compacta: topo e base usam o MESMO plano (texto coerente na faixa)', () => {
  for (const y of [0.02, 0.2, 0.5, 0.85]) {
    const row = C.planRow(gray(y), 64, 32);
    assert.equal(row.top, row.bottom);
    assert.ok(row.top.met, `luminância ${y} não atinge ${C.TARGET_RATIO}:1`);
    assert.ok(row.top.alpha <= 0.14);
  }
});

test('linha compacta: um trecho claro em qualquer ponto da faixa conta (não só no topo)', () => {
  const width = 64;
  const height = 32;
  const pixels = gray(0.03, width, height);
  /* Mancha branca (~23% da faixa) no MEIO, onde estaria o título: o topo do planCard a ignora, o planRow não. */
  for (let y = 10; y < 22; y += 1) {
    for (let x = 16; x < 48; x += 1) pixels.set([255, 255, 255, 255], (y * width + x) * 4);
  }
  const row = C.planRow(pixels, width, height);
  assert.ok(row.top.tone === 'dark' || row.top.alpha > 0.1, 'a mancha clara deveria escurecer o texto claro');
});

test('linha compacta: sem pixels opacos não há plano', () => {
  assert.equal(C.planRow(new Uint8ClampedArray(64 * 32 * 4), 64, 32), null);
});

test('CSS compacto usa véu chapado e o módulo é carregado com versão 48.5.2', () => {
  const css = read('css/pages/agenda.css');
  assert.match(css, /\.agenda-days\.is-compact \.agenda-day\.has-live\[data-art-top-text\]\[data-art-bottom-text\]::after\s*\{\s*background: rgba\(var\(--ag-veil-bottom-rgb\)/);
  assert.match(read('agenda/index.html'), /agenda-contrast\.js\?v=48\.5\.2/);
});
