// Browser mutations must come from this host. Non-browser clients may omit Origin;
// they still need a valid authenticated session. Never trust a browser-supplied role.
export function allowsMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const supplied = new URL(origin);
    const host = request.headers.get("host") || new URL(request.url).host;
    if (supplied.host.toLowerCase() !== host.toLowerCase()) return false;
    const secure =
      new URL(request.url).protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https";
    return !secure || supplied.protocol === "https:";
  } catch {
    return false;
  }
}
