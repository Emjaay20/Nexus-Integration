import {helpDocs} from '@/lib/docsData';
import {findSupportDoc} from '@/lib/support-retrieval';
import {consumeLimit,limitedJson} from '@/lib/request-limits';
import {allowsMutation} from '@/lib/request-origin';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
// Deterministic docs mode: no model downloads, external LLM calls, or fake AI output.
export async function POST(request:Request) {
  if(!allowsMutation(request))return Response.json({error:'Cross-site requests are not allowed'},{status:403,headers});
  let body:unknown;
  try {body=await limitedJson(request,8192);} catch(e){return Response.json({error:'Invalid or oversized JSON'},{status:e instanceof Error&&e.message==='BODY_LIMIT'?413:400,headers});}
  const message=body&&typeof body==='object'&&'message'in body?body.message:null;
  if(typeof message!=='string'||!message.trim()||message.length>2000)return Response.json({error:'Enter a question of 1–2000 characters'},{status:400,headers});
  try {
    if(!await consumeLimit('public-support','global',60,60))return Response.json({error:'Support is busy. Try again shortly.'},{status:429,headers:{...headers,'Retry-After':'60'}});
    const doc=findSupportDoc(message,helpDocs);
    return Response.json({mode:'documentation',reply:doc?`${doc.content}\n\nSource: ${doc.title} (${doc.href})`:'No matching documentation found. Consult /docs or /status.',source:doc?{id:doc.id,title:doc.title,href:doc.href}:null},{headers});
  }catch{return Response.json({error:'Support temporarily unavailable'},{status:503,headers});}
}
