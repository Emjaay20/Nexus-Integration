// Keep sign-in navigation on this host, including legacy absolute callback URLs.
export function loginTarget(raw: string | null): string {
  if (!raw) return "/workspace";
  try {
    const base = "https://nexus.invalid";
    let path = raw;
    if (!raw.startsWith("/")) {
      const absolute = new URL(raw);
      if (!["http:", "https:"].includes(absolute.protocol)) return "/workspace";
      path = absolute.pathname + absolute.search;
    }
    if (/[\\\u0000-\u001f\u007f]/.test(path)) return "/workspace";
    const target = new URL(path, base);
    if (target.origin !== base || target.pathname === "/login") return "/workspace";
    return target.pathname + target.search;
  } catch {
    return "/workspace";
  }
}
