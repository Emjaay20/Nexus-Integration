import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { consumeLimit, limitedJson } from '@/lib/request-limits';
import { allowsMutation } from '@/lib/request-origin';
import { publicPlatformPath, previewBodyLimit, validPreviewBody } from '@/lib/public-platform-policy';
export const dynamic = 'force-dynamic';
const backend = process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8088';
async function proxy(request: NextRequest, {params}: {params: Promise<{path: string[]}>}) {
  const requestId = randomUUID();
  const headers = {'Cache-Control':'no-store','X-Request-ID':requestId};
  const fail = (error: string, status: number, extra: Record<string,string> = {}) => Response.json({error,request_id:requestId},{status,headers:{...headers,...extra}});
  const path = publicPlatformPath(request.method,(await params).path);
  if (!path) return fail('Unknown public Studio operation',404);
  if (!allowsMutation(request)) return fail('Cross-site requests are not allowed',403);
  let body: string | undefined;
  try {
    // Shared budget protects anonymous preview and provider costs across replicas.
    // It is deliberately conservative; add trusted per-client throttling at ingress.
    if (!await consumeLimit(path==='api/v1/bom/enrich'?'public-studio-enrich':'public-studio','global',path==='api/v1/bom/enrich'?20:120,60)) return fail('Preview limit reached. Retry shortly.',429,{'Retry-After':'60'});
    if (request.method==='POST') {
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return fail('JSON required',415);
      try { const input=await limitedJson(request,previewBodyLimit(path)); if(!validPreviewBody(path,input))return fail(path==='api/v1/bom/enrich'?'Preview accepts 1–25 part numbers (max 160 characters each)':'Expected a JSON object',400);body=JSON.stringify(input); }
      catch(e) { return fail('Invalid or oversized JSON',e instanceof Error&&e.message==='BODY_LIMIT'?413:400); }
    }
    const upstream=await fetch(`${backend}/${path}`,{
      method:request.method,body,cache:'no-store',redirect:'error',
      signal:AbortSignal.timeout(path==='api/v1/bom/enrich'?45_000:12_000),
      headers:{'Content-Type':'application/json','X-Request-ID':requestId},
    });
    const type=upstream.headers.get('content-type')||'';
    if (upstream.status>=500) return fail('Sourcing service temporarily unavailable',503);
    if (!type.includes('application/json')&&!type.includes('text/plain')) return fail('Unexpected sourcing response',502);
    return new Response(await upstream.text(),{status:upstream.status,headers:{...headers,'Content-Type':type}});
  } catch { return fail('Sourcing service temporarily unavailable',503); }
}
export {proxy as GET,proxy as POST};
