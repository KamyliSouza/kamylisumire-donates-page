import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const editorial = JSON.parse(read('data/content/jogos-editorial.json'));
const gamesCatalog = JSON.parse(read('data/content/jogos.json'));
const html = read('jogos/index.html');
const js = read('js/pages/jogos/jogos.js');
const css = read('css/pages/jogos.css');

const EDITORIAL_ONLY_FIELDS = [
  'gameId',
  'review',
  'rating',
  'recommendation',
  'containsSpoilers',
  'playlistUrl',
  'episodes',
  'links'
];

test('catálogo editorial é separado e aceita fichas manuais', () => {
  assert.equal(editorial.version, 1);
  assert.ok(Array.isArray(editorial.games), 'games deve ser uma lista');

  const editorialIds = new Set();
  for (const [index, game] of editorial.games.entries()) {
    assert.ok(game && typeof game === 'object' && !Array.isArray(game),
      `games[${index}] deve ser um objeto`);
    assert.match(game.gameId || '', /^[a-f0-9]{24}$/i,
      `games[${index}].gameId deve ser um ID Trello de 24 caracteres`);
    assert.ok(!editorialIds.has(game.gameId),
      `gameId duplicado no catálogo editorial: ${game.gameId}`);
    editorialIds.add(game.gameId);
  }

  assert.equal(gamesCatalog.version, 1);
  assert.ok(Array.isArray(gamesCatalog.games), 'jogos.json deve manter seu catálogo próprio');
  for (const [index, game] of gamesCatalog.games.entries()) {
    for (const field of EDITORIAL_ONLY_FIELDS) {
      assert.equal(Object.hasOwn(game, field), false,
        `jogos.json games[${index}] não deve conter o campo editorial ${field}`);
    }
  }

  assert.match(js, /const EDITORIAL_URL = "\/data\/content\/jogos-editorial\.json";/);
  assert.match(js, /gameId/);
});

test('página oferece modos Pôsteres e Compacto com estado ARIA', () => {
  assert.match(html, /id="jogosViewPoster"[^>]*aria-pressed="true"/);
  assert.match(html, /id="jogosViewCompact"[^>]*aria-pressed="false"/);
  assert.match(js, /function setViewMode\(mode\)/);
  assert.match(js, /const openButton = document\.createElement\("button"\)/);
  assert.match(js, /const title = document\.createElement\("h2"\)/);
  assert.doesNotMatch(js, /role", "heading"/);
  assert.match(js, /article\.append\(media, shade, content, openButton\)/);
  assert.match(js, /function hasEditorialContent/);
  assert.match(js, /classList\.toggle\("is-compact"/);
  assert.match(css, /\.jogos-grid\.is-compact/);
  assert.match(css, /html:has\(\.jogo-dialog\[open\]\)/);
  assert.match(css, /background-color: var\(--bg-color\);\s*background-image: linear-gradient\(var\(--card-bg\)/);
  assert.match(css, /\.jogo-dialog-body \{ display: contents; \}/);
});

test('detalhes usam dialog nativo e restauram o foco ao cartão', () => {
  assert.match(html, /<dialog class="jogo-dialog" id="jogoDialog"/);
  assert.match(html, /id="jogoDialogClose"[^>]*aria-label="Fechar detalhes do jogo"/);
  assert.match(js, /els\.dialog\.showModal\(\)/);
  assert.match(js, /addEventListener\("close"/);
  assert.match(js, /trigger\.focus\(\{ preventScroll: true \}\)/);
  assert.match(js, /event\.target === els\.dialog/);
});

test('review e conteúdo editorial são inseridos como texto, sem HTML executável', () => {
  assert.match(js, /els\.dialogReview\.textContent = review/);
  assert.match(js, /els\.dialogSpoilerReview\.textContent = review/);
  assert.doesNotMatch(js, /innerHTML\s*=/);
  assert.doesNotMatch(html, /<iframe\b/i);
});

test('playlists, vídeos e links adicionais são HTTPS e abrem fora do site', () => {
  assert.match(js, /function safeHttpsUrl/);
  assert.match(js, /youtube\.com/);
  assert.match(js, /rel = "noopener noreferrer"/);
  assert.match(js, /playlist/);
  assert.match(js, /watch\?v=/);
  assert.match(js, /store\.steampowered\.com/);
});

test('catálogo continua sinalizando o loader mesmo quando a carga falha', () => {
  for (const token of [
    'function signalContentReady()',
    'window.KAMYLI_PAGE_CONTENT_READY = true;',
    'new CustomEvent("kamyli:loader-ready"',
    'init().finally(signalContentReady);'
  ]) assert.ok(js.includes(token), `sinal de carregamento ausente: ${token}`);
});

test('popup organiza ações, nota, transmissões e links em blocos previsíveis', () => {
  // Ações externas juntas (Steam, playlist, última transmissão), ao lado da capa.
  assert.match(html, /id="jogoDialogActions"/);
  assert.match(js, /function addDialogAction/);
  assert.match(js, /"Última transmissão\\u00a0↗"/);
  // Resumo derivado dos episódios + lista numerada, recolhida quando longa.
  assert.match(html, /<dl class="jogo-dialog-stats">/);
  assert.match(js, /const EPISODES_COLLAPSED = 5;/);
  assert.match(html, /id="jogoDialogMore"[^>]*aria-expanded="false"[^>]*aria-controls="jogoDialogEpisodes"/);
  assert.match(js, /els\.dialogPanel\.scrollTop = 0/);
  // Nota e recomendação ficam na seção de review, sem repetir o selo no cabeçalho.
  assert.match(html, /id="jogoDialogScore"/);
  assert.doesNotMatch(html, /jogoDialogPlaylistSection|jogoDialogSteamSection/);
  // Linha da transmissão inteira clicável pelo link do título; sem controles aninhados.
  assert.match(css, /\.jogo-dialog-episodes a::after \{\s*content: "";\s*position: absolute;\s*inset: 0;/);
  assert.match(css, /\.jogo-dialog-aside \{\s*position: sticky;/);
});
