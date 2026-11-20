import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function loadModel() {
  const sandbox = { URL };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('js/pages/agenda/agenda-model.js'), sandbox);
  return sandbox.KamyliAgendaModel;
}

const raw = loadModel();
// Resultados vêm de outro realm (vm); o JSON os traz de volta ao realm do teste.
const model = Object.fromEntries(Object.keys(raw).map(key => [key, (...args) => { const out = raw[key](...args); return out && typeof out === 'object' ? JSON.parse(JSON.stringify(out)) : out; }]));
const DAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function week(start = '2026-11-15', overrides = {}) {
  const [y, m, d] = start.split('-').map(Number);
  return {
    ultimaAtualizacao: '18/11/2026',
    observacao: 'Pode mudar.',
    dias: DAYS.map((id, index) => {
      const date = new Date(Date.UTC(y, m - 1, d + index)).toISOString().slice(0, 10);
      return { id, nome: NAMES[index], data: date, temLive: false, horario: '', titulo: '', descricao: '', plataformas: [], ...(overrides[id] || {}) };
    })
  };
}

const art = (appId, kind, file = kind) => ({ kind, url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/${file}.jpg?t=1` });
const manifest = games => ({ version: 1, games });

test('semana sempre tem sete dias, inclusive sem nenhuma live', () => {
  const result = model.buildWeek(week(), null);
  assert.equal(result.days.length, 7);
  assert.ok(result.days.every(day => !day.hasLive && day.lives.length === 0));
  assert.equal(result.days[0].ariaLabel, 'Domingo, 15 de novembro: sem live');
  assert.equal(result.background, null);
});

test('contrato inválido falha em vez de desenhar uma semana errada', () => {
  assert.throws(() => model.buildWeek({ dias: [] }, null));
  assert.throws(() => model.buildWeek(null, null));
  const wrongOrder = week();
  wrongOrder.dias.reverse();
  assert.throws(() => model.buildWeek(wrongOrder, null));
  const badDate = week();
  badDate.dias[2].data = '2026-02-31';
  assert.throws(() => model.buildWeek(badDate, null));
});

test('período da semana: mesmo mês, meses e anos diferentes', () => {
  assert.equal(model.buildWeek(week('2026-11-15'), null).period, '15 — 21 NOV 2026');
  assert.equal(model.buildWeek(week('2026-11-29'), null).period, '29 NOV — 05 DEZ 2026');
  assert.equal(model.buildWeek(week('2026-12-27'), null).period, '27 DEZ 2026 — 02 JAN 2027');
});

test('arte do card vem só do manifesto, header primeiro, e nunca é inventada pelo App ID', () => {
  const data = week('2026-11-15', {
    segunda: { temLive: true, horario: '20:00', titulo: 'A', plataformas: ['Twitch'], lives: [{ horario: '20:00', titulo: 'A', steamAppId: 10 }] },
    terca: { temLive: true, horario: '21:00', titulo: 'B', lives: [{ horario: '21:00', titulo: 'B', steamAppId: 20 }] }
  });
  const result = model.buildWeek(data, manifest([
    { steamAppId: 10, name: 'A', cardCandidates: [art(10, 'library-hero'), art(10, 'header'), art(10, 'main-capsule')] }
  ]));
  assert.deepEqual(
    result.days[1].art.map(url => url.split('/').pop().split('?')[0]),
    ['header.jpg', 'main-capsule.jpg', 'library-hero.jpg']
  );
  assert.deepEqual(result.days[2].art, [], 'sem registro no manifesto não há URL');
  assert.equal(result.days[2].hasLive, true);
});

test('capa vertical nunca vira arte de card nem de fundo', () => {
  const data = week('2026-11-15', {
    segunda: { temLive: true, titulo: 'A', lives: [{ horario: '20:00', titulo: 'A', steamAppId: 10 }] }
  });
  const result = model.buildWeek(data, manifest([
    { steamAppId: 10, cardCandidates: [art(10, 'library-capsule'), art(10, 'library-capsule-2x'), art(10, 'existing-library-artwork')] }
  ]));
  assert.deepEqual(result.days[1].art, []);
  assert.equal(result.background, null);
});

test('fundo panorâmico: só library-hero, estável por semana e independente da ordem das lives', () => {
  const lives = ids => ids.map(id => ({ horario: '20:00', titulo: `J${id}`, steamAppId: id }));
  const games = [10, 20, 30].map(id => ({ steamAppId: id, name: `J${id}`, cardCandidates: [art(id, 'header'), art(id, 'library-hero')] }));
  const build = ids => model.buildWeek(week('2026-11-15', Object.fromEntries(
    ids.map((id, i) => [DAYS[i + 1], { temLive: true, titulo: `J${id}`, lives: lives([id]) }])
  )), manifest(games));
  const a = build([10, 20, 30]);
  const b = build([30, 10, 20]);
  assert.ok(a.background);
  assert.equal(a.background.appId, b.background.appId);
  assert.ok(a.background.urls.every(url => /library_hero|library-hero/.test(url) || url.includes('/apps/')));
  assert.ok(!a.background.urls.some(url => url.endsWith('header.jpg?t=1')), 'header de card não pode virar fundo');
});

test('apenas hosts oficiais de imagem da Steam são aceitos', () => {
  assert.equal(model.isSteamImageUrl('https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/10/header.jpg', 10), true);
  assert.equal(model.isSteamImageUrl('https://cdn.cloudflare.steamstatic.com/steam/apps/10/header.jpg', 10), true);
  for (const bad of [
    'http://shared.fastly.steamstatic.com/store_item_assets/steam/apps/10/header.jpg',
    'https://evil.example/store_item_assets/steam/apps/10/header.jpg',
    'https://user:pw@shared.fastly.steamstatic.com/store_item_assets/steam/apps/10/header.jpg',
    'https://shared.fastly.steamstatic.com:8443/store_item_assets/steam/apps/10/header.jpg',
    'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/99/header.jpg',
    'javascript:alert(1)',
    ''
  ]) assert.equal(model.isSteamImageUrl(bad, 10), false, bad);
});

test('lives: várias no mesmo dia, legado sem lives e horário vazio como "A definir"', () => {
  const data = week('2026-11-15', {
    segunda: { temLive: true, horario: '19:00', titulo: 'Um', lives: [
      { horario: '19:00', titulo: 'Um', steamAppId: 1 },
      { horario: '22:00', titulo: 'Dois', plataformas: ['YouTube'], steamAppId: 2 }
    ] },
    terca: { temLive: true, horario: '', titulo: 'Legado', plataformas: ['Twitch'] }
  });
  const result = model.buildWeek(data, null);
  assert.equal(result.days[1].lives.length, 2);
  assert.equal(result.days[1].lives[1].time, '22:00');
  assert.equal(result.days[2].lives[0].time, 'A definir');
  assert.equal(result.days[2].lives[0].title, 'Legado');
  assert.match(result.days[2].ariaLabel, /horário a definir/);
});

test('helper antigo que renomeia a 1ª live não herda a arte do jogo anterior', () => {
  const data = week('2026-11-15', {
    segunda: { temLive: true, horario: '20:00', titulo: 'Outro jogo', lives: [{ horario: '20:00', titulo: 'Jogo original', steamAppId: 10 }] }
  });
  const result = model.buildWeek(data, manifest([{ steamAppId: 10, cardCandidates: [art(10, 'header')] }]));
  assert.deepEqual(result.days[1].art, []);
});

test('contrato da página: shell, CSP, scripts e ausência de HTML dinâmico', () => {
  const html = read('agenda/index.html');
  assert.match(html, /<a class="skip-link" href="#agendaPage">/);
  assert.match(html, /<main[^>]*id="agendaPage"[^>]*tabindex="-1"/);
  assert.match(html, /<header id="site-navbar"><\/header>/);
  assert.match(html, /<footer\s+class="site-footer"\s+id="site-footer"/);
  assert.equal((html.match(/id="site-navbar"/g) || []).length, 1);
  assert.equal((html.match(/id="site-footer"/g) || []).length, 1);
  assert.ok(!/id="inicio"/.test(html), 'id=inicio faria o navbar tratar a página como Home');
  assert.match(html, /<link rel="canonical" href="https:\/\/kamylisumire\.com\/agenda\/">/);
  assert.match(html, /<title>Agenda \| Kamyli Sumire<\/title>/);
  assert.ok(html.indexOf('agenda-model.js') < html.indexOf('agenda/agenda.js'));
  assert.ok(html.indexOf('agenda/agenda.js') < html.indexOf('core/loader.js'));
  assert.ok(!/\sstyle=|\son\w+=/.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), 'CSP sem unsafe-inline');

  const js = read('js/pages/agenda/agenda.js');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(js), 'agenda.js deve usar só textContent/DOM');
  assert.match(js, /function signalContentReady\(\)/);
  assert.match(js, /init\(\)\.finally\(signalContentReady\)/);
  assert.match(js, /referrerPolicy = "no-referrer"/);
  const code = (js + read('js/pages/agenda/agenda-model.js')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/api\.steampowered|steamcommunity|trello/i.test(code), 'a página não consulta Steam API nem Trello');
  assert.deepEqual([...code.matchAll(/fetchJson\(([A-Z_]+)\)/g)].map(match => match[1]).sort(), ['AGENDA_URL', 'MANIFEST_URL']);
});

test('navbar.json e fallback do content.js apontam Agenda para /agenda/', () => {
  const navbar = JSON.parse(read('data/content/navbar.json'));
  assert.equal(navbar.links.agenda.url, '/agenda/');
  assert.match(read('js/core/content.js'), /"agenda":\{"texto":"Agenda","icone":"none","url":"\/agenda\/"\}/);
});

test('CSS da agenda respeita blur desligado e reduz movimento', () => {
  const css = read('css/pages/agenda.css');
  assert.match(css, /backdrop-filter:\s*blur\(calc\(var\(--blur-card\)/);
  assert.match(css, /:root\[data-blur="off"\] \.agenda-day\.no-live::before/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
});
