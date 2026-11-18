// Acesso educado à Steam para os scripts de sincronização (GitHub Actions).
//
// Este módulo não conhece Trello, JSON do site nem regras editoriais. Ele só:
//   1. identifica o cliente com um User-Agent próprio;
//   2. espaça as requisições;
//   3. repete falhas transitórias (rede/5xx) com espera crescente;
//   4. interrompe TODO o acesso à Steam na execução atual (disjuntor) ao receber
//      sinais de bloqueio, em vez de continuar insistindo;
//   5. oferece o cálculo de validade usado pelo cache por app.
//
// Sem dependências externas; `fetch`, `sleep` e `now` são injetáveis para teste.

export const STEAM_USER_AGENT = "KamyliSumireSiteSync/1.0 (+https://kamylisumire.com; contato@kamylisumire.com)";

// Os assets de um app mudam raramente; 14 dias evita consultas diárias repetidas.
// Resultados "sem asset" expiram antes para que um asset recém-publicado apareça logo.
export const STEAM_ITEMS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const STEAM_NEGATIVE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export class SteamHalt extends Error {
  constructor(reason) {
    super(`Steam: acesso interrompido nesta execução (${reason}).`);
    this.name = "SteamHalt";
    this.reason = reason;
  }
}

export function isFresh(checkedAt, ttlMs, nowMs = Date.now()) {
  const checked = Date.parse(checkedAt || "");
  return Number.isFinite(checked) && checked <= nowMs && nowMs - checked < ttlMs;
}

export function safeUrlLabel(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "requisição externa";
  }
}

/**
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl]    resolvido a cada chamada, para aceitar stubs de globalThis.fetch
 * @param {(ms:number)=>Promise<void>} [options.sleep]
 * @param {()=>number} [options.now]
 * @param {string} [options.userAgent]
 * @param {number} [options.minIntervalMs]      intervalo mínimo entre requisições à Steam
 * @param {number} [options.maxRetries]         tentativas extras para falha transitória
 * @param {number} [options.retryBaseMs]        1ª espera; dobra a cada tentativa
 * @param {number} [options.failureLimit]       requisições seguidas com falha transitória até interromper
 * @param {number} [options.cdnForbiddenLimit]  403 seguidos no CDN até interromper
 */
export function createSteamGuard({
  fetchImpl = (...args) => globalThis.fetch(...args),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  now = () => Date.now(),
  userAgent = STEAM_USER_AGENT,
  minIntervalMs = 250,
  maxRetries = 2,
  retryBaseMs = 1000,
  failureLimit = 3,
  cdnForbiddenLimit = 5,
} = {}) {
  let haltReason = null;
  let lastRequestAt = 0;
  let consecutiveFailures = 0;
  let consecutiveCdnForbidden = 0;
  let requests = 0;

  function halt(reason) {
    haltReason ??= reason;
    throw new SteamHalt(haltReason);
  }

  /**
   * @param {string|URL} url
   * @param {{kind?: "api"|"cdn", method?: string, headers?: Record<string,string>}} [options]
   *   kind "api": api.steampowered.com (403 = chave/IP barrado, interrompe).
   *   kind "cdn": *.steamstatic.com (403 isolado costuma ser objeto inexistente; só uma sequência interrompe).
   * 404 nunca é falha: é a resposta normal para "este asset não existe".
   */
  async function request(url, { kind = "api", method = "GET", headers = {} } = {}) {
    if (haltReason) throw new SteamHalt(haltReason);

    for (let attempt = 0; ; attempt += 1) {
      const wait = lastRequestAt + minIntervalMs - now();
      if (lastRequestAt && wait > 0) await sleep(wait);
      lastRequestAt = now();
      requests += 1;

      let response = null;
      let error = null;
      try {
        response = await fetchImpl(url, {
          method,
          redirect: "follow",
          headers: { ...headers, "User-Agent": userAgent },
        });
      } catch (caught) {
        error = caught;
      }

      if (response) {
        if (response.status === 429) halt("HTTP 429");
        if (kind === "api" && response.status === 403) halt("HTTP 403 na Web API");
        if (kind === "cdn" && response.status === 403) {
          consecutiveCdnForbidden += 1;
          if (consecutiveCdnForbidden >= cdnForbiddenLimit) halt(`${cdnForbiddenLimit} respostas HTTP 403 seguidas no CDN`);
          consecutiveFailures = 0;
          return response;
        }
        if (response.status < 500) {
          consecutiveFailures = 0;
          consecutiveCdnForbidden = 0;
          return response;
        }
      }

      // Falha transitória: erro de rede ou HTTP 5xx.
      if (attempt < maxRetries) {
        await sleep(retryBaseMs * 2 ** attempt);
        continue;
      }
      consecutiveFailures += 1;
      if (consecutiveFailures >= failureLimit) halt(`${failureLimit} requisições seguidas com falha`);
      if (response) return response;
      throw error;
    }
  }

  async function json(url, options = {}) {
    const response = await request(url, options);
    if (!response.ok) {
      const failure = new Error(`${safeUrlLabel(url)}: HTTP ${response.status}`);
      failure.status = response.status;
      throw failure;
    }
    return response.json();
  }

  return {
    request,
    json,
    get halted() { return haltReason; },
    stats: () => ({ requests, halted: haltReason }),
  };
}
