import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/lib/core-assertion.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { createCoreAssertion } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
test("core assertions contain only subject, audience, and a short lifetime", () => {
  const secret = "fixture-secret-at-least-thirty-two-characters";
  const subject = "11111111-1111-4111-8111-111111111111";
  const [payload, signature] = createCoreAssertion(subject, secret, 1000).split(
    ".",
  );
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url").toString()), {
    sub: subject,
    iat: 1000,
    exp: 1030,
    aud: "nexus-workspace",
  });
  assert.equal(
    signature,
    createHmac("sha256", secret).update(payload).digest("base64url"),
  );
  assert.throws(() => createCoreAssertion(subject, "short"));
  assert.throws(() =>
    createCoreAssertion(subject, "nexus-build-placeholder-secret-32-chars"),
  );
});
