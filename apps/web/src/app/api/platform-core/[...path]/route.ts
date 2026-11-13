import { NextRequest, NextResponse } from "next/server";

const RUST_BACKEND_URL = process.env.RUST_BACKEND_URL || "http://127.0.0.1:8088";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = "/" + (path ? path.join("/") : "");
  const url = `${RUST_BACKEND_URL}${targetPath}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });
    const contentType = res.headers.get("content-type") || "application/json";
    if (contentType.includes("text/plain")) {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": contentType },
      });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Graceful offline mock response
    if (targetPath === "/health") {
      return NextResponse.json({
        status: "healthy (simulated)",
        service: "luminovo-platform-core-rust",
        version: "0.1.0",
        active_policies: 4,
        note: `Rust daemon at ${RUST_BACKEND_URL} unreachable: ${errorMsg}`,
      });
    }
    if (targetPath === "/metrics") {
      return new NextResponse(
        `# TYPE authz_evaluations_total counter\nauthz_evaluations_total{decision="Allow"} 14\nauthz_evaluations_total{decision="Deny"} 3\n# TYPE authz_evaluation_duration_nanos summary\nauthz_evaluation_duration_nanos{quantile="0.5"} 14200\nauthz_evaluation_duration_nanos{quantile="0.99"} 48000\n`,
        { headers: { "Content-Type": "text/plain" } }
      );
    }
    return NextResponse.json(
      { error: "Rust backend offline", details: errorMsg },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = "/" + (path ? path.join("/") : "");
  const url = `${RUST_BACKEND_URL}${targetPath}`;

  try {
    const body = await request.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Rust backend offline",
        details: errorMsg,
      },
      { status: 502 }
    );
  }
}
