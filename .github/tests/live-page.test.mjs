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

test('Twitch: player e chat usam parent com o host da página', () => {
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

test('YouTube: player por canal com enablejsapi e origin; chat só com ID válido', () => {
  const player = new URL(model.youtubePlayerUrl('https://kamylisumire.com'));
  assert.equal(player.origin + player.pathname, 'https://www.youtube-nocookie.com/embed/live_stream');
  assert.equal(player.searchParams.get('channel'), 'UCkhjq3nJqlv5GrBgNRwIBFw');
  assert.equal(player.searchParams.get('enablejsapi'), '1');
  assert.equal(player.searchParams.get('origin'), 'https://kamylisumire.com');
  assert.equal(model.youtubePlayerUrl('não é url'), null);

  const chat = new URL(model.youtubeChatUrl('dQw4w9WgXcQ', 'kamylisumire.com'));
  assert.equal(chat.origin + chat.pathname, 'https://www.youtube.com/live_chat');
  assert.equal(chat.searchParams.get('v'), 'dQw4w9WgXcQ');
  assert.equal(chat.searchParams.get('embed_domain'), 'kamylisumire.com');
  for (const bad of ['', 'curto', 'dQw4w9WgXcQ&x=1', null, 'dQw4w9WgXc!']) {
    assert.equal(model.youtubeChatUrl(bad, 'kamylisumire.com'), null, String(bad));
  }
  assert.equal(model.youtubeChatUrl('dQw4w9WgXcQ', ''), null);
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

test('termos das plataformas: altura mínima, player fixo no mobile, sem cápsula por cima', () => {
  const css = read('css/pages/live.css');
  assert.ok(/height: max\(300px, 56\.25vw\)/.test(css), 'Twitch pede ao menos 400x300');
  assert.ok(/position: sticky/.test(css));
  assert.ok(/body:has\(#livePage\) \.site-socials-mobile \{ display: none; \}/.test(css));
  const html = read('live/index.html');
  assert.ok(!/name="referrer"/i.test(html), 'não suprimir o Referer: o YouTube exige identificação do site');
  const js = read('js/pages/live/live.js');
  assert.ok(js.includes('strict-origin-when-cross-origin'));
});

test('privacidade descreve o carregamento sob demanda de Twitch e YouTube', () => {
  const html = read('privacidade/index.html');
  assert.ok(html.includes('Carregar a transmissão'));
  assert.ok(html.includes('Ao vivo'));
});

test('YouTube: ID de vídeo sozinho não prova live (canal offline também tem ID)', () => {
  const id = 'dQw4w9WgXcQ';
  const live = state => ({ videoId: id, isLive: true, duration: 0, state });
  assert.equal(model.youtubeIsLive(live(model.YT_STATE.PLAYING)), true);
  assert.equal(model.youtubeIsLive(live(model.YT_STATE.BUFFERING)), true);
  assert.equal(model.youtubeIsLive(live(model.YT_STATE.PAUSED)), true);
  // vídeo gravado/último vídeo do canal: isLive false ou duração > 0
  assert.equal(model.youtubeIsLive({ videoId: id, isLive: false, duration: 3600, state: model.YT_STATE.PLAYING }), false);
  assert.equal(model.youtubeIsLive({ videoId: id, duration: 3600, state: model.YT_STATE.PLAYING }), false);
  // sem isLive, duração 0 + tocando é a marca de transmissão ao vivo
  assert.equal(model.youtubeIsLive({ videoId: id, duration: 0, state: model.YT_STATE.PLAYING }), true);
  // não iniciado, encerrado, na fila ou sem ID válido
  for (const state of [model.YT_STATE.UNSTARTED, model.YT_STATE.ENDED, model.YT_STATE.CUED, undefined]) {
    assert.equal(model.youtubeIsLive(live(state)), false, String(state));
  }
  assert.equal(model.youtubeIsLive({ videoId: '', isLive: true, state: 1 }), false);
  assert.equal(model.youtubeIsLive(null), false);
});

test('aba padrão: valor desconhecido volta para a Twitch', () => {
  assert.equal(model.pickPlatform('youtube'), 'youtube');
  assert.equal(model.pickPlatform('twitch'), 'twitch');
  assert.equal(model.pickPlatform('outra'), 'twitch');
  assert.equal(model.pickPlatform(null), 'twitch');
});

test('CSP: só /live/ libera frames, e apenas os hosts esperados', () => {
  const cspOf = html => /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const live = cspOf(read('live/index.html'));
  const frame = /frame-src ([^;]+)/.exec(live)[1].split(' ').sort();
  assert.deepEqual(frame, ['https://player.twitch.tv', 'https://www.twitch.tv', 'https://www.youtube-nocookie.com', 'https://www.youtube.com']);
  assert.ok(!live.includes("'unsafe-inline'"));
  assert.deepEqual(/script-src ([^;]+)/.exec(live)[1].split(' ').filter(t => t.startsWith('https:')), ['https://www.youtube.com']);

  const pages = ['index.html', '404.html', 'agenda/index.html', 'artes/index.html', 'blog/index.html', 'doacoes/index.html', 'jogos/index.html', 'privacidade/index.html', 'uso-de-ia/index.html'];
  for (const page of pages) assert.ok(cspOf(read(page)).includes("frame-src 'none'"), page);
});

test('consentimento: nenhum iframe nem script de terceiros fora do clique', () => {
  const html = read('live/index.html');
  assert.ok(!/<iframe/i.test(html), 'o HTML não pode trazer iframe');
  assert.ok(!/src="https?:\/\/(?!assets\.kamylisumire\.com)/i.test(html), 'sem script/imagem de terceiros no HTML');
  const js = read('js/pages/live/live.js');
  assert.ok(js.includes('data-action="load"'));
  assert.ok(js.includes('const consented = new Set()'));
  assert.ok(!/kamyli:live-embed/.test(js), 'o consentimento não pode ficar salvo entre visitas');
  assert.ok(!/store\.(get|set)\([^)]*consent/i.test(js));
  const mountIndex = js.indexOf('function mountTwitch');
  assert.ok(js.indexOf('createElement("iframe")') > -1 && mountIndex > -1);
  // O script do YouTube só é criado dentro de loadYouTubeApi, chamado por mountYouTube.
  assert.equal(js.split('script.src = "https://www.youtube.com/iframe_api"').length - 1, 1);
  assert.equal(js.split('await loadYouTubeApi()').length - 1, 1);
});

test('uma plataforma por vez: trocar de aba desmonta a anterior', () => {
  const js = read('js/pages/live/live.js');
  assert.ok(/if \(previous !== next\) unmount\(previous\);/.test(js));
  assert.ok(js.includes('function unmountYouTube'));
  assert.ok(js.includes('destroy'));
});

test('página: abas acessíveis, status vivo e sem handlers inline', () => {
  const html = read('live/index.html');
  assert.ok(html.includes('role="tablist"') && html.includes('aria-controls="livePanelTwitch"') && html.includes('aria-controls="livePanelYoutube"'));
  assert.ok(html.includes('id="liveStatus" role="status" aria-live="polite"'));
  assert.ok(html.includes('<a class="skip-link" href="#livePage">'));
  assert.ok(!/\son[a-z]+=/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '')));
  assert.ok(!/ style=/i.test(html));
});

test('scripts da página: preload e execução na mesma ordem', () => {
  const html = read('live/index.html');
  const preloads = [...html.matchAll(/<link rel="preload" as="script" href="([^"]+)"/g)].map(m => m[1]);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(preloads, scripts);
  assert.ok(scripts.indexOf('../js/core/api.js?v=48.3.61') < scripts.indexOf('../js/pages/live/live-model.js?v=48.4.0'));
  assert.ok(scripts.indexOf('../js/pages/live/live-model.js?v=48.4.0') < scripts.indexOf('../js/pages/live/live.js?v=48.4.0'));
});

test('o site não tem outro iframe além do de /live/', () => {
  const dirs = ['', 'agenda/', 'artes/', 'blog/', 'doacoes/', 'jogos/', 'privacidade/', 'uso-de-ia/'];
  for (const dir of dirs) {
    const html = read(`${dir}index.html`);
    assert.ok(!/<iframe/i.test(html), `${dir}index.html`);
  }
  assert.ok(readdirSync(new URL('../../js/pages/live/', import.meta.url)).includes('live.js'));
});
