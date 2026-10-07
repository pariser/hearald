import test from "node:test";
import assert from "node:assert";
import { basicAuth } from "../src/index.js";
import { sleep, listen, jsonApp, captureErrorLog } from "../harness.js";

const credentials = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

// Runs the middleware on a stand-in request and says what it did.
function attempt(middleware, { ip = "1.1.1.1", authorization } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      headers: {},
      set(k, v) { this.headers[k] = v; return this; },
      status(code) { this.code = code; return this; },
      send() { resolve({ status: this.code, headers: this.headers }); },
    };
    const req = { ip, get: (name) => (name.toLowerCase() === "authorization" ? authorization : undefined) };
    Promise.resolve(middleware(req, res, (err) => (err ? reject(err) : resolve({ status: 200 })))).catch(reject);
  });
}

test("parallel wrong guesses cannot get past the lockout", async () => {
  // verify takes a moment, as a real password hash does: the old code counted failures only after it
  const auth = basicAuth({ verify: async () => { await sleep(5); return false; }, maxFailures: 3 });
  const results = await Promise.all(Array.from({ length: 100 }, () => attempt(auth, { authorization: credentials("a", "wrong") })));
  const count = (status) => results.filter((r) => r.status === status).length;
  assert.strictEqual(count(401), 3);
  assert.strictEqual(count(429), 97);
});

test("a correct password inside the lockout window is refused too, and works once the window passes", async () => {
  let now = 0;
  const auth = basicAuth({ verify: (u, p) => p === "right", maxFailures: 2, windowMs: 1000, now: () => now });
  const wrong = { authorization: credentials("a", "wrong") };
  assert.strictEqual((await attempt(auth, wrong)).status, 401);
  assert.strictEqual((await attempt(auth, wrong)).status, 401);
  const locked = await attempt(auth, { authorization: credentials("a", "right") });
  assert.strictEqual(locked.status, 429);
  assert.strictEqual(locked.headers["Retry-After"], "1");
  now = 1000;
  assert.strictEqual((await attempt(auth, { authorization: credentials("a", "right") })).status, 200);
});

test("a correct login resets the count of wrong guesses", async () => {
  const auth = basicAuth({ verify: (u, p) => p === "right", maxFailures: 3 });
  const wrong = { authorization: credentials("a", "wrong") };
  const right = { authorization: credentials("a", "right") };
  await attempt(auth, wrong);
  await attempt(auth, wrong);
  assert.strictEqual((await attempt(auth, right)).status, 200);
  assert.strictEqual((await attempt(auth, wrong)).status, 401);
  assert.strictEqual((await attempt(auth, wrong)).status, 401);
  assert.strictEqual((await attempt(auth, wrong)).status, 401, "without the reset this would be the 5th guess: 429");
});

test("lockouts are per address", async () => {
  const auth = basicAuth({ verify: () => false, maxFailures: 1 });
  const wrong = credentials("a", "b");
  assert.strictEqual((await attempt(auth, { ip: "1.1.1.1", authorization: wrong })).status, 401);
  assert.strictEqual((await attempt(auth, { ip: "1.1.1.1", authorization: wrong })).status, 429);
  assert.strictEqual((await attempt(auth, { ip: "2.2.2.2", authorization: wrong })).status, 401);
});

test("asking without credentials is a 401 with a challenge, and does not count as a guess", async () => {
  const auth = basicAuth({ verify: () => false, maxFailures: 1, realm: "stats" });
  for (let i = 0; i < 3; i++) {
    const res = await attempt(auth);
    assert.strictEqual(res.status, 401);
    assert.match(res.headers["WWW-Authenticate"], /^Basic realm="stats"/);
  }
});

test("the Basic scheme name is case-insensitive", async () => {
  const auth = basicAuth({ verify: (u, p) => u === "admin" && p === "pw" });
  const encoded = Buffer.from("admin:pw").toString("base64");
  for (const scheme of ["Basic", "basic", "BASIC", "bAsIc"]) {
    assert.strictEqual((await attempt(auth, { authorization: `${scheme} ${encoded}` })).status, 200, scheme);
  }
  assert.strictEqual((await attempt(auth, { authorization: `Bearer ${encoded}` })).status, 401);
});

test("a password may contain a colon", async () => {
  const auth = basicAuth({ verify: (u, p) => u === "admin" && p === "a:b:c" });
  assert.strictEqual((await attempt(auth, { authorization: credentials("admin", "a:b:c") })).status, 200);
});

test("a verify that throws is a 500, not a crash, and not a wrong guess", async () => {
  let broken = true;
  const auth = basicAuth({ verify: () => { if (broken) throw new Error("db down"); return true; }, maxFailures: 1 });
  const authorization = credentials("a", "b");
  await captureErrorLog(async () => {
    for (let i = 0; i < 3; i++) assert.strictEqual((await attempt(auth, { authorization })).status, 500);
  });
  broken = false;
  assert.strictEqual((await attempt(auth, { authorization })).status, 200, "not locked out by failures that were not guesses");
});

test("a verify that rejects, on a real app, gives 500 and the server keeps running", async () => {
  const auth = basicAuth({ verify: async () => { throw new Error("db down"); } });
  const app = jsonApp();
  app.use(auth, (req, res) => res.send("in"));
  const server = await listen(app);
  try {
    await captureErrorLog(async () => {
      const res = await fetch(server.base, { headers: { Authorization: credentials("a", "b") } });
      assert.strictEqual(res.status, 500);
      assert.strictEqual((await fetch(server.base)).status, 401, "still serving");
    });
  } finally {
    await server.close();
  }
});

test("old entries are forgotten, so the table cannot grow for ever", async () => {
  let now = 0;
  const auth = basicAuth({ verify: () => false, maxFailures: 1, windowMs: 1000, maxTrackedIps: 3, now: () => now });
  const wrong = credentials("a", "b");
  assert.strictEqual((await attempt(auth, { ip: "first", authorization: wrong })).status, 401);
  assert.strictEqual((await attempt(auth, { ip: "first", authorization: wrong })).status, 429);
  for (const ip of ["b", "c", "d"]) await attempt(auth, { ip, authorization: wrong });
  assert.strictEqual((await attempt(auth, { ip: "first", authorization: wrong })).status, 401, "pushed out by newer addresses");
  assert.strictEqual((await attempt(auth, { ip: "d", authorization: wrong })).status, 429, "recent ones are still remembered");
});

test("expired entries are dropped when new addresses arrive", async () => {
  let now = 0;
  const auth = basicAuth({ verify: () => false, maxFailures: 1, windowMs: 1000, maxTrackedIps: 3, now: () => now });
  const wrong = credentials("a", "b");
  await attempt(auth, { ip: "old1", authorization: wrong });
  await attempt(auth, { ip: "old2", authorization: wrong });
  now = 5000;
  for (const ip of ["n1", "n2", "n3"]) await attempt(auth, { ip, authorization: wrong });
  // all three newcomers must still be remembered: the expired ones made room, not the newcomers
  for (const ip of ["n1", "n2", "n3"]) assert.strictEqual((await attempt(auth, { ip, authorization: wrong })).status, 429, ip);
});
