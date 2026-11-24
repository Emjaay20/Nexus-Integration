/** Reference FX lookup. Never represents an executable or guaranteed rate. */
export const SUPPORTED_FX = ['NGN','USD','GBP','EUR','ZAR','CNY'] as const;
export type FxCurrency = typeof SUPPORTED_FX[number];
export type FxReference = {base:FxCurrency;quote:FxCurrency;rate:string;date:string;retrievedAt:string;source:string;sourceUrl:string;referenceOnly:true};
export class FxError extends Error { constructor(readonly code:string){super(code)} }
export function fxCurrency(value:unknown):FxCurrency {
  if (typeof value!=='string'||!SUPPORTED_FX.includes(value as FxCurrency)) throw new FxError('unsupported_currency');
  return value as FxCurrency;
}
export function referenceEndpoint(base:FxCurrency,quote:FxCurrency):string {
  const source=base==='NGN'||quote==='NGN'?'providers/cbn/':'';
  return `https://api.frankfurter.dev/v2/${source}rate/${base.toLowerCase()}/${quote.toLowerCase()}`;
}
export function validateReference(value:unknown,base:FxCurrency,quote:FxCurrency,sourceUrl:string,now=Date.now()):FxReference {
  if (!value||typeof value!=='object'||Array.isArray(value))throw new FxError('invalid_fx_payload');
  const d=value as Record<string,unknown>;
  if (d.base!==base||d.quote!==quote||typeof d.rate!=='number'||!Number.isFinite(d.rate)||d.rate<=0||d.rate>1e9)throw new FxError('invalid_fx_pair');
  if (typeof d.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw new FxError('invalid_fx_date');
  const stamp=Date.parse(`${d.date}T00:00:00Z`);
  if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==d.date||stamp>now+24*3600_000||now-stamp>8*86400_000)throw new FxError('stale_fx_reference');
  const rate=d.rate.toFixed(6);
  if(Number(rate)<=0)throw new FxError('fx_precision_unavailable');
  return {base,quote,rate,date:d.date,retrievedAt:new Date(now).toISOString(),source:sourceUrl.includes('/providers/cbn/')?'CBN reference via Frankfurter':'Frankfurter blended reference',sourceUrl,referenceOnly:true};
}
export async function getFxReference(base:FxCurrency,quote:FxCurrency,fetcher:typeof fetch=fetch,now=Date.now()):Promise<FxReference>{
  if(base===quote)return {base,quote,rate:'1.000000',date:new Date(now).toISOString().slice(0,10),retrievedAt:new Date(now).toISOString(),source:'Identity conversion',sourceUrl:'',referenceOnly:true};
  const url=referenceEndpoint(base,quote);
  let result:Response;
  try{result=await fetcher(url,{method:'GET',headers:{Accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(7000)});}catch{throw new FxError('fx_provider_unavailable');}
  if(!result.ok){await result.body?.cancel();throw new FxError('fx_rate_unavailable');}
  const reader=result.body?.getReader();if(!reader)throw new FxError('fx_response_empty');
  const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16_384)throw new FxError('fx_response_too_large');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}catch{await reader.cancel().catch(()=>{});throw new FxError('fx_response_invalid');}finally{reader.releaseLock();}
  try{return validateReference(JSON.parse(text),base,quote,url,now);}catch(e){if(e instanceof FxError)throw e;throw new FxError('fx_response_invalid');}
}
