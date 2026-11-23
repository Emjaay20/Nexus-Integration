import {auth} from '@/auth';
import {db} from '@/lib/db';
import {allowsMutation} from '@/lib/request-origin';
import {consumeLimit,limitedJson} from '@/lib/request-limits';
import {parseTestEvent,validTestKey} from '@/lib/test-event-policy';
import {createHash,randomUUID} from 'node:crypto';
export const dynamic='force-dynamic';
// Playground only. No provider requests, retries, or connector-health mutations.
export async function POST(request:Request){
  const headers={'Cache-Control':'no-store'};
  const fail=(message:string,status:number)=>Response.json({success:false,message},{status,headers});
  if(!allowsMutation(request))return fail('Cross-site requests are not allowed',403);
  try{
    const userId=(await auth())?.user?.id;
    if(!userId)return fail('Sign in to record a test event',401);
    if(userId==='00000000-0000-0000-0000-000000000001')return fail('The shared demo is read-only',403);
    if(!await consumeLimit('playground-events',userId,30,60))return Response.json({success:false,message:'Test event limit reached'},{status:429,headers:{...headers,'Retry-After':'60'}});
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return fail('JSON required',415);
    let value:unknown;
    try{value=await limitedJson(request,16384);}catch(e){return fail('Invalid or oversized JSON',e instanceof Error&&e.message==='BODY_LIMIT'?413:400);}
    const event=parseTestEvent(value);if(!event)return fail('Invalid test event',400);
    const key=request.headers.get('idempotency-key')||randomUUID();
    if(!validTestKey(key))return fail('Idempotency-Key must be a UUID',400);
    const scopedKey=createHash('sha256').update(`nexus-test-event:${userId}:${key}`).digest('hex');
    const metadata=JSON.stringify({mode:'test',source:event.source,requested_status:event.status});
    const start=performance.now();
    const result=await db.query(`INSERT INTO activity_logs(user_id,event,integration_id,status,duration,payload,idempotency_key) VALUES($1,$2,NULL,$3,NULL,$4,$5) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,[userId,`test:${event.event}`,event.status,metadata,scopedKey]);
    let id=result.rows[0]?.id;const replay=!id;
    if(replay){const old=await db.query('SELECT id,event,status,payload FROM activity_logs WHERE user_id=$1 AND idempotency_key=$2',[userId,scopedKey]);const row=old.rows[0];if(!row||row.event!==`test:${event.event}`||row.status!==event.status||row.payload!==metadata)return fail('Idempotency key already used with a different fixture',409);id=row.id;}
    return Response.json({success:true,mode:'test',logId:id,replay,idempotencyKey:key,duration:`${Math.round(performance.now()-start)}ms`,message:'Test record saved. No provider call or retry was executed.'},{status:replay?200:201,headers});
  }catch{return fail('Test event could not be confirmed saved',503);}
}
