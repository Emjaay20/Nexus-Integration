import { createHmac } from "node:crypto";

// Persisted PostgreSQL UUIDs include the legacy demo ID, whose version bits are zero.
export function isWorkspaceUserId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function createCoreAssertion(
  userId: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (secret.length < 32 || secret.includes("build-placeholder"))
    throw new Error("Workspace signing is not configured");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iat: now,
      exp: now + 30,
      aud: "nexus-workspace",
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
