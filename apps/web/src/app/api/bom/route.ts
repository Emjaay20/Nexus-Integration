import { forwardWorkspace } from "@/lib/core-workspace";
export const dynamic = "force-dynamic";
// Compatibility adapter for the importer. Rust validates all rows and derives ownership.
export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  return forwardWorkspace("boms", request, {
    method: "POST",
    body: { name: body.filename, items: body.data },
  });
}
export async function GET(request: Request) {
  const response = await forwardWorkspace("boms", request);
  if (!response.ok) return response;
  const boms = await response.json();
  return Response.json(
    boms.map(
      (bom: {
        id: string;
        name: string;
        item_count: number;
        created_at: string;
      }) => ({
        id: bom.id,
        filename: bom.name,
        total_rows: bom.item_count,
        valid_rows: bom.item_count,
        invalid_rows: 0,
        warning_rows: 0,
        created_at: bom.created_at,
      }),
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
