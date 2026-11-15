import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/lib/request-origin.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { allowsMutation } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
test("workspace changes reject cross-site, invalid, and downgraded browser origins", () => {
  const request = (headers) =>
    new Request("https://nexus.example/api/workspace/boms", {
      method: "POST",
      headers: { host: "nexus.example", ...headers },
    });
  assert.equal(
    allowsMutation(request({ origin: "https://nexus.example" })),
    true,
  );
  assert.equal(
    allowsMutation(request({ origin: "https://other.example" })),
    false,
  );
  assert.equal(
    allowsMutation(request({ origin: "http://nexus.example" })),
    false,
  );
  assert.equal(allowsMutation(request({ origin: "null" })), false);
  assert.equal(
    allowsMutation(request({ "sec-fetch-site": "cross-site" })),
    false,
  );
  assert.equal(allowsMutation(request({})), true);
});
