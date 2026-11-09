import { iso } from "../../shared/utils.js";

/* START methods for fetching data from the server */

export const dataCache = {};

// Fetches data from the server with caching
export async function getData({ n, d, q, endpointBuilder, fetchStats }) {
  const key = [n, d, q].join("_");
  if (dataCache[key]) {
    return dataCache[key];
  }

  const endpoint = endpointBuilder
    ? endpointBuilder(n, d, q)
    : `/data/${n}/${d}${q ? "?" + q : ""}`;

  const data = await fetchStats(endpoint);
  dataCache[key] = data;
  return data;
}

// Fetches and builds chart data for a given field/context over a time window
export async function fetchChartData({
  numDays,
  date,
  chartContext,
  chartField,
  getDataFn,

  onLoadProgress, // (i, n) => void
  onLoadComplete, // (data, max) => void
}) {
  const n = numDays;
  const d = date;
  const field = chartField;
  const context = chartContext;

  const [yyyy, mm, dd] = d.split("-");
  const startDate = new Date(yyyy, mm - 1, dd);

  let data = [];
  let max = 1;

  for (let i = 0; i < n; i++) {
    let day = new Date(startDate);
    day.setDate(startDate.getDate() - i);
    onLoadProgress(i, n);

    const json = await getDataFn({ n: 1, d: iso(day) });
    const v = json?.metrics?.[context]?.[field] || 0;

    data.unshift({ date: iso(day), value: v });
    max = Math.max(max, v);
  }

  onLoadComplete(data, max);
}

// Fetches and sets the main stats data for a given date/range
export async function fetchData({
  numDays,
  date,
  getDataFn,
  onLoadComplete, // (stats) => void
}) {
  const n = numDays;
  const d = date;
  const stats = await getDataFn({ n, d });
  onLoadComplete(stats);
}

/* END methods for fetching data from the server */

// Keeps the preferred chart field/context when they exist, otherwise falls back to the first
// available one, so the menus (which show the first option when nothing matches) and the chart agree.
export function resolveChartDefaults({ chartField, chartContext, stats, contexts }) {
  const fields = Object.keys(stats?.metrics?.all || {});
  const contextIds = (contexts || []).map((c) => c.id);
  return {
    chartField: fields.length && !fields.includes(chartField) ? fields[0] : chartField,
    chartContext:
      contextIds.length && !contextIds.includes(chartContext) ? contextIds[0] : chartContext,
  };
}

/* START helper methods */

export const getJson = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
  return response.json();
};

export const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: "post",
    body: JSON.stringify(body),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
  return response.json();
};

export const deepGet = (obj, path) => {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length; i += 1) {
    if (current == null) return undefined;
    current = current[parts[i]];
  }
  return current;
};

export function numFormatter(n) {
  if (typeof Intl !== "undefined" && Intl.NumberFormat) {
    return new Intl.NumberFormat().format(n);
  }
  return n;
}

/* END helper methods */
