/** Licensed supplier-feed preview. No uncontrolled crawling or automatic purchasing. */
import {SUPPLIERS,COUNTRIES,CURRENCIES,productUrl,type Country,type Currency,type Supplier} from './model';
export class FeedError extends Error {constructor(readonly code:string){super(code)}}
export type FeedPolicy={authorizationRef:string;url:string;allowedCountries:Country[];tokenEnv?:string};
export type FeedCandidate={supplierId:string;mpn:string;manufacturer:string;currency:Currency;unitPrice:string;stock:number|null;moq:number|null;validUntil:string;sourceUrl:string;observedAt:string;authorizationRef:string;reviewRequired:true;origin:'partner_feed'};
export function feedPolicies(raw:string|undefined):Map<string,FeedPolicy>{
  const m=new Map<string,FeedPolicy>();if(!raw)return m;
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw new FeedError('invalid_feed_configuration');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new FeedError('invalid_feed_configuration');
  for(const [id,unknownPolicy] of Object.entries(parsed)){
    const supplier=SUPPLIERS.find(s=>s.id===id);
    if(!supplier||!unknownPolicy||typeof unknownPolicy!=='object'||Array.isArray(unknownPolicy))throw new FeedError('unknown_feed_supplier');
    const p=unknownPolicy as Record<string,unknown>;
    if(typeof p.authorizationRef!=='string'||p.authorizationRef.trim().length<8||p.authorizationRef.length>160)throw new FeedError('missing_supplier_authorization');
    if(typeof p.url!=='string'||p.url.length>1000)throw new FeedError('invalid_feed_url');
    let u:URL;try{u=new URL(p.url);}catch{throw new FeedError('invalid_feed_url');}
    if(u.protocol!=='https:'||u.origin!==supplier.origin||u.pathname==='/'||u.username||u.password||u.search||u.hash||u.href!==p.url||/%(?:2f|5c|2e|25)/i.test(p.url)||p.url.includes('\\'))throw new FeedError('invalid_feed_url');
    if(!Array.isArray(p.allowedCountries)||!p.allowedCountries.length||p.allowedCountries.length>6||p.allowedCountries.some(c=>!COUNTRIES.includes(c as Country)))throw new FeedError('invalid_feed_countries');
    if(p.tokenEnv!==undefined&&(typeof p.tokenEnv!=='string'||!/^NEXUS_PARTNER_FEED_TOKEN_[A-Z0-9_]{2,45}$/.test(p.tokenEnv)))throw new FeedError('invalid_feed_token_reference');
    m.set(id,{authorizationRef:p.authorizationRef.trim(),url:p.url,allowedCountries:p.allowedCountries as Country[],...(p.tokenEnv?{tokenEnv:p.tokenEnv as string}:{})});
  }
  return m;
}
export function feedAvailable(env:NodeJS.ProcessEnv=process.env):boolean {return env.NEXUS_REGIONAL_FEEDS_ENABLED==='true'&&env.NEXUS_PARTNER_FEED_EGRESS_VERIFIED==='true';}
export function validateFeed(payload:unknown,supplier:Supplier,policy:FeedPolicy,part:{partNumber:string;manufacturer:string},country:Country,now=Date.now()):FeedCandidate[]{
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new FeedError('invalid_partner_feed');
  const body=payload as Record<string,unknown>;
  if(body.schemaVersion!==1||body.supplierId!==supplier.id||typeof body.generatedAt!=='string'||!Array.isArray(body.products)||body.products.length>300)throw new FeedError('invalid_partner_feed');
  const date=Date.parse(body.generatedAt);
  if(!Number.isFinite(date)||date>now+60_000||now-date>72*3600_000)throw new FeedError('stale_partner_feed');
  const candidates:FeedCandidate[]=[];
  for(const row of body.products){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    const p=row as Record<string,unknown>;
    if(typeof p.mpn!=='string'||p.mpn.trim().toUpperCase()!==part.partNumber.trim().toUpperCase())continue;
    if(typeof p.manufacturer!=='string'||!p.manufacturer.trim()||part.manufacturer&&p.manufacturer.trim().toUpperCase()!==part.manufacturer.trim().toUpperCase())continue;
    if(typeof p.currency!=='string'||!CURRENCIES.includes(p.currency as Currency)||typeof p.unitPrice!=='string'||!/^\d{1,10}(?:\.\d{1,4})?$/.test(p.unitPrice)||Number(p.unitPrice)<=0)continue;
    if(!Array.isArray(p.deliveryCountries)||!p.deliveryCountries.includes(country))continue;
    if(typeof p.validUntil!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(p.validUntil))continue;
    const expiry=Date.parse(p.validUntil);
    if(!Number.isFinite(expiry)||expiry<=now||expiry>now+90*86400_000)continue;
    if(p.stock!==null&&(!Number.isSafeInteger(p.stock)||Number(p.stock)<0||Number(p.stock)>1e9))continue;
    if(p.moq!==null&&(!Number.isSafeInteger(p.moq)||Number(p.moq)<1||Number(p.moq)>1e6))continue;
    let sourceUrl:string;
    try{const u=productUrl(supplier,p.sourceUrl);if(u.search)continue;sourceUrl=u.href;}catch{continue;}
    candidates.push({supplierId:supplier.id,mpn:p.mpn.trim(),manufacturer:p.manufacturer.trim(),currency:p.currency as Currency,unitPrice:p.unitPrice,stock:p.stock as number|null,moq:p.moq as number|null,validUntil:p.validUntil,sourceUrl,observedAt:body.generatedAt,authorizationRef:policy.authorizationRef,reviewRequired:true,origin:'partner_feed'});
    if(candidates.length>=5)break;
  }
  return candidates;
}
async function limitedJson(res:Response):Promise<unknown>{
  if(!res.ok){await res.body?.cancel();throw new FeedError('partner_feed_unavailable');}
  const ct=res.headers.get('content-type')||'';
  if(!/^application\/(?:json|[a-z0-9._-]+\+json)(?:\s*;|\s*$)/i.test(ct)){await res.body?.cancel();throw new FeedError('partner_feed_wrong_content_type');}
  const reader=res.body?.getReader();if(!reader)throw new FeedError('partner_feed_empty');
  const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>500_000)throw new FeedError('partner_feed_too_large');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}catch{await reader.cancel().catch(()=>{});throw new FeedError('partner_feed_invalid');}finally{reader.releaseLock();}
}
export async function getFeedCandidates(supplier:Supplier,policy:FeedPolicy,part:{partNumber:string;manufacturer:string},country:Country,env:NodeJS.ProcessEnv=process.env,fetcher:typeof fetch=fetch,now=Date.now()):Promise<FeedCandidate[]>{
  if(!feedAvailable(env)||!policy.allowedCountries.includes(country))throw new FeedError('partner_feed_not_authorized');
  const headers:Record<string,string>={Accept:'application/json'};
  if(policy.tokenEnv){const token=env[policy.tokenEnv];if(!token||token.length<16)throw new FeedError('partner_feed_token_missing');headers.Authorization=`Bearer ${token}`;}
  let res:Response;
  try{res=await fetcher(policy.url,{method:'GET',headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});}catch{throw new FeedError('partner_feed_unavailable');}
  return validateFeed(await limitedJson(res),supplier,policy,part,country,now);
}
