import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const VERSION = '48.3.77';
const PAGES = [
  'index.html', '404.html', 'doacoes/index.html', 'blog/index.html', 'artes/index.html',
  'jogos/index.html', 'agenda/index.html', 'privacidade/index.html', 'uso-de-ia/index.html'
];
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('favicon usa a máscara logo.webp e a cor primária do tema', () => {
  const source = read('js/core/favicon.js');
  assert.match(source, /crossOrigin = "anonymous"/);
  assert.match(source, /globalCompositeOperation = "source-in"/);
  assert.match(source, /getPropertyValue\("--primary-color"\)/);
  assert.match(source, /kamyli:ui-preference-change/);
  assert.match(source, /catch \{[\s\S]*favicon original/);
});

test('favicon acompanha mudanças de tema e preserva fallback quando imagem ou Canvas falha', () => {
  const source = read('js/core/favicon.js');
  const light = runFavicon(source, 'light');

  assert.ok(light.icons.every(icon => icon.href.startsWith('data:image/png')));
  assert.ok(light.icons.every(icon => icon.type === 'image/png' && icon.sizes === '64x64'));
  assert.equal(light.colors.at(-1), '#B35EAF');

  light.root.dataset.theme = 'dark';
  light.listeners.get('kamyli:ui-preference-change')();
  assert.equal(light.colors.at(-1), '#d178cd');
  assert.ok(light.icons.every(icon => icon.href.startsWith('data:image/png')));

  const canvasFallback = runFavicon(source, 'light', { failCanvas: true });
  const imageFallback = runFavicon(source, 'light', { failImage: true });
  for (const fallback of [canvasFallback, imageFallback]) {
    assert.deepEqual(fallback.icons.map(icon => icon.href), [
      'https://assets.kamylisumire.com/favicon.webp',
      'https://assets.kamylisumire.com/favicon.png'
    ]);
  }
});

for (const page of PAGES) {
  test(`${page}: favicon dinâmico, fallback e CSP de imagem`, () => {
    const html = read(page);
    const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1] || '';
    const prefix = page.includes('/') ? '../' : '';

    assert.match(policy, /img-src 'self' https: data:/);
    assert.doesNotMatch(policy.match(/script-src[^;]*/)?.[0] || '', /data:/,
      'data: é permitido somente em imagens, nunca em scripts');
    assert.match(html, /https:\/\/assets\.kamylisumire\.com\/favicon\.webp/,
      'o favicon original permanece como fallback');
    assert.ok(html.includes(`${prefix}js/core/favicon.js?v=${VERSION}`));
    assert.ok(html.includes(`<link rel="preload" as="script" href="${prefix}js/core/favicon.js?v=${VERSION}">`));
  });
}

function runFavicon(source, initialTheme, { failImage = false, failCanvas = false } = {}) {
  const root = { dataset: { theme: initialTheme } };
  const icons = [
    { href: 'https://assets.kamylisumire.com/favicon.webp', type: 'image/webp', sizes: '' },
    { href: 'https://assets.kamylisumire.com/favicon.png', type: 'image/png', sizes: '' }
  ];
  const listeners = new Map();
  const colors = [];
  const context = {
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    clearRect() {},
    drawImage() {},
    fillRect() { colors.push(this.fillStyle); }
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => {
      if (failCanvas) throw new Error('Canvas indisponível');
      return 'data:image/png;base64,ZmF2aWNvbg==';
    }
  };

  class FakeImage {
    constructor() {
      this.naturalWidth = 256;
      this.naturalHeight = 256;
      this.handlers = new Map();
    }
    addEventListener(name, callback) { this.handlers.set(name, callback); }
    set src(value) {
      this._src = value;
      if (failImage) this.handlers.get('error')?.();
      else this.handlers.get('load')?.();
    }
  }

  const document = {
    documentElement: root,
    querySelectorAll: () => icons,
    createElement: tag => tag === 'canvas' ? canvas : {}
  };
  const window = {
    addEventListener: (name, callback) => listeners.set(name, callback)
  };
  const getComputedStyle = element => ({
    getPropertyValue: name => name === '--primary-color'
      ? (element.dataset.theme === 'dark' ? '#d178cd' : '#B35EAF')
      : ''
  });

  vm.runInNewContext(source, { document, window, Image: FakeImage, getComputedStyle });
  return { root, icons, listeners, colors };
}
