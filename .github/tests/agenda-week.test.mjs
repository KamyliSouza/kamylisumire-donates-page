import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  checkCardDate,
  currentWeekStart,
  formatIsoDate,
  parseIsoDate,
  parseWeekSetting,
  resolveWeekStart,
  todayInSaoPaulo,
} from '../scripts/agenda-week.mjs';

const repoPath = path => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const read = path => readFileSync(repoPath(path), 'utf8');
const iso = date => formatIsoDate(date);
const at = text => new Date(text);

/* ------------------------------------------------------------------ */
/* Funções puras                                                       */
/* ------------------------------------------------------------------ */

test('a semana atual usa o dia civil de America/Sao_Paulo, não o de UTC', () => {
  // 2026-10-25 é domingo. Às 02:59Z ainda é sábado 23:59 em São Paulo (UTC-3).
  assert.equal(iso(todayInSaoPaulo(at('2026-10-25T02:59:59Z'))), '2026-10-24');
  assert.equal(iso(currentWeekStart(at('2026-10-25T02:59:59Z'))), '2026-10-18');

  // 03:00Z = 00:00 de domingo em São Paulo: a semana vira.
  assert.equal(iso(todayInSaoPaulo(at('2026-10-25T03:00:00Z'))), '2026-10-25');
  assert.equal(iso(currentWeekStart(at('2026-10-25T03:00:00Z'))), '2026-10-25');

  // Meio da semana e sexta à noite.
  assert.equal(iso(currentWeekStart(at('2026-10-23T15:00:00Z'))), '2026-10-18');
  assert.equal(iso(currentWeekStart(at('2026-10-24T01:00:00Z'))), '2026-10-18');
});

test('Semana: aceita domingo, automática e em branco; rejeita outros dias e lixo', () => {
  assert.equal(iso(parseWeekSetting('2026-10-25').date), '2026-10-25');
  assert.deepEqual(parseWeekSetting('automática'), { automatic: true });
  assert.deepEqual(parseWeekSetting('Automatica'), { automatic: true });
  assert.deepEqual(parseWeekSetting('auto'), { automatic: true });
  assert.deepEqual(parseWeekSetting(''), { automatic: true });
  assert.throws(() => parseWeekSetting('2026-10-26'), /domingo/);
  assert.throws(() => parseWeekSetting('2026-02-30'), /inválida/);
  assert.throws(() => parseWeekSetting('semana que vem'), /YYYY-MM-DD/);
});

test('sem Semana: nem Data:, a Agenda publica a semana atual', () => {
  const result = resolveWeekStart({ now: at('2026-10-23T15:00:00Z') });
  assert.equal(iso(result.weekStart), '2026-10-18');
  assert.equal(result.source, 'automatica');
  assert.deepEqual(result.warnings, []);
});

test('Semana: antiga (o bug original) é ignorada com aviso e vale a semana atual', () => {
  const result = resolveWeekStart({
    boardWeek: parseIsoDate('2026-09-20', 'teste'),
    now: at('2026-10-23T15:00:00Z'),
  });
  assert.equal(iso(result.weekStart), '2026-10-18');
  assert.equal(result.source, 'automatica');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /2026-09-20.*já passou/);
});

test('Semana: da semana atual ou futura continua valendo (planejar a próxima semana)', () => {
  const now = at('2026-10-23T15:00:00Z');

  const same = resolveWeekStart({ boardWeek: parseIsoDate('2026-10-18', 'teste'), now });
  assert.equal(iso(same.weekStart), '2026-10-18');
  assert.equal(same.source, 'semana');

  const future = resolveWeekStart({ boardWeek: parseIsoDate('2026-10-25', 'teste'), now });
  assert.equal(iso(future.weekStart), '2026-10-25');
  assert.equal(future.source, 'semana');
  assert.deepEqual(future.warnings, []);
});

test('Data: dos cards só escolhe a semana quando é a atual ou uma futura', () => {
  const now = at('2026-10-23T15:00:00Z');

  const stale = resolveWeekStart({ cardDates: [{ title: 'Velha', date: '2026-09-21' }], now });
  assert.equal(iso(stale.weekStart), '2026-10-18');
  assert.equal(stale.source, 'automatica');

  const next = resolveWeekStart({ cardDates: [{ title: 'Próxima', date: '2026-10-27' }], now });
  assert.equal(iso(next.weekStart), '2026-10-25');
  assert.equal(next.source, 'cards');

  // Sobra de semana antiga misturada com a semana atual: a antiga é descartada.
  const mixed = resolveWeekStart({
    cardDates: [{ title: 'Velha', date: '2026-09-21' }, { title: 'Atual', date: '2026-10-20' }],
    now,
  });
  assert.equal(iso(mixed.weekStart), '2026-10-18');
  assert.equal(mixed.source, 'cards');

  // Duas semanas válidas diferentes continuam sendo erro de quem edita o quadro.
  assert.throws(
    () => resolveWeekStart({
      cardDates: [{ title: 'A', date: '2026-10-20' }, { title: 'B', date: '2026-10-27' }],
      now,
    }),
    /semanas diferentes/,
  );
});

test('checkCardDate: ok, sobra antiga (stale) e erro real (mismatch)', () => {
  const weekStart = parseIsoDate('2026-10-18', 'teste');
  assert.equal(checkCardDate({ date: null, expectedDate: '2026-10-20', weekStart }), 'ok');
  assert.equal(checkCardDate({ date: '2026-10-20', expectedDate: '2026-10-20', weekStart }), 'ok');
  assert.equal(checkCardDate({ date: '2026-09-22', expectedDate: '2026-10-20', weekStart }), 'stale');
  assert.equal(checkCardDate({ date: '2026-10-21', expectedDate: '2026-10-20', weekStart }), 'mismatch');
  assert.equal(checkCardDate({ date: '2026-10-27', expectedDate: '2026-10-20', weekStart }), 'mismatch');
});

/* ------------------------------------------------------------------ */
/* sync-agenda.mjs de ponta a ponta, com Trello e relógio simulados     */
/* ------------------------------------------------------------------ */

const PRELOAD = `
import { readFileSync } from 'node:fs';
const RealDate = Date;
const fixed = RealDate.parse(process.env.FAKE_NOW);
globalThis.Date = class extends RealDate {
  constructor(...args) { if (args.length === 0) super(fixed); else super(...args); }
  static now() { return fixed; }
};
const fixture = JSON.parse(readFileSync(process.env.TRELLO_FIXTURE, 'utf8'));
globalThis.fetch = async input => {
  const url = new URL(String(input));
  const path = url.pathname;
  const body = path.endsWith('/lists') ? fixture.lists : path.endsWith('/cards') ? fixture.cards : fixture.board;
  return { ok: true, status: 200, json: async () => body };
};
`;

const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function fixture({ desc = '', cards = [] }) {
  return {
    board: { id: 'b1', name: 'Agenda', desc, shortUrl: 'https://trello.com/b/teste' },
    lists: DAYS.map((name, index) => ({ id: `l${index}`, name, pos: index, closed: false })),
    cards: cards.map((card, index) => ({
      id: `c${index}`,
      name: card.name,
      idList: `l${card.day}`,
      pos: index + 1,
      closed: false,
      desc: card.desc,
    })),
  };
}

function runSync({ now, desc, cards, previous }) {
  const dir = mkdtempSync(join(tmpdir(), 'agenda-week-'));
  try {
    mkdirSync(join(dir, 'data', 'content'), { recursive: true });
    writeFileSync(join(dir, 'data', 'content', 'jogos.json'), JSON.stringify({ games: [] }));
    if (previous) writeFileSync(join(dir, 'data', 'agenda.json'), JSON.stringify(previous));
    writeFileSync(join(dir, 'fixture.json'), JSON.stringify(fixture({ desc, cards })));
    writeFileSync(join(dir, 'preload.mjs'), PRELOAD);
    const summaryPath = join(dir, 'summary.md');

    const result = spawnSync(
      process.execPath,
      ['--import', pathToFileURL(join(dir, 'preload.mjs')).href, repoPath('.github/scripts/sync-agenda.mjs')],
      {
        cwd: dir,
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          TRELLO_AGENDA_BOARD_ID: 'b1',
          TRELLO_API_KEY: 'k',
          TRELLO_TOKEN: 't',
          FAKE_NOW: now,
          TRELLO_FIXTURE: join(dir, 'fixture.json'),
          GITHUB_STEP_SUMMARY: summaryPath,
        },
      },
    );

    let agenda = null;
    try { agenda = JSON.parse(readFileSync(join(dir, 'data', 'agenda.json'), 'utf8')); } catch {}
    let summary = '';
    try { summary = readFileSync(summaryPath, 'utf8'); } catch {}
    return { ...result, agenda, summary };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const OLD_AGENDA = {
  ultimaAtualizacao: '21/10/2026',
  observacao: 'Antiga',
  dias: DAYS.map((nome, index) => ({
    id: nome.toLowerCase(),
    nome,
    data: `2026-09-${20 + index}`,
    temLive: false,
    horario: '',
    titulo: '',
    descricao: '',
    plataformas: ['YouTube', 'Twitch'],
    lives: [],
  })),
};

test('sync: quadro preso em "Semana: 2026-09-20" agora publica as datas da semana atual', () => {
  const result = runSync({
    now: '2026-10-23T15:00:00Z',
    desc: 'Semana: 2026-09-20\nObservacao: Aviso novo',
    cards: [
      { day: 1, name: 'DARK SOULS II', desc: 'Data: 2026-09-21\nHorario: 20:00\nPlataformas: YouTube, Twitch' },
      { day: 5, name: 'Live de sexta', desc: 'Horario: A definir\nPlataformas: Twitch' },
    ],
    previous: OLD_AGENDA,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.agenda.dias.map(day => day.data), [
    '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24',
  ]);
  assert.equal(result.agenda.ultimaAtualizacao, '23/10/2026');
  assert.equal(result.agenda.observacao, 'Aviso novo');
  assert.equal(result.agenda.dias[1].titulo, 'DARK SOULS II');
  assert.match(result.stdout, /semana 2026-10-18 a 2026-10-24 \(automática/);
  assert.match(result.stdout, /::warning title=Agenda::Semana: 2026-09-20 .*já passou/);
  assert.match(result.stdout, /::warning title=Agenda::"DARK SOULS II".*Data: 2026-09-21/);
  assert.match(result.summary, /Semana publicada: \*\*2026-10-18 a 2026-10-24\*\*/);
});

test('sync: sem Semana: e sem Data: segue a data de hoje', () => {
  const result = runSync({
    now: '2026-10-23T15:00:00Z',
    cards: [{ day: 3, name: 'Quarta', desc: 'Plataformas: YouTube' }],
    previous: OLD_AGENDA,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.agenda.dias[0].data, '2026-10-18');
  assert.equal(result.agenda.dias[6].data, '2026-10-24');
});

test('sync: a semana vira no domingo 00:10 de São Paulo', () => {
  const before = runSync({ now: '2026-10-25T02:50:00Z', cards: [], previous: OLD_AGENDA });
  assert.equal(before.status, 0, before.stderr);
  assert.equal(before.agenda.dias[0].data, '2026-10-18');

  const after = runSync({ now: '2026-10-25T03:10:00Z', cards: [], previous: OLD_AGENDA });
  assert.equal(after.status, 0, after.stderr);
  assert.equal(after.agenda.dias[0].data, '2026-10-25');
  assert.equal(after.agenda.dias[6].data, '2026-10-31');
  assert.equal(after.agenda.ultimaAtualizacao, '25/10/2026');
});

test('sync: Semana: futura planeja a próxima semana e Semana: automática segue o relógio', () => {
  const planned = runSync({
    now: '2026-10-23T15:00:00Z',
    desc: 'Semana: 2026-10-25',
    cards: [{ day: 1, name: 'Segunda que vem', desc: 'Data: 2026-10-26\nPlataformas: YouTube' }],
    previous: OLD_AGENDA,
  });
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(planned.agenda.dias[0].data, '2026-10-25');
  assert.match(planned.stdout, /linha Semana: do quadro/);
  assert.doesNotMatch(planned.stdout, /::warning/);

  const automatic = runSync({
    now: '2026-10-23T15:00:00Z',
    desc: 'Semana: automática',
    cards: [],
    previous: OLD_AGENDA,
  });
  assert.equal(automatic.status, 0, automatic.stderr);
  assert.equal(automatic.agenda.dias[0].data, '2026-10-18');
});

test('sync: Data: no dia errado da semana publicada continua barrando a publicação', () => {
  const result = runSync({
    now: '2026-10-23T15:00:00Z',
    cards: [{ day: 2, name: 'Terça errada', desc: 'Data: 2026-10-21\nPlataformas: YouTube' }],
    previous: OLD_AGENDA,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /não corresponde a 2026-10-20/);
  assert.deepEqual(result.agenda, OLD_AGENDA, 'o último agenda.json válido deve ser preservado');
});

test('sync: executar de novo na mesma semana não muda a "Atualizada em"', () => {
  const first = runSync({
    now: '2026-10-23T15:00:00Z',
    cards: [{ day: 1, name: 'Segunda', desc: 'Plataformas: YouTube' }],
    previous: OLD_AGENDA,
  });
  assert.equal(first.status, 0, first.stderr);

  const second = runSync({
    now: '2026-10-24T15:00:00Z',
    cards: [{ day: 1, name: 'Segunda', desc: 'Plataformas: YouTube' }],
    previous: first.agenda,
  });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.agenda.ultimaAtualizacao, '23/10/2026');
  assert.deepEqual(second.agenda.dias, first.agenda.dias);
});

/* ------------------------------------------------------------------ */
/* Atualização manual e agendamento                                    */
/* ------------------------------------------------------------------ */

test('workflow da Agenda: botão manual, rodada duas vezes por dia e virada de domingo', () => {
  const yaml = read('.github/workflows/sync-agenda.yml');
  assert.match(yaml, /^\s{2}workflow_dispatch:/m);
  assert.match(yaml, /cron: "29 9,21 \* \* \*"/);
  assert.match(yaml, /cron: "10 3 \* \* 0"/);
  assert.match(yaml, /node --check \.github\/scripts\/agenda-week\.mjs/);
  assert.match(read('.github/workflows/validate-json.yml'), /node --check \.github\/scripts\/agenda-week\.mjs/);
});
