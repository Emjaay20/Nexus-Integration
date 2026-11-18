import { forwardWorkspace } from "@/lib/core-workspace";
export const dynamic = "force-dynamic";
const id = "[0-9a-fA-F-]{36}";
const allowed = new RegExp(
  `^(context|boms(?:/${id})?|members(?:/${id})?|audit|jobs(?:/${id}(?:/(?:cancel|brief))?)?)$`,
);
async function proxy(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const target = path.join("/");
  if (!allowed.test(target))
    return Response.json(
      { error: "Unknown workspace operation" },
      { status: 404 },
    );
  return forwardWorkspace(target, request);
}
export { proxy as GET, proxy as POST, proxy as PUT };
