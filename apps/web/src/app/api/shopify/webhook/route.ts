// Maintenance gate. Do not acknowledge or dispatch unverified provider events.
// Check for active subscriptions and coordinate maintenance before deploying this gate.
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(){return Response.json({received:false,error:'Provider ingestion temporarily unavailable; no event persisted.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});}
