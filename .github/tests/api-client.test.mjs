import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../../js/core/api.js", import.meta.url), "utf8");

function loadApi(fetchImpl, timers = {}) {
  const window = {
    KAMYLI_CONFIG: {
      api: {
        useCustomDomain: true,
        customDomainUrl: "https://api.kamylisumire.com",
        workersDevUrl: "https://fallback.example.workers.dev",
        fallbackToWorkersDev: true,
        defaultTimeoutMs: 8000,
      },
    },
  };
  const warnings = [];
  const context = vm.createContext({
    window,
    fetch: fetchImpl,
    AbortController,
    Error,
    Object,
    Set,
    String,
    console: { warn: (...args) => warnings.push(args) },
    setTimeout: timers.setTimeout || setTimeout,
    clearTimeout: timers.clearTimeout || clearTimeout,
  });
  vm.runInContext(source, context);
  return { api: window.KamyliAPI, warnings };
}

function response({ status = 200, json = async () => ({ ok: true }) } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json,
  };
}

test("erro HTTP do domínio principal não dispara fallback workers.dev", async () => {
  const calls = [];
  const { api } = loadApi(async url => {
    calls.push(url);
    if (url.startsWith("https://api.kamylisumire.com")) {
      return response({ status: 503 });
    }
    return response({ json: async () => ({ source: "fallback" }) });
  });

  await assert.rejects(api.getJSON("/"), /HTTP 503/);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^https:\/\/api\.kamylisumire\.com\//);
});

test("falha de rede do domínio principal usa fallback workers.dev", async () => {
  const calls = [];
  const { api } = loadApi(async url => {
    calls.push(url);
    if (url.startsWith("https://api.kamylisumire.com")) {
      throw new TypeError("network failed");
    }
    return response({ json: async () => ({ source: "fallback" }) });
  });

  assert.deepEqual(await api.getJSON("/twitch/live"), { source: "fallback" });
  assert.equal(calls.length, 2);
  assert.match(calls[1], /^https:\/\/fallback\.example\.workers\.dev\//);
});

test("timeout permanece ativo durante response.json e pode acionar fallback", async () => {
  let activeTimer = null;
  let nextTimerId = 0;
  const calls = [];
  const timers = {
    setTimeout(callback) {
      activeTimer = { id: ++nextTimerId, callback };
      return activeTimer.id;
    },
    clearTimeout(id) {
      if (activeTimer?.id === id) activeTimer = null;
    },
  };

  const { api } = loadApi(async (url, options) => {
    calls.push(url);
    if (url.startsWith("https://api.kamylisumire.com")) {
      const signal = options.signal;
      return response({
        json: async () => {
          // Simula corpo que ainda está sendo lido quando o timeout vence.
          activeTimer?.callback();
          if (signal.aborted) {
            const error = new Error("aborted while reading body");
            error.name = "AbortError";
            throw error;
          }
          return { source: "primary" };
        },
      });
    }
    return response({ json: async () => ({ source: "fallback" }) });
  }, timers);

  assert.deepEqual(await api.getJSON("/", { timeoutMs: 25 }), { source: "fallback" });
  assert.equal(calls.length, 2);
});

test("JSON inválido em resposta HTTP não é tratado como falha de transporte", async () => {
  const calls = [];
  const { api } = loadApi(async url => {
    calls.push(url);
    if (url.startsWith("https://api.kamylisumire.com")) {
      return response({
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      });
    }
    return response({ json: async () => ({ source: "fallback" }) });
  });

  await assert.rejects(api.getJSON("/"), SyntaxError);
  assert.equal(calls.length, 1);
});
