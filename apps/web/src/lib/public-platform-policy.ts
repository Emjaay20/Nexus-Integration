// Only the public, non-persistent Studio operations can pass through this bridge.
const READ = new Set(['health', 'metrics', 'api/v1/authz/policies']);
const PREVIEW = new Set([
  'api/v1/authz/evaluate', 'api/v1/bom/parse', 'api/v1/bom/enrich',
  'api/v1/ai/sourcing-risk', 'api/v1/ai/match-alternate',
  'api/v1/agent/validate-rule', 'api/v1/agent/profile-query',
  'api/v1/ml/predict-risk', 'api/v1/ml/semantic-search',
]);
export function publicPlatformPath(method: string, segments: string[]): string | null {
  if (!segments.length || segments.some(s => !/^[a-z0-9-]+$/.test(s))) return null;
  const path = segments.join('/');
  return (method === 'GET' ? READ.has(path) : method === 'POST' && PREVIEW.has(path)) ? path : null;
}
export function previewBodyLimit(path: string): number {
  return path === 'api/v1/bom/parse' ? 1_100_000 : 64_000;
}

export function validPreviewBody(path:string,value:unknown):boolean {
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  if(path!=="api/v1/bom/enrich")return true;
  const mpns=(value as Record<string,unknown>).mpns;
  return Array.isArray(mpns)&&mpns.length>=1&&mpns.length<=25&&mpns.every(m=>typeof m==="string"&&m.trim().length>0&&m.length<=160);
}
