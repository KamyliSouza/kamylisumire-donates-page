import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const pages = new Map([
  ['index.html', 'conteudo'],
  ['doacoes/index.html', 'conteudo'],
  ['artes/index.html', 'artesPage'],
  ['blog/index.html', 'blogIndexPage'],
  ['jogos/index.html', 'jogosPage'],
  ['privacidade/index.html', 'conteudo'],
  ['uso-de-ia/index.html', 'conteudo'],
  ['404.html', 'conteudo'],
]);

test('todas as páginas oferecem Pular para o conteúdo com alvo focável no main', () => {
  for (const [path, targetId] of pages) {
    const html = read(path);
    assert.match(
      html,
      new RegExp(`<a class="skip-link" href="#${targetId}">Pular para o conteúdo<\\/a>`),
      `${path}: skip link ausente ou apontando para alvo incorreto`,
    );
    const mainTag = html.match(new RegExp(`<main[^>]*id="${targetId}"[^>]*>`))?.[0] || '';
    assert.ok(mainTag, `${path}: main alvo do skip link ausente`);
    assert.match(mainTag, /tabindex="-1"/, `${path}: main alvo precisa aceitar foco programático`);
  }
});

test('skip link permanece invisível fora do foco e usa tokens acessíveis de ação', () => {
  const css = read('css/core/global.css');
  assert.match(css, /\.skip-link\s*\{/);
  assert.match(css, /transform:\s*translateY\(calc\(-100% - 32px\)\)/);
  assert.match(css, /\.skip-link:focus[\s\S]*transform:\s*translateY\(0\)/);
  assert.match(css, /color:\s*var\(--button-text\)/);
  assert.match(css, /background-color:\s*var\(--button-bg\)/);
  assert.match(css, /\.sr-only\s*\{/);
});

test('grades de Artes e Jogos não são regiões live inteiras', () => {
  const artes = read('artes/index.html');
  const jogos = read('jogos/index.html');

  const artesGrid = artes.match(/<section class="artes-grid"[^>]*>/)?.[0] || '';
  const jogosGrid = jogos.match(/<section class="jogos-grid"[^>]*>/)?.[0] || '';
  assert.ok(artesGrid && jogosGrid, 'grades de Artes/Jogos devem existir');
  assert.doesNotMatch(artesGrid, /aria-live=/);
  assert.doesNotMatch(jogosGrid, /aria-live=/);

  assert.match(artes, /id="artesResultsStatus" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(jogos, /id="jogosResultsStatus" role="status" aria-live="polite" aria-atomic="true"/);
});

test('filtros anunciam somente uma contagem curta de resultados', () => {
  const artes = read('js/pages/artes/artes.js');
  const jogos = read('js/pages/jogos/jogos.js');

  assert.match(artes, /function announceResultCount\(count\)/);
  assert.match(artes, /`\$\{count\} artes encontradas\.`/);
  assert.match(artes, /announceResultCount\(visible\)/);

  assert.match(jogos, /function announceResultCount\(count\)/);
  assert.match(jogos, /`\$\{count\} jogos encontrados\.`/);
  assert.match(jogos, /announceResultCount\(games\.length\)/);
});
