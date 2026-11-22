import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function loadModel() {
  const sandbox = { URL, URLSearchParams, Intl };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('js/pages/live/live-model.js'), sandbox);
  return sandbox.KamyliLiveModel;
}
const model = loadModel();

test('host: aceita domínios e localhost, recusa lixo e injeção', () => {
  assert.equal(model.normalizeHost('KamyliSumire.com'), 'kamylisumire.com');
  assert.equal(model.normalizeHost('localhost'), 'localhost');
  assert.equal(model.normalizeHost('kamylisouza.github.io'), 'kamylisouza.github.io');
  for (const bad of ['', null, 'a b', 'x.com&parent=evil.com', 'x.com/path', '-x.com', 'x.com-', '[::1]']) {
    assert.equal(model.normalizeHost(bad), null, String(bad));
  }
});

test('Twitch: player e chat usam URLs oficiais e parent correspondente ao host', () => {
  const player = new URL(model.twitchPlayerUrl('kamylisumire.com'));
  assert.equal(player.origin, 'https://player.twitch.tv');
  assert.equal(player.searchParams.get('channel'), 'kamyli');
  assert.equal(player.searchParams.get('parent'), 'kamylisumire.com');
  const chat = new URL(model.twitchChatUrl('kamylisumire.com', { dark: true }));
  assert.equal(chat.origin + chat.pathname, 'https://www.twitch.tv/embed/kamyli/chat');
  assert.equal(chat.searchParams.get('parent'), 'kamylisumire.com');
  assert.ok(chat.search.includes('darkpopout'));
  assert.ok(!new URL(model.twitchChatUrl('kamylisumire.com')).search.includes('darkpopout'));
  assert.equal(model.twitchPlayerUrl('x y'), null);
  assert.equal(model.twitchChatUrl(''), null);
});

test('Twitch: player só pode ser incorporado com largura mínima de 400 px', () => {
  assert.equal(model.canEmbedTwitch(400, 300), true);
  assert.equal(model.canEmbedTwitch(400.5, 300.5), true);
  assert.equal(model.canEmbedTwitch(399.99, 300), false);
  assert.equal(model.canEmbedTwitch(400, 299.99), false);
  assert.equal(model.canEmbedTwitch(0, 300), false);
  assert.equal(model.canEmbedTwitch(Number.NaN, 300), false);
  assert.equal(model.canEmbedTwitch('390', 300), false);
});

test('YouTube: a aba mantém somente o link externo do canal ao vivo', () => {
  assert.equal(model.EXTERNAL_URL.youtube, 'https://www.youtube.com/channel/UCkhjq3nJqlv5GrBgNRwIBFw/live');
  assert.equal(model.pickPlatform('youtube'), 'youtube');
});

test('YouTube: código da página não usa player, chat ou API incorporados', () => {
  const html = read('live/index.html');
  const js = read('js/pages/live/live.js');
  const modelJs = read('js/pages/live/live-model.js');
  assert.ok(html.includes('Abrir transmissão no YouTube'));
  assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(!/youtube-nocookie\.com|youtube\.com\/iframe_api|youtube\.com\/live_chat/i.test(html + js + modelJs));
  assert.ok(!/getVideoData|YT\.Player|live_stream\?channel=/i.test(js + modelJs));
  assert.ok(!/createElement\(["']iframe["']\)[\s\S]{0,300}youtube/i.test(js));
});

test('espectadores: singular, plural e arredondamento seguro', () => {
  assert.equal(model.formatViewers(1), '1 espectador');
  assert.equal(model.formatViewers(0), '0 espectadores');
  assert.equal(model.formatViewers(1234), '1.234 espectadores');
  assert.equal(model.formatViewers(-5), '0 espectadores');
  assert.equal(model.formatViewers('x'), '0 espectadores');
});

test('status da Twitch: só available+live conta como ao vivo', () => {
  const live = model.twitchStatus({ available: true, live: true, viewerCount: 42, title: ' Oi ', gameName: 'Jogo' });
  assert.deepEqual(JSON.parse(JSON.stringify(live)), { live: true, known: true, viewers: 42, title: 'Oi', game: 'Jogo' });
  assert.equal(model.twitchStatus({ available: true, live: false }).live, false);
  assert.equal(model.twitchStatus({ available: false, live: true }).live, false);
  assert.equal(model.twitchStatus({ available: false, live: true }).known, false);
  assert.equal(model.twitchStatus(null).live, false);
});

test('jogo e título: só com a Twitch ao vivo, limpos e limitados', () => {
  const live = { live: true, game: ' Jogo   X ', title: 'T'.repeat(300) };
  const now = model.nowPlaying(live);
  assert.equal(now.game, 'Jogo X');
  assert.equal(now.title.length, 140);
  assert.deepEqual(JSON.parse(JSON.stringify(model.nowPlaying({ live: true, game: '', title: 'Só título' }))), { game: '', title: 'Só título' });
  assert.equal(model.nowPlaying({ live: true, game: '', title: '' }), null);
  assert.equal(model.nowPlaying({ live: false, game: 'X', title: 'Y' }), null);
  assert.equal(model.nowPlaying(null), null);
});

test('jogo e título entram como texto, nunca como HTML', () => {
  const js = read('js/pages/live/live.js');
  assert.ok(js.includes('now.game.textContent') && js.includes('now.title.textContent'));
  assert.ok(!/innerHTML|insertAdjacentHTML/.test(js));
});

test('termos da Twitch: dimensões, player fixo no mobile e sem sobreposição', () => {
  const css = read('css/pages/live.css');
  assert.ok(/aspect-ratio: 16 \/ 9; min-height: 302px;/.test(css));
  assert.ok(/position: sticky/.test(css));
  assert.ok(/body:has\(#livePage\) \.site-socials-mobile \{ display: none; \}/.test(css));
  const js = read('js/pages/live/live.js');
  assert.ok(js.includes('model.canEmbedTwitch(playerSlot.clientWidth, playerSlot.clientHeight)'));
});

test('privacidade descreve Twitch incorporada e YouTube como link externo', () => {
  const html = read('privacidade/index.html').replace(/\s+/g, ' ');
  assert.ok(html.includes('player e o chat oficiais da Twitch'));
  assert.ok(html.includes('A aba YouTube não'));
  assert.ok(html.includes('não incorpora player, chat nem carrega código de API do YouTube'));
});

test('modos de exibição: valores válidos e padrão seguro', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(model.VIEWS)), ['compact', 'wide', 'theatre']);
  assert.equal(model.pickView('theatre'), 'theatre');
  assert.equal(model.pickView('compact'), 'compact');
  assert.equal(model.pickView('wide'), 'wide');
  assert.equal(model.pickView('x'), 'compact');
  assert.equal(model.pickView(null), 'compact');
});

test('modos de exibição: controles acessíveis, só desktop e só preferência salva', () => {
  const html = read('live/index.html');
  for (const view of ['compact', 'wide', 'theatre']) assert.ok(html.includes(`data-view="${view}" aria-pressed`), view);
  assert.ok(html.includes('id="liveChatToggle"') && html.includes('aria-pressed="true"'));
  const css = read('css/pages/live.css');
  assert.ok(/\.live-controls \{ display: none; \}/.test(css));
  const desktop = css.slice(css.indexOf('@media (min-width: 961px)'));
  for (const rule of ['data-view="theatre"', 'data-view="wide"', 'data-chat="hidden"']) assert.ok(desktop.includes(rule), rule);
  const js = read('js/pages/live/live.js');
  assert.ok(js.includes('kamyli:live-view') && js.includes('kamyli:live-chat'));
  assert.equal((js.match(/localStorage\./g) || []).length, 2);
  assert.ok(js.includes('chatToggle.hidden = next !== "twitch"'));
});

test('modo Compacto preserva as proporções existentes do site', () => {
  const html = read('live/index.html');
  assert.ok(html.includes('data-view="compact" data-chat="shown"'));
  assert.ok(/data-view="compact" aria-pressed="true"/.test(html));
  const css = read('css/pages/live.css');
  assert.ok(css.includes('width: min(1120px, calc(100% - 32px));'));
  assert.ok(css.includes('margin: 28px auto 56px;') && css.includes('gap: 14px;'));
  assert.ok(css.includes('width: min(1120px, calc(100% - 104px)); margin-left: 76px; margin-right: 28px;'));
  assert.ok(css.includes('border-radius: var(--radius-card, 24px)'));
});

test('aba padrão: valor desconhecido volta para a Twitch', () => {
  assert.equal(model.pickPlatform('youtube'), 'youtube');
  assert.equal(model.pickPlatform('twitch'), 'twitch');
  assert.equal(model.pickPlatform('outra'), 'twitch');
  assert.equal(model.pickPlatform(null), 'twitch');
});

test('CSP: somente /live/ libera os hosts de frame oficiais da Twitch', () => {
  const cspOf = html => /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const live = cspOf(read('live/index.html'));
  const frame = /frame-src ([^;]+)/.exec(live)[1].split(' ').sort();
  assert.deepEqual(frame, ['https://player.twitch.tv', 'https://www.twitch.tv']);
  assert.ok(!live.includes('youtube.com'));
  assert.ok(!live.includes("'unsafe-inline'"));
  assert.deepEqual(/script-src ([^;]+)/.exec(live)[1].split(' ').filter(t => t.startsWith('https:')), []);

  const pages = ['index.html', '404.html', 'agenda/index.html', 'artes/index.html', 'blog/index.html', 'doacoes/index.html', 'jogos/index.html', 'privacidade/index.html', 'uso-de-ia/index.html'];
  for (const page of pages) assert.ok(cspOf(read(page)).includes("frame-src 'none'"), page);
});

test('carregamento: embed Twitch só após clique e consentimento não é persistido', () => {
  const html = read('live/index.html');
  const js = read('js/pages/live/live.js');
  assert.ok(!/<iframe/i.test(html));
  assert.ok(!/src="https?:\/\/(?!assets\.kamylisumire\.com)/i.test(html));
  assert.ok(js.includes('data-action="load"'));
  assert.ok(js.includes('const consented = new Set()'));
  assert.ok(!/kamyli:live-embed/.test(js));
  assert.ok(!/store\.(get|set)\([^)]*consent/i.test(js));
  assert.ok(js.includes('createElement("iframe")'));
  assert.ok(!/youtube\.com\/iframe_api|youtube\.com\/live_chat/.test(js));
});

test('trocar de plataforma desmonta o embed anterior e não carrega YouTube', () => {
  const js = read('js/pages/live/live.js');
  assert.ok(/if \(previous !== next\) unmount\(previous\);/.test(js));
  assert.ok(js.includes('function unmount(platform)'));
  assert.ok(!js.includes('mountYouTube'));
  assert.ok(!js.includes('unmountYouTube'));
});

test('página: abas acessíveis e sem handlers inline', () => {
  const html = read('live/index.html');
  assert.ok(html.includes('role="tablist"') && html.includes('aria-controls="livePanelTwitch"') && html.includes('aria-controls="livePanelYoutube"'));
  assert.ok(html.includes('id="liveStatus" role="status" aria-live="polite"'));
  assert.ok(html.includes('<a class="skip-link" href="#livePage">'));
  assert.ok(!/\son[a-z]+=/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '')));
  assert.ok(!/ style=/i.test(html));
});

test('scripts da página: preload e execução permanecem na mesma ordem', () => {
  const html = read('live/index.html');
  const preloads = [...html.matchAll(/<link rel="preload" as="script" href="([^"]+)"/g)].map(m => m[1]);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(preloads, scripts);
  assert.ok(scripts.indexOf('../js/core/api.js?v=48.3.61') < scripts.indexOf('../js/pages/live/live-model.js?v=48.4.1'));
  assert.ok(scripts.indexOf('../js/pages/live/live-model.js?v=48.4.1') < scripts.indexOf('../js/pages/live/live.js?v=48.4.1'));
});

test('o site não tem outros iframes além dos criados dinamicamente em /live/', () => {
  const dirs = ['', 'agenda/', 'artes/', 'blog/', 'doacoes/', 'jogos/', 'privacidade/', 'uso-de-ia/'];
  for (const dir of dirs) {
    const html = read(`${dir}index.html`);
    assert.ok(!/<iframe/i.test(html), `${dir}index.html`);
  }
  assert.ok(readdirSync(new URL('../../js/pages/live/', import.meta.url)).includes('live.js'));
});
