import {allowsMutation} from '@/lib/request-origin';
import {limitedJson,consumeLimit} from '@/lib/request-limits';
import {captureConfigured,parseContact,toFlowMeetLead,FLOWMEET_LEADS_URL,ContactInputError} from '@/lib/portfolio/flowmeet';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers});
/** Public form: cross-site requests, bots, volume and large inputs fail closed.
 * No service API key enters the browser and no raw lead data is logged.
 */
export async function POST(req:Request){
 try{
  if(!allowsMutation(req))return respond({error:'Please submit the enquiry from this website.'},403);
  if(!captureConfigured())return respond({error:'Direct enquiry is not configured. Please use the FlowMeet booking link instead.'},503);
  const candidate=parseContact(await limitedJson(req,4096));
  if(candidate.website)return respond({ok:true,notice:'Your request was received.'}); // Honeypot: no downstream event
  // Counters are workspace-independent and backed by DB. No client-supplied identity is trusted for authorization.
  if(!await consumeLimit('portfolio_contact_email',candidate.email,3,3600)||
     !await consumeLimit('portfolio_contact_global','global',60,3600))
   return respond({error:'Enquiry limit reached. You can still use the FlowMeet booking link.'},429);
  const response=await fetch(FLOWMEET_LEADS_URL,{
   method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{'Content-Type':'application/json','x-api-key':process.env.NEXUS_FLOWMEET_API_KEY!,
    'Idempotency-Key':candidate.requestKey},
   body:JSON.stringify(toFlowMeetLead(candidate))
  });
  // FlowMeet itself enforces API-key workspace ownership and deduplicates by key.
  if(response.status===409)return respond({error:'This enquiry identity was already used for different details. Please start a fresh request.'},409);
  if(response.status===429)return respond({error:'FlowMeet is currently rate-limiting enquiries.'},429);
  if(!response.ok)return respond({error:'FlowMeet could not confirm your enquiry. Retry with the same details or use the booking link.'},503);
  const data=await response.json().catch(()=>null);
  if(!data||data.success!==true)return respond({error:'FlowMeet did not confirm the enquiry. Retry with the same details.'},503);
  return respond({ok:true,notice:'Your enquiry was recorded in FlowMeet. No meeting is booked until you choose a time.'});
 }catch(e){
  if(e instanceof ContactInputError||e instanceof SyntaxError)return respond({error:e instanceof ContactInputError?e.message:'Invalid form data.'},400);
  if(e instanceof Error&&e.message==='BODY_LIMIT')return respond({error:'Enquiry exceeds the permitted size.'},413);
  return respond({error:'Delivery could not be confirmed. Retry with the same details or use the booking link.'},503);
 }
}
