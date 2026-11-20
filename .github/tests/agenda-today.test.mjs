import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Home: destaque do dia atual é calculado no aparelho, refeito na virada do dia e acessível', () => {
  const js = read('js/pages/home/home.js');
  assert.match(js, /function localIsoDate\(/);
  assert.match(js, /date\.getFullYear\(\)/, 'usa a data local do visitante, não UTC');
  assert.doesNotMatch(js, /toISOString\(\)\.slice\(0, 10\)/, 'toISOString usaria UTC e erraria o dia à noite no Brasil');
  assert.match(js, /card\.dataset\.date = dia\.data/);
  assert.match(js, /classList\.toggle\("is-today", isToday\)/);
  assert.match(js, /setAttribute\("aria-current", "date"\)/);
  assert.match(js, /" \(hoje\)"/);
  assert.match(js, /document\.addEventListener\("visibilitychange"/);
  assert.match(js, /agendaGrid\.replaceChildren\(fragment\);\s*markAgendaToday\(\);/);
});

test('Home: CSS do dia atual é independente da borda de has-live e respeita alto contraste', () => {
  const css = read('css/pages/home.css');
  assert.match(css, /\.agenda-card\.is-today\s*\{/);
  assert.match(css, /\.agenda-card\.is-today \.agenda-date\s*\{[^}]*background-color:\s*var\(--primary-soft\)/s);
  assert.match(css, /@media \(forced-colors: active\)\s*\{\s*\.agenda-card\.is-today \.agenda-date/);
  assert.doesNotMatch(css.match(/\.agenda-card\.is-today\s*\{[^}]*\}/s)[0], /border/, 'não pode competir com a borda das lives');
});

test('Home: o carrossel rola sozinho até o card de hoje só na abertura e respeita a interação', () => {
  const js = read('js/pages/home/home.js');
  assert.match(js, /function scrollAgendaToToday\(/);
  assert.match(js, /renderAgenda[\s\S]*agendaCarousel\?\.refresh\(\);\s*scrollAgendaToToday\(\);/);
  assert.match(js, /\["pointerdown", "wheel", "touchstart", "keydown"\]/, 'para ao interagir');
  assert.match(js, /setTimeout\(stopAgendaTodayScroll, \d+\)/, 'tem limite de tempo');
});

test('Página /agenda/: cores do painel seguem o tema claro/escuro do site', () => {
  const css = read('css/pages/agenda.css');
  assert.match(css, /\.agenda-panel\s*\{\s*--ag-sh: 0, 0, 0;/, 'escuro continua como padrão histórico');
  assert.match(css, /:root\[data-theme="light"\] \.agenda-panel\s*\{/);
  assert.match(css, /@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-theme\]\) \.agenda-panel/);
  assert.doesNotMatch(css.slice(css.indexOf('/* ---------- Painel')), /#(?:fff|17131b|211825|f0dcef|e0d3e3)\b/i, 'sem cores escuras fixas fora das variáveis');
});

