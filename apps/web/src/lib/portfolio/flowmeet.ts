/** Public portfolio integration contract.
 * Booking URL is intentionally restricted to the known FlowMeet host and /book/<slug>.
 * AetherHost's documented founder calendar is the fallback until a dedicated Nexus
 * calendar slug is explicitly provisioned in FlowMeet. No invented slug.
 */
export const FLOWMEET_ORIGIN='https://flowmeet.aetherhost.app';
export const FALLBACK_BOOKING_URL=FLOWMEET_ORIGIN+'/book/aetherhost';
export const FLOWMEET_LEADS_URL=FLOWMEET_ORIGIN+'/api/leads';
export type InquiryInterest='engineering_discussion'|'collaboration'|'recruiting'|'demo_request';
export const INQUIRY_INTERESTS:Readonly<Record<InquiryInterest,string>>={
 engineering_discussion:'Engineering discussion',
 collaboration:'Collaboration',
 recruiting:'Recruiting / interview',
 demo_request:'Nexus demonstration'
};
export class ContactInputError extends Error{}
export function bookingUrl(raw:string|undefined):string{
 if(!raw)return FALLBACK_BOOKING_URL;
 try{
  const u=new URL(raw);
  if(u.origin!==FLOWMEET_ORIGIN||u.username||u.password||u.search||u.hash||!/^\/book\/[a-z0-9][a-z0-9-]{0,62}$/.test(u.pathname))throw Error('Invalid path');
  return u.href;
 }catch{throw new ContactInputError('NEXUS_FLOWMEET_BOOKING_URL must be an HTTPS /book/<slug> URL on the configured FlowMeet host');}
}
export function bookingSlug(url:string){return new URL(url).pathname.split('/').at(-1)||'aetherhost';}
export type ContactRequest={
 name:string;email:string;company:string;region:string;interest:InquiryInterest;
 consent:true;website:string;requestKey:string;
};
const text=(value:unknown,max:number,label:string,required=false):string=>{
 if(typeof value!=='string'||value.length>max*2)throw new ContactInputError('Invalid '+label);
 const result=value.trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
 if(required&&!result)throw new ContactInputError(label+' is required');
 return result;
};
export function parseContact(value:unknown):ContactRequest{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ContactInputError('Invalid enquiry');
 const o=value as Record<string,unknown>;
 if(o.consent!==true)throw new ContactInputError('Permission to share this enquiry with FlowMeet is required');
 const name=text(o.name,120,'name',true),email=text(o.email,254,'email',true).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ContactInputError('Enter a valid email address');
 const interest=o.interest;
 if(typeof interest!=='string'||!Object.prototype.hasOwnProperty.call(INQUIRY_INTERESTS,interest))throw new ContactInputError('Choose a valid enquiry type');
 const requestKey=o.requestKey;
 if(typeof requestKey!=='string'||!(/^[a-zA-Z0-9_-]{12,128}$/).test(requestKey))throw new ContactInputError('Invalid request identity');
 return {name,email,company:text(o.company||'',120,'company'),region:text(o.region||'',60,'region'),
  interest:interest as InquiryInterest,consent:true,website:text(o.website||'',120,'website'),requestKey};
}
export function toFlowMeetLead(input:ContactRequest){
 return {name:input.name,email:input.email,company:input.company,
  role:'Nexus / '+INQUIRY_INTERESTS[input.interest],
  region:input.region,
  send_booking_email:false};
}
export function captureConfigured(env:NodeJS.ProcessEnv=process.env){
 return typeof env.NEXUS_FLOWMEET_API_KEY==='string'&&env.NEXUS_FLOWMEET_API_KEY.length>=32
  &&env.NEXUS_FLOWMEET_CAPTURE_ENABLED==='true';
}
