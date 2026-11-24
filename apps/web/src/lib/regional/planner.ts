/**
 * Nexus Phase 3 procurement planner.
 * Pure and deterministic; source evidence remains explicitly advisory.
 * Currency math uses minor units and BigInt, never floating point money.
 */
import {COUNTRIES,CURRENCIES,type Country,type Currency} from './model';

export type PlanLine={id:string;mpn:string;manufacturer:string;quantity:number};
export type PlanSupplier={id:string;name:string;region:'local'|'international';setupMinor:string};
export type Tier={minQty:number;unitPrice4:string};
export type PlanOffer={
  id:string;lineId:string;supplierId:string;mpn:string;manufacturer:string;
  stock:number|null;moq:number|null;minQuantity:number;maxQuantity:number;
  tiers:Tier[];currency:Currency;fx6:string;shipping2:string|null;fees2:string|null;
  validUntil:string;identityConfirmed:boolean;destinationConfirmed:boolean;
  evidence:'illustrative'|'customer_reported'|'approved_feed';
};
export type PlanScenario={label:string;country:Country;currency:Currency;lines:PlanLine[];suppliers:PlanSupplier[];offers:PlanOffer[]};
export type Allocation={lineId:string;mpn:string;supplierId:string;supplier:string;offerId:string;quantity:number;costMinor:string;evidence:PlanOffer['evidence']};
export type PlanVariant={mode:'all'|'local'|'international';complete:boolean;method:'exact'|'heuristic';totalMinor:string|null;pricedMinor:string;allocations:Allocation[];uncovered:{lineId:string;mpn:string;quantity:number;reason:string}[];activeSuppliers:string[];setupMinor:string};
export type PlanResult={label:string;country:Country;currency:Currency;generatedAt:string;scenarios:PlanVariant[];recommended:'all'|'local'|'international'|null;advisory:true};
export class PlanError extends Error {}
const MONEY=/^(?:0|[1-9]\d{0,14})$/;
const MPN=/^[\w.+#\-\/]{1,128}$/;
const ID=/^[a-zA-Z0-9_.:-]{1,100}$/;
const MAX=10n**20n;
function valid(c:unknown,m:string):asserts c {if(!c)throw new PlanError(m);}
function int(v:unknown,max:number){return typeof v==='number'&&Number.isSafeInteger(v)&&v>=1&&v<=max;}
function nonneg(v:unknown,max:number){return typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;}
function minor(v:unknown,max=MAX):bigint{valid(typeof v==='string'&&MONEY.test(v),'Money must be an unsigned integer string');const n=BigInt(v);valid(n<=max,'Money exceeds limit');return n;}
function goodLabel(v:unknown,max=160){return typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);}
export function validateScenario(x:PlanScenario):PlanScenario{
 valid(x&&typeof x==='object'&&!Array.isArray(x),'Expected scenario');
 valid(goodLabel(x.label),'Invalid scenario label');
 valid(COUNTRIES.includes(x.country)&&CURRENCIES.includes(x.currency),'Unsupported destination currency/country');
 valid(Array.isArray(x.lines)&&x.lines.length>0&&x.lines.length<=50,'Provide 1 to 50 BOM lines');
 valid(Array.isArray(x.suppliers)&&x.suppliers.length>0&&x.suppliers.length<=8,'Provide 1 to 8 suppliers');
 valid(Array.isArray(x.offers)&&x.offers.length<=500,'Too many offers');
 const lines=new Set<string>(), suppliers=new Set<string>(),offers=new Set<string>();
 for(const l of x.lines){
   valid(l&&typeof l==='object'&&ID.test(l.id)&&!lines.has(l.id),'Duplicate or invalid line ID');
   valid(typeof l.mpn==='string'&&MPN.test(l.mpn),'Invalid MPN');
   valid(typeof l.manufacturer==='string'&&l.manufacturer.length<=160,'Invalid manufacturer');
   valid(int(l.quantity,10000),'Invalid required quantity');lines.add(l.id);
 }
 for(const s of x.suppliers){
   valid(s&&typeof s==='object'&&ID.test(s.id)&&!suppliers.has(s.id),'Duplicate or invalid supplier ID');
   valid(goodLabel(s.name)&&['local','international'].includes(s.region),'Invalid supplier');
   minor(s.setupMinor);suppliers.add(s.id);
 }
 const lineMap=new Map(x.lines.map(l=>[l.id,l]));
 for(const o of x.offers){
   valid(o&&typeof o==='object'&&ID.test(o.id)&&!offers.has(o.id),'Duplicate or invalid offer ID');
   valid(lines.has(o.lineId)&&suppliers.has(o.supplierId),'Offer refers to unknown line/supplier');
   const line=lineMap.get(o.lineId)!;
   valid(typeof o.mpn==='string'&&o.mpn.trim().toUpperCase()===line.mpn.trim().toUpperCase(),'Offer MPN differs from BOM');
   valid(typeof o.manufacturer==='string'&&(!line.manufacturer||o.manufacturer.trim().toUpperCase()===line.manufacturer.trim().toUpperCase()),'Offer manufacturer differs from BOM');
   valid(o.stock===null||nonneg(o.stock,1000000),'Invalid stock');
   valid(o.moq===null||int(o.moq,1000000),'Invalid MOQ');
   valid(int(o.minQuantity,1000000)&&int(o.maxQuantity,1000000)&&o.minQuantity<=o.maxQuantity,'Invalid quoted quantity range');
   valid(CURRENCIES.includes(o.currency)&&typeof o.validUntil==='string'&&Number.isFinite(Date.parse(o.validUntil)),'Invalid offer currency or expiry');
   valid(typeof o.identityConfirmed==='boolean'&&typeof o.destinationConfirmed==='boolean','Missing quotation confirmations');
   valid(['illustrative','customer_reported','approved_feed'].includes(o.evidence),'Invalid evidence classification');
   valid(Array.isArray(o.tiers)&&o.tiers.length>=1&&o.tiers.length<=12,'Invalid price breaks');
   let last=0;for(const t of o.tiers){
     valid(int(t.minQty,1000000)&&t.minQty>last,'Price breaks must ascend');
     last=t.minQty;minor(t.unitPrice4,10n**16n);valid(BigInt(t.unitPrice4)>0n,'Price must be positive');
   }
   minor(o.fx6,10n**15n);valid(BigInt(o.fx6)>0n,'FX must be positive');
   if(o.shipping2!==null)minor(o.shipping2,10n**16n);
   if(o.fees2!==null)minor(o.fees2,10n**16n);
   offers.add(o.id);
 }
 return x;
}
function active(o:PlanOffer,now:number){
  return o.identityConfirmed&&o.destinationConfirmed&&o.stock!==null&&o.moq!==null&&
   o.shipping2!==null&&o.fees2!==null&&Date.parse(o.validUntil)>now;
}
function eligible(o:PlanOffer,q:number,now:number):boolean{
 return q>=1&&active(o,now)&&q>=o.minQuantity&&q<=o.maxQuantity&&q>=o.moq!&&q<=o.stock!;
}
function price(o:PlanOffer,q:number,now:number):bigint|null{
 if(!eligible(o,q,now))return null;
 const tier=[...o.tiers].reverse().find(t=>t.minQty<=q);if(!tier)return null;
 const source4=BigInt(tier.unitPrice4)*BigInt(q)+(BigInt(o.shipping2!)+BigInt(o.fees2!))*100n;
 return (source4*BigInt(o.fx6)+50000000n)/100000000n;
}
type Choice={cost:bigint;alloc:{offer:PlanOffer;q:number;cost:bigint}[];opened:Set<string>};
type LineChoice={cost:bigint;alloc:{offer:PlanOffer;q:number;cost:bigint}[]};
function bestForLine(line:PlanLine,suppliers:PlanSupplier[],offers:PlanOffer[],now:number):LineChoice|null{
 // Exact bounded multi-supplier integer DP: one offer per supplier per BOM line.
 const d=line.quantity;
 if(d>240)return null;
 let costs:(bigint|null)[]=Array(d+1).fill(null);costs[0]=0n;
 const back:{prev:number;q:number;offer?:PlanOffer;price?:bigint}[][]=[];
 for(const supplier of suppliers){
   const next:(bigint|null)[]=Array(d+1).fill(null);
   const choices:{prev:number;q:number;offer?:PlanOffer;price?:bigint}[]=Array.from({length:d+1},()=>({prev:0,q:0}));
   const byQuantity=new Array<{offer:PlanOffer;cost:bigint}|null>(d+1).fill(null);
   for(const offer of offers.filter(o=>o.supplierId===supplier.id&&o.lineId===line.id)){
     for(let q=1;q<=d;q++){const c=price(offer,q,now);if(c!==null&&(!byQuantity[q]||c<byQuantity[q]!.cost))byQuantity[q]={offer,cost:c};}
   }
   for(let used=0;used<=d;used++){
     if(costs[used]===null)continue;
     for(let qty=0;qty<=d-used;qty++){
       const entry=qty===0?null:byQuantity[qty];if(qty>0&&!entry)continue;
       const newCost=costs[used]!+(entry?.cost??0n);const total=used+qty;
       if(next[total]===null||newCost<next[total]!){
         next[total]=newCost;
         choices[total]={prev:used,q:qty,...(entry?{offer:entry.offer,price:entry.cost}:{})};
       }
     }
   }
   costs=next;back.push(choices);
 }
 if(costs[d]===null)return null;
 const alloc:LineChoice['alloc']=[];let cursor=d;
 for(let i=suppliers.length-1;i>=0;i--){const b=back[i][cursor];if(b.q>0&&b.offer&&b.price!==undefined)alloc.push({offer:b.offer,q:b.q,cost:b.price});cursor=b.prev;}
 return {cost:costs[d]!,alloc:alloc.reverse()};
}
function greedyLine(line:PlanLine,suppliers:PlanSupplier[],offers:PlanOffer[],open:Set<string>,now:number):LineChoice|null {
 const candidates=offers.filter(o=>suppliers.some(s=>s.id===o.supplierId)&&o.lineId===line.id);
 const setup=new Map(suppliers.map(s=>[s.id,BigInt(s.setupMinor)]));
 const d=line.quantity;
 let best:LineChoice|null=null;let bestTotal:bigint|null=null;
 function consider(alloc:LineChoice['alloc']){
   if(alloc.reduce((s,a)=>s+a.q,0)!==d)return;
   const seen=new Set(alloc.map(a=>a.offer.supplierId));
   const cost=alloc.reduce((s,a)=>s+a.cost,0n);
   const total=cost+[...seen].reduce((s,id)=>s+(open.has(id)?0n:setup.get(id)!),0n);
   if(bestTotal===null||total<bestTotal){best={cost,alloc};bestTotal=total;}
 }
 for(const a of candidates){const cost=price(a,d,now);if(cost!==null)consider([{offer:a,q:d,cost}]);}
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
   const a=candidates[i],b=candidates[j];if(a.supplierId===b.supplierId)continue;
   const qs=new Set<number>();
   if(d<=300){for(let q=1;q<d;q++)qs.add(q);}
   else {
     const anchors=[1,d-1,Math.floor(d/2),Math.floor(d/4),Math.floor(3*d/4),a.moq,a.stock,a.minQuantity,a.maxQuantity,d-(b.moq??0),d-(b.stock??0),d-b.minQuantity,d-b.maxQuantity,...a.tiers.map(t=>t.minQty),...b.tiers.map(t=>d-t.minQty)];
     for(const q of anchors)if(typeof q==='number'&&Number.isSafeInteger(q))for(const z of [q-1,q,q+1])if(z>0&&z<d)qs.add(z);
   }
   for(const q of qs){const ca=price(a,q,now),cb=price(b,d-q,now);if(ca!==null&&cb!==null)consider([{offer:a,q,cost:ca},{offer:b,q:d-q,cost:cb}]);}
 }
 if(best)return best;
 // Three-plus-supplier feasibility fallback, labelled heuristic.
 const remain=new Set(candidates.map(c=>c.supplierId));
 const alloc:LineChoice['alloc']=[];let needed=d;
 while(needed>0&&remain.size){
   let candidate:{offer:PlanOffer;q:number;cost:bigint;score:bigint}|null=null;
   for(const o of candidates.filter(o=>remain.has(o.supplierId))){
     const ceiling=Math.min(needed,o.maxQuantity,o.stock??0);
     for(const q of new Set([ceiling,Math.max(o.moq??1,o.minQuantity),Math.floor(ceiling/2)])){
       const cost=price(o,q,now);if(cost===null)continue;
       const score=(cost+(open.has(o.supplierId)?0n:setup.get(o.supplierId)!))*10000n/BigInt(q);
       if(!candidate||score<candidate.score)candidate={offer:o,q,cost,score};
     }
   }
   if(!candidate)break;
   alloc.push(candidate);needed-=candidate.q;remain.delete(candidate.offer.supplierId);
 }
 return needed===0?{cost:alloc.reduce((s,a)=>s+a.cost,0n),alloc}:null;
}
function variant(s:PlanScenario,mode:PlanVariant['mode'],now:number):PlanVariant{
 const suppliers=s.suppliers.filter(x=>mode==='all'||x.region===mode);
 const exact=suppliers.length<=5&&s.lines.length<=12&&s.lines.every(x=>x.quantity<=80)&&s.offers.length<=120;
 let winner:Choice|null=null;
 let missing:PlanVariant['uncovered']=[];
 if(exact){
   const count=1<<suppliers.length;
   for(let mask=1;mask<count;mask++){
     const subset=suppliers.filter((_,i)=>(mask&(1<<i))!==0);
     let cost=subset.reduce((sum,supplier)=>sum+BigInt(supplier.setupMinor),0n);
     const alloc:Choice['alloc']=[];
     let all=true;
     for(const line of s.lines){
       const linePlan=bestForLine(line,subset,s.offers,now);
       if(!linePlan){all=false;break;}
       cost+=linePlan.cost;alloc.push(...linePlan.alloc);
     }
     if(all&&(!winner||cost<winner.cost))winner={cost,alloc,opened:new Set(alloc.map(a=>a.offer.supplierId))};
   }
 }
 let method:PlanVariant['method']=exact?'exact':'heuristic';
 if(!winner){
   const opened=new Set<string>(),alloc:Choice['alloc']=[];
   for(const line of s.lines){
     const linePlan=exact?bestForLine(line,suppliers,s.offers,now):line.quantity<=240?bestForLine(line,suppliers,s.offers,now)||greedyLine(line,suppliers,s.offers,opened,now):greedyLine(line,suppliers,s.offers,opened,now);
     if(linePlan){alloc.push(...linePlan.alloc);linePlan.alloc.forEach(a=>opened.add(a.offer.supplierId));}
     else missing.push({lineId:line.id,mpn:line.mpn,quantity:line.quantity,reason:'No feasible quantity/stock/MOQ/price-break combination found'});
   }
   const fixed=[...opened].reduce((sum,id)=>sum+BigInt(suppliers.find(x=>x.id===id)!.setupMinor),0n);
   winner={cost:alloc.reduce((sum,a)=>sum+a.cost,0n)+fixed,alloc,opened};
   if(exact&&missing.length===0)method='heuristic'; // Exact subset search found no global complete plan; never claim optimal.
 }
 const used=[...winner.opened];
 const fixed=used.reduce((sum,id)=>sum+BigInt(suppliers.find(x=>x.id===id)!.setupMinor),0n);
 const allocations:Allocation[]=winner.alloc.map(a=>({lineId:a.offer.lineId,mpn:a.offer.mpn,supplierId:a.offer.supplierId,supplier:suppliers.find(x=>x.id===a.offer.supplierId)!.name,offerId:a.offer.id,quantity:a.q,costMinor:a.cost.toString(),evidence:a.offer.evidence}));
 const complete=missing.length===0&&s.lines.every(l=>allocations.filter(x=>x.lineId===l.id).reduce((sum,x)=>sum+x.quantity,0)===l.quantity);
 return {mode,complete,method,totalMinor:complete?(allocations.reduce((sum,a)=>sum+BigInt(a.costMinor),fixed)).toString():null,
  pricedMinor:allocations.reduce((sum,a)=>sum+BigInt(a.costMinor),fixed).toString(),allocations,uncovered:missing,activeSuppliers:used,setupMinor:fixed.toString()};
}
export function planBOM(raw:PlanScenario,now=Date.now()):PlanResult{
 const s=validateScenario(raw);
 const scenarios:(PlanVariant)[]=['all','local','international'].map(mode=>variant(s,mode as PlanVariant['mode'],now));
 const complete=scenarios.filter(v=>v.complete);
 complete.sort((a,b)=>{const x=BigInt(a.totalMinor!),y=BigInt(b.totalMinor!);return x<y?-1:x>y?1:0;});
 return {label:s.label,country:s.country,currency:s.currency,generatedAt:new Date(now).toISOString(),scenarios,recommended:complete[0]?.mode||null,advisory:true};
}
/** Entire fixture is synthetic. No live quote, shipping commitment or compatibility claim. */
export function demoScenario(large=false):PlanScenario{
 const suppliers:PlanSupplier[]=[
  {id:'local-abuja',name:'Abuja Electronics (FICTIONAL)',region:'local',setupMinor:'250000'},
  {id:'local-lagos',name:'Lagos Parts Hub (FICTIONAL)',region:'local',setupMinor:'450000'},
  {id:'import-asia',name:'Asia Electronics Export (FICTIONAL)',region:'international',setupMinor:'2200000'}
 ];
 const base=[{mpn:'ESP32-WROOM-32E',manufacturer:'Espressif',q:5},{mpn:'MAX30100',manufacturer:'Maxim Integrated',q:5},{mpn:'DHT11',manufacturer:'',q:5},{mpn:'SH1106',manufacturer:'',q:5},{mpn:'LM1117-3.3',manufacturer:'',q:10}];
 const lines:PlanLine[]=Array.from({length:large?50:5},(_,i)=>{const b=base[i%5];return {id:'line-'+i,mpn:large?b.mpn+'-'+i:b.mpn,manufacturer:b.manufacturer,quantity:b.q};});
 const offers:PlanOffer[]=[];
 for(const [i,l] of lines.entries())for(const [j,s] of suppliers.entries()){
  const unit=BigInt(Math.round((1800+i%7*300)*(j===0?1:j===1?0.84:0.63)));
  offers.push({id:'offer-'+i+'-'+j,lineId:l.id,supplierId:s.id,mpn:l.mpn,manufacturer:l.manufacturer,
    stock:j===0&&i%5===1?3:100,moq:j===2?2:1,minQuantity:1,maxQuantity:100,
    tiers:[{minQty:1,unitPrice4:(unit*10000n).toString()},{minQty:10,unitPrice4:(unit*9200n).toString()}],
    currency:'NGN',fx6:'1000000',shipping2:'0',fees2:'0',validUntil:'2099-01-01T00:00:00.000Z',
    identityConfirmed:true,destinationConfirmed:true,evidence:'illustrative'});
 }
 return {label:large?'50-line synthetic procurement stress scenario':'IoT monitoring board — synthetic BOM',country:'NG',currency:'NGN',lines,suppliers,offers};
}
