/** Regional procurement domain: no network, database, secrets, or model dependencies. */
export const COUNTRIES = ['NG','US','GB','DE','ZA','CN'] as const;
export type Country = typeof COUNTRIES[number];
export const CURRENCIES = ['NGN','USD','GBP','EUR','ZAR','CNY'] as const;
export type Currency = typeof CURRENCIES[number];
export const countryCurrency: Record<Country,Currency> = {NG:'NGN',US:'USD',GB:'GBP',DE:'EUR',ZA:'ZAR',CN:'CNY'};
export type Supplier = {id:string; name:string; origin:string; regions:Country[]; kind:'regional'|'distributor'|'marketplace'};
// Discovery leads, not endorsements, current stock, API contracts or shipping guarantees.
export const SUPPLIERS: readonly Supplier[] = [
  {id:'microscale',name:'Microscale Embedded',origin:'https://www.microscale.net',regions:['NG'],kind:'regional'},
  {id:'hub360',name:'Hub360',origin:'https://hub360.cc',regions:['NG'],kind:'regional'},
  {id:'matrix360',name:'Matrix360',origin:'https://www.matrix360.com.ng',regions:['NG'],kind:'regional'},
  {id:'digikey',name:'DigiKey',origin:'https://www.digikey.com',regions:['US'],kind:'distributor'},
  {id:'mouser',name:'Mouser',origin:'https://www.mouser.com',regions:['US'],kind:'distributor'},
  {id:'tme',name:'TME',origin:'https://www.tme.eu',regions:['DE'],kind:'distributor'},
  {id:'rs',name:'RS',origin:'https://www.rs-online.com',regions:['GB','DE','ZA'],kind:'distributor'},
  {id:'lcsc',name:'LCSC',origin:'https://www.lcsc.com',regions:['CN'],kind:'distributor'},
  {id:'alibaba',name:'Alibaba',origin:'https://www.alibaba.com',regions:[],kind:'marketplace'},
  {id:'aliexpress',name:'AliExpress',origin:'https://www.aliexpress.com',regions:[],kind:'marketplace'},
];
export function supplierFor(id: unknown): Supplier {
  const s = SUPPLIERS.find(x => x.id === id);
  if (!s) throw new InputError('Unknown supplier');
  return s;
}
export class InputError extends Error {}
export function record(v: unknown): Record<string,unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new InputError('Expected an object');
  return v as Record<string,unknown>;
}
export function text(v:unknown,max:number,field:string):string {
  if (typeof v !== 'string' || !v.trim() || v.length > max || /[\u0000-\u001f\u007f]/.test(v)) throw new InputError(`Invalid ${field}`);
  return v.trim();
}
export function integer(v:unknown,min:number,max:number,field:string):number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v<min || v>max) throw new InputError(`Invalid ${field}`);
  return v;
}
export function uuid(v:unknown):string {
  if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw new InputError('Invalid identifier');
  return v.toLowerCase();
}
export function country(v:unknown):Country { if (!COUNTRIES.includes(v as Country)) throw new InputError('Unsupported delivery country'); return v as Country; }
function currency(v:unknown):Currency { if (!CURRENCIES.includes(v as Currency)) throw new InputError('Unsupported currency'); return v as Currency; }
export type Selection={bomId:string;revision:number;line:number;country:Country;quantity:number};
export function selection(r:Record<string,unknown>):Selection {return {bomId:uuid(r.bomId),revision:integer(r.revision,1,Number.MAX_SAFE_INTEGER,'revision'),line:integer(r.line,0,499,'line'),country:country(r.country),quantity:integer(r.quantity,1,1_000_000,'quantity')};}
export type Part={partNumber:string;manufacturer:string;quantity:number};
export function samePart(a:string,b:string):boolean {return a.trim().toUpperCase()===b.trim().toUpperCase();}
export function productUrl(s:Supplier,raw:unknown):URL {
  const value=text(raw,2048,'product URL');
  // Reject encoded path separators, dot segments and ambiguous path normalization.
  if (/[\\]/.test(value) || /%(?:2f|5c|2e|25)/i.test(value) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(value)) throw new InputError('Ambiguous product URL');
  let u:URL;try{u=new URL(value);}catch{throw new InputError('Invalid product URL');}
  if(u.origin!==s.origin || u.protocol!=='https:' || u.username || u.password || u.hash) throw new InputError('Use the exact registered supplier HTTPS origin');
  return u;
}
export type CrawlPolicy={authorizationRef:string;pathPrefixes:string[];allowModel:boolean};
export function approvedUrl(s:Supplier,raw:unknown,p:CrawlPolicy):string {
  const u=productUrl(s,raw);
  if(u.search || !p.pathPrefixes.some(prefix=>u.pathname.startsWith(prefix) && u.pathname.length>prefix.length)) throw new InputError('URL outside approved product paths');
  return u.href;
}
export function parsePolicies(raw:string|undefined):Map<string,CrawlPolicy>{
  const result=new Map<string,CrawlPolicy>();if(!raw)return result;
  const o=record(JSON.parse(raw));for(const [id,value] of Object.entries(o)){
    supplierFor(id);const v=record(value);const ref=text(v.authorizationRef,200,'authorization reference');
    if(!Array.isArray(v.pathPrefixes)||v.pathPrefixes.length<1||v.pathPrefixes.length>8)throw new InputError('Invalid approved paths');
    const prefixes=v.pathPrefixes.map(x=>{if(typeof x!=='string'||!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/$/.test(x)||x.length>120)throw new InputError('Invalid product path prefix');return x;});
    if(typeof v.allowModel!=='boolean')throw new InputError('Explicit model permission required');
    result.set(id,{authorizationRef:ref,pathPrefixes:prefixes,allowModel:v.allowModel});
  }return result;
}
// Fixed-point: price at 4 decimal places, shipment/fees at 2, FX rate at 6.
// Bounds keep inputs and stored numbers safely representable; BigInt prevents overflow in arithmetic.
export function decimal(v:unknown,places:number,max:number,field:string):number {
  if(typeof v!=='string'||v.length>32||!new RegExp(`^\\d{1,12}(?:\\.\\d{1,${places}})?$`).test(v))throw new InputError(`Invalid ${field}`);
  const [whole,fraction='']=v.split('.');const n=BigInt(whole)*BigInt(10)**BigInt(places)+BigInt(fraction.padEnd(places,'0'));
  if(n>BigInt(max))throw new InputError(`${field} exceeds limit`);return Number(n);
}
export type Quote={currency:Currency;unitPrice4:number;shipping2:number|null;fees2:number|null;fx6:number|null;stock:number|null;moq:number|null;deliveryDays:number|null;validUntil:string;note:string;sourceUrl:string|null;quotedQuantity:number;destinationConfirmed:boolean;identityConfirmed:boolean};
export function parseQuote(v:unknown,s:Supplier,selection:Selection):Quote {
  const q=record(v);const c=currency(q.currency);const target=countryCurrency[selection.country];
  const optionalMoney=(v:unknown,field:string)=>v===null||v===''||v===undefined?null:decimal(v,2,100_000_000_000,field);
  const optionalInt=(v:unknown,min:number,max:number,field:string)=>v===null||v===undefined?null:integer(v,min,max,field);
  const validUntil=text(q.validUntil,24,'quote expiry');const date=Date.parse(validUntil);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(validUntil)||!Number.isFinite(date)||new Date(date).toISOString()!==validUntil||date<=Date.now()||date>Date.now()+90*86400_000)throw new InputError('Quote expiry must be within the next 90 days');
  const fx6=c===target?1_000_000:(q.fx===null||q.fx===''||q.fx===undefined?null:decimal(q.fx,6,1_000_000_000_000,'FX rate'));
  if(fx6===0)throw new InputError('FX rate must be positive');
  const unitPrice4=decimal(q.unitPrice,4,100_000_000_000,'unit price');if(unitPrice4===0)throw new InputError('Unit price must be positive');
  if(typeof q.destinationConfirmed!=='boolean'||typeof q.identityConfirmed!=='boolean')throw new InputError('Confirm component identity and delivery explicitly');
  const source=q.sourceUrl?productUrl(s,q.sourceUrl):null;if(source?.search)throw new InputError('Remove query parameters from the quote URL');
  return {currency:c,unitPrice4,shipping2:optionalMoney(q.shipping,'shipping'),fees2:optionalMoney(q.fees,'taxes and fees'),fx6,stock:optionalInt(q.stock,0,1_000_000_000,'stock'),moq:optionalInt(q.moq,1,1_000_000,'minimum order'),deliveryDays:optionalInt(q.deliveryDays,0,365,'delivery days'),validUntil,note:text(q.note,500,'quote reference'),sourceUrl:source?.href||null,quotedQuantity:selection.quantity,destinationConfirmed:q.destinationConfirmed,identityConfirmed:q.identityConfirmed};
}
export function landedCost(q:Quote,quantity:number,now=Date.now()):{totalMinor:string|null;reason:string|null}{
  if(Date.parse(q.validUntil)<=now)return {totalMinor:null,reason:'Quote expired'};
  if(quantity!==q.quotedQuantity)return {totalMinor:null,reason:'Different quoted quantity'};
  if(!q.identityConfirmed||!q.destinationConfirmed)return {totalMinor:null,reason:'Identity or destination not confirmed'};
  if(q.stock===null||q.moq===null)return {totalMinor:null,reason:'Stock or minimum order unknown'};
  if(q.stock<quantity||q.moq>quantity)return {totalMinor:null,reason:'Quantity unavailable or below minimum'};
  if(q.shipping2===null||q.fees2===null||q.fx6===null)return {totalMinor:null,reason:'Shipping, duties or FX unknown'};
  const source4=BigInt(q.unitPrice4)*BigInt(quantity)+(BigInt(q.shipping2)+BigInt(q.fees2))*BigInt(100);
  // Convert source 4-decimal units to destination minor units with half-up rounding.
  return {totalMinor:((source4*BigInt(q.fx6)+BigInt(50_000_000))/BigInt(100_000_000)).toString(),reason:null};
}
export type Observation={method:'jsonld'|'llm_candidate'|'unstructured';mpn:string|null;manufacturer:string|null;price:string|null;currency:string|null;availability:string|null;evidence:string;sourceUrl:string;retrievedAt:string;hash:string;reviewRequired:true};
function nodes(v:unknown,depth=0):Record<string,unknown>[] {
  if(depth>5||v===null||typeof v!=='object')return [];
  if(Array.isArray(v))return v.slice(0,50).flatMap(x=>nodes(x,depth+1));
  const o=v as Record<string,unknown>;return [o,...nodes(o['@graph'],depth+1)];
}
export function extractProduct(html:string,part:Part):Omit<Observation,'sourceUrl'|'retrievedAt'|'hash'>|null {
  if(html.length>500_000)return null;
  const matches:Record<string,unknown>[]=[];let count=0;
  for(const m of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)){
    if(++count>30||m[1].length>60_000)break;
    try{for(const p of nodes(JSON.parse(m[1])))if((p['@type']==='Product'||Array.isArray(p['@type'])&&p['@type'].includes('Product'))&&typeof p.mpn==='string'&&samePart(p.mpn,part.partNumber))matches.push(p);}catch{/* malformed structured data is not an offer */}
  }
  if(matches.length!==1)return null;
  const p=matches[0];const brand=p.manufacturer??p.brand;const manufacturer=typeof brand==='string'?brand:brand&&typeof brand==='object'&&typeof (brand as Record<string,unknown>).name==='string'?String((brand as Record<string,unknown>).name):null;
  if(part.manufacturer&&(!manufacturer||!samePart(manufacturer,part.manufacturer)))return null;
  const offer=p.offers;if(!offer||typeof offer!=='object'||Array.isArray(offer))return null;
  const o=offer as Record<string,unknown>;if(o['@type']!=='Offer')return null;
  const price=String(o.price??'');const c=String(o.priceCurrency??'');
  try{if(decimal(price,4,100_000_000_000,'price')===0)return null;currency(c);}catch{return null;}
  const availability=typeof o.availability==='string'&&/^https?:\/\/schema\.org\/(InStock|OutOfStock|PreOrder|BackOrder|LimitedAvailability)$/.test(o.availability)?o.availability.split('/').pop()!:null;
  return {method:'jsonld',mpn:String(p.mpn),manufacturer,price,currency:c,availability,evidence:JSON.stringify({mpn:p.mpn,manufacturer,price:o.price,priceCurrency:o.priceCurrency,availability:o.availability}).slice(0,1200),reviewRequired:true};
}
// Model output is a research candidate, never a quote. Exact evidence substring and whole tokens required.
function wholeToken(haystack:string,needle:string,chars:string):boolean {
  const escaped=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(?:^|[^${chars}])${escaped}(?=$|[^${chars}])`,'i').test(haystack);
}
export function validateModelCandidate(value:unknown,markdown:string,part:Part):Omit<Observation,'sourceUrl'|'retrievedAt'|'hash'>|null {
  try{const r=record(value);if(Object.keys(r).sort().join(',')!=='currency,evidence,mpn,price')return null;const mpn=text(r.mpn,200,'part');const price=text(r.price,32,'price');const c=currency(r.currency);const e=text(r.evidence,500,'evidence');
    if(!samePart(mpn,part.partNumber)||!markdown.includes(e)||!wholeToken(e,mpn,'A-Za-z0-9_.-')||!wholeToken(e,price,'0-9.,')||!wholeToken(e,c,'A-Za-z')||decimal(price,4,100_000_000_000,'price')===0)return null;
    return {method:'llm_candidate',mpn,manufacturer:null,price,currency:c,availability:null,evidence:e,reviewRequired:true};
  }catch{return null;}
}
