import { createHmac } from "node:crypto";

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
