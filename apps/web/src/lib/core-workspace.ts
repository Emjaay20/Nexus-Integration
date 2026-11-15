import "server-only";
import { allowsMutation } from "@/lib/request-origin";
import { randomUUID } from "node:crypto";
import { createCoreAssertion } from "@/lib/core-assertion";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Roles and workspaces are not carried in this assertion: Rust loads them from storage.
async function provisionPersonalWorkspace(userId: string) {
  // Existing legacy organization labels and roles were self-selected. New workspaces
  // start isolated; only a workspace owner can grant another user membership.
  await db.transaction(async (client) => {
    const existing = await client.query(
      "SELECT 1 FROM platform_user_context WHERE user_id=$1",
      [userId],
    );
    if (existing.rowCount) return;
    const user = await client.query("SELECT id FROM users WHERE id=$1", [
      userId,
    ]);
    if (!user.rowCount) throw new Error("No persisted user");
    await client.query(
      "INSERT INTO platform_workspaces(id,name) VALUES($1,'My workspace') ON CONFLICT DO NOTHING",
      [userId],
    );
    const role =
      userId === "00000000-0000-0000-0000-000000000001" ? "viewer" : "owner";
    await client.query(
      "INSERT INTO platform_memberships(workspace_id,user_id,role) VALUES($1,$1,$2) ON CONFLICT DO NOTHING",
      [userId, role],
    );
    if (role === "viewer")
      await client.query(
        "INSERT INTO platform_boms(id,workspace_id,created_by,name,items) VALUES($1,$2,$2,'Sample controller board',$3) ON CONFLICT DO NOTHING",
        [
          "00000000-0000-4000-8000-000000000002",
          userId,
          JSON.stringify([
            {
              partNumber: "STM32F401RET6",
              quantity: 10,
              manufacturer: "STMicroelectronics",
              description: "Illustrative demo BOM",
            },
          ]),
        ],
      );
    await client.query(
      "INSERT INTO platform_user_context(user_id,workspace_id) VALUES($1,$1) ON CONFLICT DO NOTHING",
      [userId],
    );
  });
}
export async function forwardWorkspace(
  path: string,
  request?: Request,
  override?: { method: string; body?: unknown },
) {
  const requestId = request?.headers.get("x-request-id");
  const traceId = requestId && uuid.test(requestId) ? requestId : randomUUID();
  const headers = { "X-Request-ID": traceId, "Cache-Control": "no-store" };
  if (request && !allowsMutation(request))
    return Response.json(
      { error: "Cross-site changes are not allowed" },
      { status: 403, headers },
    );
  const session = await auth();
  if (!session?.user?.id || !uuid.test(session.user.id))
    return Response.json(
      { error: "Sign in to access this workspace" },
      { status: 401, headers },
    );
  const method = override?.method || request?.method || "GET";
  try {
    const secret =
      process.env.CORE_AUTH_SECRET ||
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "";
    const assertion = createCoreAssertion(session.user.id, secret);
    await provisionPersonalWorkspace(session.user.id);
    let body: string | undefined;
    if (override?.body !== undefined) body = JSON.stringify(override.body);
    else if (request && !["GET", "HEAD"].includes(method))
      body = await request.text();
    if (body && Buffer.byteLength(body) > 2_000_000)
      return Response.json(
        { error: "Request exceeds 2MB" },
        { status: 413, headers },
      );
    const upstream = await fetch(
      `${process.env.RUST_BACKEND_URL || "http://127.0.0.1:8088"}/api/v1/workspace/${path}`,
      {
        method,
        headers: {
          ...headers,
          Authorization: `Bearer ${assertion}`,
          "Content-Type": "application/json",
          ...(request?.headers.get("idempotency-key")
            ? { "Idempotency-Key": request.headers.get("idempotency-key")! }
            : {}),
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    console.info(
      JSON.stringify({
        service: "workspace-bridge",
        request_id: traceId,
        method,
        path: path.replace(/[0-9a-f-]{36}/g, ":id"),
        status: upstream.status,
      }),
    );
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch {
    console.error(
      JSON.stringify({
        service: "workspace-bridge",
        request_id: traceId,
        error: "workspace request unavailable",
      }),
    );
    return Response.json(
      {
        error:
          "Workspace temporarily unavailable. Your changes have not been confirmed saved.",
        request_id: traceId,
      },
      { status: 503, headers },
    );
  }
}
