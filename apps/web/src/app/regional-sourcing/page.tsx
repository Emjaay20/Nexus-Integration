'use client';
import Link from 'next/link';
import MarketTools from '@/components/regional/MarketTools';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {COUNTRIES,CURRENCIES,countryCurrency,type Country,type Currency,type Supplier,type Selection,type Quote,type Observation} from '@/lib/regional/model';

type BomSummary={id:string;name:string;revision:number};
type Bom=BomSummary&{items:{partNumber:string;manufacturer:string;quantity:number}[]};
type Directory={workspaceId:string;role:string;boms:BomSummary[];suppliers:(Supplier&{researchEnabled:boolean})[]};
type Row={id:string;kind:'quote'|'research';state:string;supplierId:string;sourceUrl:string|null;createdAt:string;updatedAt:string;result:Quote|Observation|null;errorCode:string|null;cost?:{totalMinor:string|null;reason:string|null}};
const labels:Record<Country,string>={NG:'Nigeria',US:'United States',GB:'United Kingdom',DE:'Germany',ZA:'South Africa',CN:'China'};
const fieldStyle={width:'100%',padding:'8px 10px',border:'1px solid var(--border, #aaa)',borderRadius:6,background:'transparent',color:'inherit'};
const gridStyle={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:12};
async function api<T>(query='',body?:unknown):Promise<T>{
  const r=await fetch('/api/regional-sourcing'+query,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(30000)});
  const data=await r.json();if(!r.ok)throw new Error(typeof data.error==='string'?data.error:'Regional sourcing request failed');return data;
}
function money(minor:string,currency:Currency){const n=BigInt(minor);return `${currency} ${(n/BigInt(100)).toLocaleString()}.${(n%BigInt(100)).toString().padStart(2,'0')}`;}
function inputNumber(v:string){return v===''?null:Number(v);}
function emptyQuote(c:Currency){return {currency:c,unitPrice:'',shipping:'',fees:'',fx:'',stock:'',moq:'',deliveryDays:'',validUntil:'',note:'',sourceUrl:'',identityConfirmed:false,destinationConfirmed:false};}
export default function RegionalSourcing(){
  const [directory,setDirectory]=useState<Directory|null>(null),[bom,setBom]=useState<Bom|null>(null),[bomId,setBomId]=useState('');
  const [line,setLine]=useState(0),[country,setCountry]=useState<Country>('NG'),[quantity,setQuantity]=useState('1');
  const [loaded,setLoaded]=useState<Selection|null>(null),[rows,setRows]=useState<Row[]>([]),[supplierId,setSupplierId]=useState('microscale');
  const [quote,setQuote]=useState(emptyQuote('NGN')),[url,setUrl]=useState(''),[allowModel,setAllowModel]=useState(false);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [truncated,setTruncated]=useState(false);const previous=useRef<{payload:string;key:string}|null>(null);
  const canWrite=directory?.role==='owner'||directory?.role==='design_engineer';
  const activeSupplier=directory?.suppliers.find(s=>s.id===supplierId);
  const currency=countryCurrency[country];
  const currentPart=bom?.items[line];
  const selected=!!loaded&&loaded.bomId===bomId&&loaded.revision===bom?.revision&&loaded.line===line&&loaded.country===country&&loaded.quantity===Number(quantity);
  useEffect(()=>{let alive=true;api<Directory>().then(d=>{if(alive){setDirectory(d);setLoading(false);}}).catch(e=>{if(alive){setError(e instanceof Error?e.message:'Workspace unavailable');setLoading(false);}});return()=>{alive=false;};},[]);
  async function run(work:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'Request failed. Reload and check saved records.');}finally{setBusy(false);}}
  function clearSelection(){setLoaded(null);setRows([]);setTruncated(false);setUrl('');setAllowModel(false);setQuote(emptyQuote(countryCurrency[country]));}
  async function chooseBom(id:string){setBomId(id);setBom(null);clearSelection();setLine(0);if(!id||!directory)return;
    await run(async()=>{const b=await api<Bom>('?'+new URLSearchParams({bomId:id,workspaceId:directory.workspaceId}));setBom(b);setQuantity(String(b.items[0]?.quantity||1));});}
  async function reload(s:Selection){if(!directory)return;const r=await api<{rows:Row[];truncated:boolean}>('?'+new URLSearchParams({workspaceId:directory.workspaceId,bomId:s.bomId,revision:String(s.revision),line:String(s.line),country:s.country,quantity:String(s.quantity)}));setRows(r.rows);setTruncated(r.truncated);setLoaded(s);}
  async function loadComparison(e:FormEvent){e.preventDefault();if(!bom||!currentPart)return;setLoaded(null);setRows([]);setTruncated(false);await run(()=>reload({bomId:bom.id,revision:bom.revision,line,country,quantity:Number(quantity)}));}
  async function submit(action:'quote'|'research',details:Record<string,unknown>){if(!directory||!loaded||!selected||!canWrite)return;const s=loaded;await run(async()=>{
    const body={action,workspaceId:directory.workspaceId,...s,supplierId,...details};const serialized=JSON.stringify(body);
    if(previous.current?.payload!==serialized)previous.current={payload:serialized,key:crypto.randomUUID()};
    const row=await api<Row>('',{...body,requestKey:previous.current.key});
    await reload(s);previous.current=null;setNotice(row.state==='submission_unknown'||row.state==='submitting'?'Submission not confirmed. Do not create another request; an operator must reconcile it.':action==='quote'?'Quotation saved.':'Research request recorded. Refresh its status below.');
  });}
  async function saveQuote(e:FormEvent){e.preventDefault();if(!selected)return;const dt=new Date(quote.validUntil);if(!Number.isFinite(dt.getTime())){setError('Enter a valid quote expiry.');return;}
    await submit('quote',{quote:{...quote,stock:inputNumber(quote.stock),moq:inputNumber(quote.moq),deliveryDays:inputNumber(quote.deliveryDays),validUntil:dt.toISOString()}});}
  async function refresh(id:string){if(!selected||!loaded||!directory)return;const s=loaded;await run(async()=>{await api<Row>('',{action:'refresh',workspaceId:directory.workspaceId,...s,id});await reload(s);});}
  const sorted=[...rows].sort((a,b)=>{const x=a.cost?.totalMinor,y=b.cost?.totalMinor;if(x!=null&&y!=null){const diff=BigInt(x)-BigInt(y);return diff<BigInt(0)?-1:diff>BigInt(0)?1:0;}return x!=null?-1:y!=null?1:0;});
  const suppliers=[...(directory?.suppliers||[])].sort((a,b)=>Number(b.regions.includes(country))-Number(a.regions.includes(country)));
  return <main id="main-content" className="wrap">
    <header className="pagehead"><div className="eyebrow">WORKSPACE / REGIONAL PROCUREMENT</div><h1>Source locally. Compare globally.</h1><p>Compare supplier quotations for a saved BOM line. Start with nearby suppliers, then evaluate imports in your destination currency.</p><Link className="btn btn-secondary" href="/workspace">Back to BOM workspace</Link> <Link className="btn btn-primary" href="/regional-sourcing/planner">Whole-BOM Planner</Link> <Link className="btn btn-primary" href="/regional-sourcing/intelligence">Evidence &amp; Copilot</Link></header>
    {loading&&<p role="status">Loading workspace…</p>}{error&&<p className="note error" role="alert">{error} <button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>window.location.reload()}>Reload workspace</button></p>}{notice&&<p className="note" role="status">{notice}</p>}
    {directory&&<>
      <section className="result-section"><h2>1. Select the component requirement</h2><p>Choose a BOM revision and exact line, then enter the total components to purchase (not number of boards). Only the current saved revision is supported.</p>
        {!directory.boms.length?<p>No saved BOMs found. <Link href="/bom-importer">Import a BOM first.</Link></p>:<form onSubmit={loadComparison}>
          <fieldset disabled={busy} style={{border:0,padding:0,margin:0}}><div style={gridStyle}>
            <label className="field">Saved BOM<select required value={bomId} onChange={e=>void chooseBom(e.target.value)}><option value="">Select a BOM</option>{directory.boms.map(b=><option key={b.id} value={b.id}>{b.name} · rev {b.revision}</option>)}</select></label>
            <label className="field">BOM line<select required value={line} disabled={!bom} onChange={e=>{const n=Number(e.target.value);setLine(n);setQuantity(String(bom?.items[n]?.quantity||1));clearSelection();}}>{bom?.items.map((p,i)=><option key={i} value={i}>{i+1}. {p.partNumber}</option>)}</select></label>
            <label className="field">Delivery country<select value={country} onChange={e=>{const c=e.target.value as Country;setCountry(c);clearSelection();setQuote(emptyQuote(countryCurrency[c]));}}>{COUNTRIES.map(c=><option key={c} value={c}>{labels[c]}</option>)}</select></label>
            <label className="field">Total required components<input style={fieldStyle} type="number" min={1} max={1000000} step={1} required value={quantity} onChange={e=>{setQuantity(e.target.value);clearSelection();}}/></label>
          </div>{currentPart&&<p className="note">Saved line: {currentPart.partNumber} · {currentPart.manufacturer||'manufacturer unspecified'} · {currentPart.quantity} per saved BOM. Comparison currency: {currency}.</p>}<button className="btn btn-primary" disabled={!bom||busy} type="submit">{busy?'Working…':'Load sourcing workspace'}</button></fieldset>
        </form>}
      </section>
      {selected&&loaded&&<>
        <section className="result-section"><h2>2. Discover suppliers</h2><p>Regional candidates appear first. Listings are not proof of inventory, authorization, authenticity or delivery to your destination. Contact suppliers or visit their catalogues.</p><div style={gridStyle}>{suppliers.map(s=><article key={s.id} className="note"><strong>{s.name}</strong><p>{s.regions.includes(country)?'Regional candidate':'International candidate'} · {s.kind}</p><p>{s.researchEnabled?'Approved research configuration available':'Manual catalogue / quote only'}</p><a href={s.origin} target="_blank" rel="noopener noreferrer">Visit supplier ↗</a></article>)}</div></section>
        {!canWrite?<p className="note">Read-only workspace. Ask an owner or engineer to add quotations and research.</p>:<section className="result-section"><h2>3. Add sourcing evidence</h2><label className="field">Supplier<select value={supplierId} disabled={busy} onChange={e=>{setSupplierId(e.target.value);setUrl('');setQuote(emptyQuote(currency));setAllowModel(false);}}>{suppliers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
          <form onSubmit={saveQuote} style={{marginTop:16}}><fieldset disabled={busy} style={{border:0,padding:0,margin:0}}><h3>Record a supplier quotation</h3><p>Use an actual quotation for this quantity and destination. All monetary amounts (including shipping and fees) are in the quoted currency. Enter explicit zero only when a cost is confirmed absent. Unknown values exclude the quote from ranking.</p><div style={gridStyle}>
            <label className="field">Quote currency<select value={quote.currency} onChange={e=>setQuote(q=>({...q,currency:e.target.value as Currency,fx:''}))}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label>
            {([{key:'unitPrice',label:'Unit price (up to 4 decimals)',required:true},{key:'shipping',label:'Total shipping (optional)'},{key:'fees',label:'Total duties, tax & fees (optional)'},{key:'stock',label:'Confirmed available quantity'},{key:'moq',label:'Minimum order quantity'},{key:'deliveryDays',label:'Delivery days (optional)'}] as const).map(f=><label key={f.key} className="field">{f.label}<input style={fieldStyle} inputMode="decimal" required={'required' in f&&f.required} value={quote[f.key]} onChange={e=>setQuote(q=>({...q,[f.key]:e.target.value}))}/></label>)}
            {quote.currency!==currency&&<label className="field">1 {quote.currency} = how many {currency}?<input style={fieldStyle} inputMode="decimal" value={quote.fx} onChange={e=>setQuote(q=>({...q,fx:e.target.value}))}/></label>}
            <label className="field">Quote valid until (your local time)<input style={fieldStyle} required type="datetime-local" value={quote.validUntil} onChange={e=>setQuote(q=>({...q,validUntil:e.target.value}))}/></label>
            <label className="field">Product URL (optional)<input style={fieldStyle} type="url" value={quote.sourceUrl} onChange={e=>setQuote(q=>({...q,sourceUrl:e.target.value}))} placeholder={activeSupplier?.origin}/></label>
          </div><label className="field">Quote reference and FX source/date (no credentials or personal data)<input style={fieldStyle} required maxLength={500} value={quote.note} onChange={e=>setQuote(q=>({...q,note:e.target.value}))}/></label>
          <p><label><input type="checkbox" checked={quote.identityConfirmed} onChange={e=>setQuote(q=>({...q,identityConfirmed:e.target.checked}))}/> I confirmed the exact component and variant against the quotation.</label></p><p><label><input type="checkbox" checked={quote.destinationConfirmed} onChange={e=>setQuote(q=>({...q,destinationConfirmed:e.target.checked}))}/> Supplier confirmed delivery to the requested destination for this quantity.</label></p>
          <button className="btn btn-primary" type="submit">Save quotation</button></fieldset></form>
          <MarketTools currency={quote.currency} destination={currency} country={country} workspaceId={directory.workspaceId} selection={loaded} supplierId={supplierId} disabled={busy} onFx={rate=>setQuote(q=>({...q,fx:rate.rate,note:[q.note,`FX reference: ${rate.source}, ${rate.date}, 1 ${rate.base} = ${rate.rate} ${rate.quote}`].filter(Boolean).join(' | ').slice(0,500)}))} onFeed={candidate=>{
            setQuote(q=>({...q,currency:candidate.currency,unitPrice:candidate.unitPrice,stock:candidate.stock===null?'':String(candidate.stock),moq:candidate.moq===null?'':String(candidate.moq),shipping:'',fees:'',fx:'',deliveryDays:'',validUntil:'',sourceUrl:candidate.sourceUrl,note:`Partner feed candidate (${candidate.observedAt}); confirm source and expiry: ${candidate.validUntil}`,identityConfirmed:false,destinationConfirmed:false}));
            setNotice('Feed values copied to the draft. Confirm quotation expiry, exact component, supplier delivery and all costs before saving.');
          }}/>
          <form style={{marginTop:24}} onSubmit={e=>{e.preventDefault();void submit('research',{url,allowModel});}}><fieldset disabled={busy||!activeSupplier?.researchEnabled} style={{border:0,padding:0,margin:0}}><h3>Research a permitted product page</h3><p>{activeSupplier?.researchEnabled?'Submit an exact product URL. A background SmartCrawl job retrieves page evidence, not a guaranteed offer.':'Automated collection is disabled for this workflow until an operator authorizes the supplier and configures SmartCrawl.'}</p><label className="field">Product page URL<input required style={fieldStyle} type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder={activeSupplier?.origin}/></label><p><label><input type="checkbox" checked={allowModel} onChange={e=>setAllowModel(e.target.checked)}/> Allow the selected part number and public page excerpt to be sent to the configured external LLM if permitted. Results require review.</label></p><button className="btn btn-secondary" type="submit">Submit research</button></fieldset></form>
        </section>}
        <section className="result-section"><h2>4. Compare evidence and landed cost</h2><p>Complete, unexpired, customer-confirmed quotations for the exact quantity are sorted by calculated landed cost. Web observations and unconfirmed quotes are not ranked. No purchase is executed.</p><button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void run(()=>reload(loaded))}>Refresh saved records</button>{truncated&&<p className="note">Showing the latest 100 records; comparison is limited to these entries.</p>}{!sorted.length&&<p>No evidence saved for this exact selection yet.</p>}
          {sorted.map(r=>{const name=directory.suppliers.find(s=>s.id===r.supplierId)?.name||r.supplierId;const q=r.kind==='quote'?r.result as Quote|null:null;const o=r.kind==='research'?r.result as Observation|null:null;return <article className="note" key={r.id} style={{marginTop:12}}><h3>{name} · {r.kind==='quote'?'Customer-reported quotation':'Page research'}</h3><p>{new Date(r.createdAt).toLocaleString()} · {r.state.replaceAll('_',' ')}</p>{r.sourceUrl&&<p><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Original source ↗</a></p>}
          {q&&<><p>Unit price: {q.currency} {(q.unitPrice4/10000).toFixed(4)} · Stock: {q.stock??'unknown'} · MOQ: {q.moq??'unknown'} · Delivery: {q.deliveryDays??'unknown'} days</p><p>Recorded shipping: {q.shipping2===null?'unknown':money(String(q.shipping2),q.currency)} · Duties/fees: {q.fees2===null?'unknown':money(String(q.fees2),q.currency)} · Conversion: {q.fx6===null?'unknown':(q.fx6/1e6).toString()} {currency}/{q.currency}</p><p><strong>{r.cost?.totalMinor!=null?`Calculated landed cost: ${money(r.cost.totalMinor,currency)}`:`Not ranked: ${r.cost?.reason||'missing evidence'}`}</strong></p><p>Valid until {new Date(q.validUntil).toLocaleString()} · Reference: {q.note}</p></>}
          {o&&<><p>Candidate extraction: {o.method} · Retrieved {new Date(o.retrievedAt).toLocaleString()}</p><p>{o.mpn||'Identity unknown'} · {o.manufacturer||'Manufacturer unknown'} · {o.price&&o.currency?`${o.currency} ${o.price}`:'Price unknown'}</p><p style={{overflowWrap:'anywhere'}}>Evidence: {o.evidence}</p><details><summary>Source content SHA-256</summary><code style={{overflowWrap:'anywhere'}}>{o.hash}</code></details><p>Review required. Record a confirmed supplier quotation to include it in the comparison.</p></>}
          {r.state==='submitted'&&canWrite&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void refresh(r.id)}>Check research status</button>}{['submission_unknown','submitting'].includes(r.state)&&<p>Submission may have reached SmartCrawl. Do not submit again until an operator reconciles the recorded request.</p>}{r.errorCode&&<p role="status">Research status: {r.errorCode.replaceAll('_',' ')}</p>}</article>;})}
        </section>
      </>}
    </>}
  </main>;
}
