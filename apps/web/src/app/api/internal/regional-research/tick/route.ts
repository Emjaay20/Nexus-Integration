import {validToken,clockConfigured,tickResearch} from '@/lib/regional/research-schedules';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 if(!clockConfigured())return Response.json({error:'Scheduler disabled'},{status:503,headers});
 if(!validToken(request.headers.get('authorization')))return Response.json({error:'Unauthorized'},{status:401,headers});
 if(request.headers.get('content-length')&&Number(request.headers.get('content-length'))>0)return Response.json({error:'No request body accepted'},{status:400,headers});
 try{
  const result=await tickResearch(3);
  return Response.json(result,{headers});
 }catch{
  return Response.json({error:'Scheduler tick failed; consult restricted operator logs for reservations.'},{status:503,headers});
 }
}
