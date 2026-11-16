import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/login-target.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { loginTarget } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
test("login callbacks preserve local destinations and legacy URL paths", () => {
  assert.equal(loginTarget("/workspace?tab=jobs"), "/workspace?tab=jobs");
  assert.equal(loginTarget("https://nexus-integration.aetherhost.com.ng/workspace?tab=jobs"), "/workspace?tab=jobs");
  assert.equal(loginTarget("https://external.example/bom-importer"), "/bom-importer");
});
test("login callbacks cannot navigate to an external host or executable URL", () => {
  for (const value of [null, "", "//evil.example", "/\\evil.example", "/\n/evil.example", "javascript:alert(1)", "data:text/html,hi", "/login"]) assert.equal(loginTarget(value), "/workspace", value);
});
