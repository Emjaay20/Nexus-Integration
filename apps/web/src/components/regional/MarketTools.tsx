'use client';
import {useEffect,useState} from 'react';
import type {Currency,Country,Selection} from '@/lib/regional/model';
import type {FeedCandidate} from '@/lib/regional/feed';
import type {FxReference} from '@/lib/regional/fx';
type Props={currency:Currency;destination:Currency;country:Country;workspaceId:string;selection:Selection;supplierId:string;onFx:(reference:FxReference)=>void;onFeed:(candidate:FeedCandidate)=>void;disabled?:boolean};
export default function MarketTools({currency,destination,country,workspaceId,selection,supplierId,onFx,onFeed,disabled}:Props){
  const [fx,setFx]=useState<FxReference|null>(null),[feed,setFeed]=useState<FeedCandidate[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>{setFx(null);setFeed([]);setError('');setNotice('');},[currency,destination,selection.bomId,selection.revision,selection.line,selection.quantity,supplierId,country]);
  async function lookup(kind:'fx'|'feed'){
    setBusy(true);setError('');setNotice('');
    try{
      const endpoint=kind==='fx'?'/api/regional-sourcing/market?'+new URLSearchParams({base:currency,quote:destination}):'/api/regional-sourcing/market';
      const r=await fetch(endpoint,{method:kind==='fx'?'GET':'POST',headers:{'Content-Type':'application/json'},body:kind==='feed'?JSON.stringify({...selection,workspaceId,supplierId,action:'feed_preview'}):undefined,cache:'no-store',signal:AbortSignal.timeout(15_000)});
      const data=await r.json();if(!r.ok)throw new Error(typeof data.error==='string'?data.error:'Market lookup unavailable');
      if(kind==='fx'){setFx(data as FxReference);setNotice('Reference FX rate retrieved; review it before using it.');}
      else {const candidates=Array.isArray(data.candidates)?data.candidates as FeedCandidate[]:[];setFeed(candidates);setNotice(candidates.length?'Partner feed candidates are not verified quotations.':'No exact-part eligible offers in this feed.');}
    }catch(e){setError(e instanceof Error?e.message:'Lookup failed. Enter a manual quote.');}
    finally{setBusy(false);}
  }
  return <aside className="note" style={{marginTop:16}} aria-label="Partner data and reference FX">
    <h3>Optional regional market tools</h3><p>These are advisory sources. None of these actions creates a purchasing quote or order.</p>
    {currency!==destination&&<div style={{marginBottom:14}}><button type="button" className="btn btn-secondary btn-sm" disabled={disabled||busy} onClick={()=>void lookup('fx')}>Look up reference FX</button>
      {fx&&<p><strong>1 {fx.base} = {fx.rate} {fx.quote}</strong> · {fx.date} · {fx.source} · <a href={fx.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a><br/><button className="btn btn-secondary btn-sm" type="button" disabled={disabled||busy} onClick={()=>onFx(fx)}>Use as draft conversion rate</button></p>}</div>}
    <div><button type="button" className="btn btn-secondary btn-sm" disabled={disabled||busy} onClick={()=>void lookup('feed')}>Check approved supplier feed</button>
      {feed.map((c,i)=><div key={c.sourceUrl+'-'+i} style={{padding:'9px 0',borderTop:'1px solid var(--border, #aaa)'}}><strong>{c.mpn}</strong> · {c.currency} {c.unitPrice} · stock {c.stock??'unknown'} · MOQ {c.moq??'unknown'}<br/><small>Observed {new Date(c.observedAt).toLocaleString()} · expires {new Date(c.validUntil).toLocaleString()} · <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">Original product</a></small><br/><button type="button" disabled={disabled||busy} className="btn btn-secondary btn-sm" onClick={()=>onFeed(c)}>Populate draft for manual review</button></div>)}
    </div>
    {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}. Manual quotation entry remains available.</p>}
  </aside>;
}
