import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const CHECKOUT_PIN = 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2';
const workflows = new Map([
  ['.github/workflows/validate-json.yml', read('.github/workflows/validate-json.yml')],
  ['.github/workflows/sync-jogos.yml', read('.github/workflows/sync-jogos.yml')],
  ['.github/workflows/sync-agenda.yml', read('.github/workflows/sync-agenda.yml')],
]);

test('jobs da CI possuem timeout explícito e limitado', () => {
  const expected = new Map([
    ['.github/workflows/validate-json.yml', 10],
    ['.github/workflows/sync-jogos.yml', 20],
    ['.github/workflows/sync-agenda.yml', 20],
  ]);

  for (const [path, yaml] of workflows) {
    const timeout = Number(yaml.match(/timeout-minutes:\s*(\d+)/)?.[1]);
    assert.equal(timeout, expected.get(path), `${path}: timeout-minutes inesperado`);
    assert.ok(timeout > 0 && timeout <= 20, `${path}: timeout deve permanecer limitado a até 20 minutos`);
  }
});

test('actions checkout ficam fixadas por SHA imutável', () => {
  for (const [path, yaml] of workflows) {
    assert.match(yaml, new RegExp(CHECKOUT_PIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(yaml, /uses:\s*actions\/checkout@(v\d+|main|master)\b/);
  }

  const validate = workflows.get('.github/workflows/validate-json.yml');
  assert.match(validate, /persist-credentials:\s*false/);
});

test('validação cancela execuções obsoletas sem alterar serialização editorial', () => {
  const validate = workflows.get('.github/workflows/validate-json.yml');
  assert.match(validate, /group:\s*validate-\$\{\{ github\.ref \}\}/);
  assert.match(validate, /cancel-in-progress:\s*true/);

  for (const path of ['.github/workflows/sync-jogos.yml', '.github/workflows/sync-agenda.yml']) {
    const yaml = workflows.get(path);
    assert.match(yaml, /group:\s*editorial-sync-\$\{\{ github\.ref \}\}/);
    assert.match(yaml, /cancel-in-progress:\s*false/);
  }
});

test('workflow principal descobre automaticamente toda a suíte node:test', () => {
  const validate = workflows.get('.github/workflows/validate-json.yml');
  assert.match(validate, /run:\s*node --test \.github\/tests\/\*\.test\.mjs/);
});
