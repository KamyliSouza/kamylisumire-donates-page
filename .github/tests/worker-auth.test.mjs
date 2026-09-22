import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

if (typeof crypto.subtle.timingSafeEqual !== 'function') {
  crypto.subtle.timingSafeEqual = (left, right) => {
    const a = new Uint8Array(left);
    const b = new Uint8Array(right);
    if (a.byteLength !== b.byteLength) return false;
    let diff = 0;
    for (let index = 0; index < a.byteLength; index += 1) {
      diff |= a[index] ^ b[index];
    }
    return diff === 0;
  };
}

const workerSource = await readFile(new URL('../../workers.js', import.meta.url), 'utf8');
const instrumentedSource = `${workerSource}\nexport { createStreamlabsOAuthState, validateStreamlabsOAuthState };\n`;
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(instrumentedSource).toString('base64')}`);
const {
  default: worker,
  createStreamlabsOAuthState,
  validateStreamlabsOAuthState
} = workerModule;

class MemoryKV {
  constructor(seed = {}) {
    this.values = new Map(Object.entries(seed).map(([key, value]) => [key, String(value)]));
    this.puts = [];
    this.deletes = [];
  }

  async get(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  async put(key, value, options) {
    const normalized = String(value);
    this.values.set(key, normalized);
    this.puts.push({ key, value: normalized, options });
  }

  async delete(key) {
    this.values.delete(key);
    this.deletes.push(key);
  }
}

const ADMIN_TOKEN = 'A'.repeat(32);
const STATE_SECRET = 'S'.repeat(48);

function createEnv(overrides = {}) {
  return {
    RANKINGS: new MemoryKV(),
    OAUTH_SETUP_TOKEN: ADMIN_TOKEN,
    OAUTH_STATE_SECRET: STATE_SECRET,
    STREAMLABS_CLIENT_ID: 'streamlabs-client-test',
    REDIRECT_URI: 'https://api.kamylisumire.com/oauth/callback',
    ...overrides
  };
}

test('rotas debug rejeitam ?key= e exigem Authorization Bearer', async () => {
  const env = createEnv();
  const queryResponse = await worker.fetch(
    new Request(`https://api.kamylisumire.com/debug/status?key=${ADMIN_TOKEN}`),
    env,
    {}
  );
  assert.equal(queryResponse.status, 403);

  const bearerResponse = await worker.fetch(
    new Request('https://api.kamylisumire.com/debug/status', {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    }),
    env,
    {}
  );
  assert.equal(bearerResponse.status, 200);
});

test('/oauth/authorize mantém ?key= somente para a navegação OAuth', async () => {
  const env = createEnv();
  const response = await worker.fetch(
    new Request(`https://api.kamylisumire.com/oauth/authorize?key=${ADMIN_TOKEN}`),
    env,
    {}
  );

  assert.equal(response.status, 302);
  const location = new URL(response.headers.get('Location'));
  const state = location.searchParams.get('state');
  assert.match(state || '', /^v2\.\d+\.[^.]+\.[A-Za-z0-9_-]+$/);

  const noncePut = env.RANKINGS.puts.find(entry => entry.key.startsWith('oauth:state:nonce:'));
  assert.ok(noncePut, 'a autorização deve registrar um nonce de uso único no KV');
  assert.equal(noncePut.options?.expirationTtl, 600);
});

test('token administrativo com menos de 32 caracteres falha fechado', async () => {
  const shortToken = 'curto-demais';
  const env = createEnv({ OAUTH_SETUP_TOKEN: shortToken });
  const response = await worker.fetch(
    new Request('https://api.kamylisumire.com/debug/status', {
      headers: { Authorization: `Bearer ${shortToken}` }
    }),
    env,
    {}
  );
  assert.equal(response.status, 403);
});

test('state OAuth usa OAUTH_STATE_SECRET separado do token administrativo', async () => {
  const env = createEnv();
  const state = await createStreamlabsOAuthState(env);

  const changedStateSecretEnv = {
    ...env,
    OAUTH_SETUP_TOKEN: ADMIN_TOKEN,
    OAUTH_STATE_SECRET: 'T'.repeat(48)
  };
  assert.equal(await validateStreamlabsOAuthState(changedStateSecretEnv, state), false);
});

test('state OAuth é consumido uma única vez', async () => {
  const env = createEnv();
  const state = await createStreamlabsOAuthState(env);

  assert.equal(await validateStreamlabsOAuthState(env, state), true);
  assert.equal(await validateStreamlabsOAuthState(env, state), false);
  assert.equal(env.RANKINGS.deletes.length, 1);
  assert.match(env.RANKINGS.deletes[0], /^oauth:state:nonce:/);
});

test('OAuth recusa reutilizar OAUTH_SETUP_TOKEN como OAUTH_STATE_SECRET', async () => {
  const env = createEnv({ OAUTH_STATE_SECRET: ADMIN_TOKEN });
  await assert.rejects(
    createStreamlabsOAuthState(env),
    /OAUTH_STATE_SECRET deve ser diferente de OAUTH_SETUP_TOKEN/
  );
});

test('OAuth falha fechado quando OAUTH_STATE_SECRET não está configurado', async () => {
  const env = createEnv({ OAUTH_STATE_SECRET: '' });
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await worker.fetch(
      new Request(`https://api.kamylisumire.com/oauth/authorize?key=${ADMIN_TOKEN}`),
      env,
      {}
    );
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'internal_error' });
  } finally {
    console.error = originalError;
  }
});
