import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const rustUrl = process.env.RUST_BACKEND_URL || "http://127.0.0.1:8088";
  const goUrl = process.env.GO_INGEST_URL || "http://127.0.0.1:8090";
  const probe = async (url: string, path = "health") => {
    try {
      const r = await fetch(`${url}/${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };
  const [rust, go] = await Promise.all([probe(rustUrl, "ready"), probe(goUrl)]);
  const healthy = !!rust && !!go;
  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      service: "nexus-polyglot-platform",
      daemons: {
        nextjs_web: "online",
        rust_platform_core: rust ? "online" : "offline",
        go_ingest_worker: go ? "online" : "offline",
      },
      suppliers: go?.live_connectors || {},
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
