/*
 * Semana publicada pela Agenda — V48.3.68.
 *
 * Funções puras (sem rede, sem variáveis de ambiente, sem escrita em disco) usadas por
 * sync-agenda.mjs. Ficam num módulo próprio para poderem ser testadas na CI.
 *
 * Antes da V48.3.68 a semana vinha só da linha "Semana:" do Trello (ou das linhas "Data:"
 * dos cards). Se ninguém atualizasse essa linha, as listas e as lives eram sincronizadas,
 * mas as datas ficavam presas numa semana antiga. Agora a semana publicada é, nesta ordem:
 *
 *   1. "Semana: AAAA-MM-DD" (domingo) na descrição do quadro, se essa semana for a atual
 *      ou uma futura (planejar a semana seguinte continua funcionando);
 *   2. as linhas "Data:" dos cards, se alguma apontar para a semana atual ou uma futura;
 *   3. a semana atual no fuso America/Sao_Paulo (domingo a sábado).
 *
 * Uma semana que já passou nunca é publicada: ela é ignorada com um aviso. A linha
 * "Semana: automática" (ou apagar a linha) deixa a escolha sempre por conta da data de hoje.
 */

export const AGENDA_TIME_ZONE = "America/Sao_Paulo";

const AUTOMATIC_WORDS = new Set(["automatica", "automatico", "auto"]);

export function parseIsoDate(value, label) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label}: data deve usar YYYY-MM-DD.`);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error(`${label}: data inválida.`);
  }
  return date;
}

export function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date, amount) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

export function weekStartFor(date) {
  return addDays(date, -date.getUTCDay());
}

/** Dia de hoje em America/Sao_Paulo, como meia-noite UTC desse mesmo dia civil. */
export function todayInSaoPaulo(now = new Date()) {
  const text = new Intl.DateTimeFormat("en-CA", {
    timeZone: AGENDA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseIsoDate(text, "Agenda: data de hoje");
}

export function currentWeekStart(now = new Date()) {
  return weekStartFor(todayInSaoPaulo(now));
}

/**
 * Interpreta o valor da linha "Semana:" do quadro.
 * Retorna { automatic: true } para "automática" ou { date } (um domingo) para uma data.
 */
export function parseWeekSetting(value) {
  const text = String(value ?? "").trim();
  const key = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

  // "Semana:" em branco também significa automática.
  if (!key || AUTOMATIC_WORDS.has(key)) return { automatic: true };

  const date = parseIsoDate(text, "Trello Agenda: Semana");
  if (date.getUTCDay() !== 0) throw new Error("Trello Agenda: Semana: deve apontar para um domingo.");
  return { date };
}

/**
 * Escolhe a semana publicada.
 *
 * @param {object} input
 * @param {Date|null} input.boardWeek  domingo da linha "Semana:" (null se ausente/automática)
 * @param {{title: string, date: string}[]} input.cardDates  "Data:" dos cards que a declaram
 * @param {Date} input.now  relógio (injetável nos testes)
 * @returns {{weekStart: Date, source: "semana"|"cards"|"automatica", current: Date, warnings: string[]}}
 */
export function resolveWeekStart({ boardWeek = null, cardDates = [], now = new Date() } = {}) {
  const current = currentWeekStart(now);
  const warnings = [];
  const label = date => formatIsoDate(date);

  if (boardWeek) {
    if (boardWeek.getTime() >= current.getTime()) {
      return { weekStart: boardWeek, source: "semana", current, warnings };
    }
    warnings.push(
      `Semana: ${label(boardWeek)} na descrição do quadro já passou; a Agenda usa a semana atual (${label(current)}). ` +
      "Escreva Semana: automática ou apague a linha para não ver este aviso."
    );
  }

  // "Data:" de uma semana que já passou é sobra do quadro e não escolhe a semana; o sync
  // avisa card a card (checkCardDate devolve "stale").
  const weeks = new Map();
  for (const item of cardDates) {
    const start = weekStartFor(parseIsoDate(item.date, `Trello Agenda: Data de "${item.title}"`));
    if (start.getTime() >= current.getTime()) weeks.set(start.getTime(), start);
  }

  if (weeks.size > 1) {
    throw new Error("Trello Agenda: existem cards de semanas diferentes; ajuste Semana:/Data: antes de publicar.");
  }

  if (weeks.size === 1) {
    return { weekStart: [...weeks.values()][0], source: "cards", current, warnings };
  }

  return { weekStart: current, source: "automatica", current, warnings };
}

/**
 * Valida o "Data:" de um card contra o dia da lista. Uma Data: anterior à semana publicada
 * é sobra de uma semana antiga e é ignorada (retorna "stale"); uma Data: dentro da semana,
 * mas no dia errado, ou em semana posterior continua sendo erro.
 */
export function checkCardDate({ date, expectedDate, weekStart }) {
  if (!date || date === expectedDate) return "ok";
  const cardWeek = weekStartFor(parseIsoDate(date, "Trello Agenda: Data"));
  return cardWeek.getTime() < weekStart.getTime() ? "stale" : "mismatch";
}
