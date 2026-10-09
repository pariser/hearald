import test from "node:test";
import assert from "node:assert";
import { fetchChartData } from "../src/public/js/util.js";

// What a brand-new install returns for a day: no events, so no metrics for any context.
const run = async (getDataFn, opts = {}) => {
  let result;
  await fetchChartData({
    numDays: 3,
    date: "2024-05-03",
    chartContext: "all",
    chartField: "users",
    getDataFn,
    onLoadProgress: () => {},
    onLoadComplete: (data, max) => (result = { data, max }),
    ...opts,
  });
  return result;
};

test("fetchChartData charts zeros when the server returns no metrics yet", async () => {
  for (const empty of [{}, { metrics: {} }, { metrics: { all: {} } }, null]) {
    const { data, max } = await run(async () => empty);
    assert.deepStrictEqual(
      data.map((d) => [d.date, d.value]),
      [["2024-05-01", 0], ["2024-05-02", 0], ["2024-05-03", 0]]
    );
    assert.strictEqual(max, 1);
  }
});

test("fetchChartData still reads real values", async () => {
  const { data, max } = await run(async ({ d }) => ({
    metrics: { all: { users: d.endsWith("02") ? 5 : 2 } },
  }));
  assert.deepStrictEqual(data.map((d) => d.value), [2, 5, 2]);
  assert.strictEqual(max, 5);
});

test("fetchChartData treats an unknown chart context as no data", async () => {
  const { data } = await run(async () => ({ metrics: { all: { users: 4 } } }), {
    chartContext: "nope",
  });
  assert.deepStrictEqual(data.map((d) => d.value), [0, 0, 0]);
});
