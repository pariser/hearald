// Runs the whole test suite against Express 4 when HEARALD_EXPRESS=4 (Express 5 otherwise).
// hearald takes `express` as a peer dependency, so the tests must exercise both major versions.
// Both are installed as dev dependencies (`express` is 5, `express4` is an alias of Express 4);
// this hook points every `import "express"`, in src and in the tests alike, at the chosen one.
import { register } from "node:module";

register("./express-hooks.js", import.meta.url, {
  data: { express: process.env.HEARALD_EXPRESS === "4" ? "express4" : "express" },
});
