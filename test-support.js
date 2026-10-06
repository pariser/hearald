import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import express from "express";

export const tempDir = () => mkdtemp(join(tmpdir(), "hearald-"));

export async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export const jsonApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};
