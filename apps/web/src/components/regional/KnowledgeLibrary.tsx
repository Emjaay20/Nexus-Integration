'use client';
import {useCallback,useEffect,useState} from 'react';
type Selection={workspaceId:string;bomId:string;revision:number};
type Item={id:string;name:string;mpn:string;line_index:number;active_version:number;sha256:string;page_count:number;truncated:boolean;updated_at:string};
type Version={id:string;version:number;sha256:string;source_name:string;page_count:number;truncated:boolean;created_at:string;properties:{property:string;value:string;citation:string}[]};
type Hit={document_id:string;name:string;sha256:string;version:number;page_number:number;excerpt:string;rank:number;citation:string};
const field={padding:8,width:'100%',background:'transparent',color:'inherit',border:'1px solid var(--border, #aaa)',borderRadius:6};
export default function KnowledgeLibrary({selection,refresh,onChooseVersion}:{selection:Selection;refresh:number;onChooseVersion:(id:string)=>void}){
 const [documents,setDocuments]=useState<Item[]>([]),[versions,setVersions]=useState<Version[]>([]),[hits,setHits]=useState<Hit[]>([]);
 const [query,setQuery]=useState('operating voltage'),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const params=useCallback((extras:Record<string,string>={})=>new URLSearchParams({workspaceId:selection.workspaceId,bomId:selection.bomId,revision:String(selection.revision),...extras}),[selection.workspaceId,selection.bomId,selection.revision]);
 const load=useCallback(async()=>{
  const res=await fetch('/api/regional-sourcing/knowledge?'+params().toString(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Knowledge base unavailable');
  setDocuments(data.documents||[]);
 },[params]);
 useEffect(()=>{let active=true;void load().catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to list stored documents');});return()=>{active=false;};},[load,refresh]);
 async function search(){setBusy(true);setError('');
  try{const r=await fetch('/api/regional-sourcing/knowledge?'+params({query}).toString(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Search failed');
   setHits(data.hits||[]);setMessage((data.hits||[]).length+' source page(s) matched. Search uses PostgreSQL full-text indexing; no AI-generated passages.');
  }catch(e){setError(e instanceof Error?e.message:'Search failed');}finally{setBusy(false);}
 }
 async function history(id:string){
  setBusy(true);setError('');setSelected(id);setVersions([]);
  try{const r=await fetch('/api/regional-sourcing/knowledge?'+params({documentId:id}).toString(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
   const data=await r.json();if(!r.ok)throw Error(data.error||'History not available');setVersions(data.versions||[]);
  }catch(e){setError(e instanceof Error?e.message:'History failed');}finally{setBusy(false);}
 }
 async function remove(id:string){
  if(!window.confirm('Permanently delete this stored text document and every prior version?'))return;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/regional-sourcing/knowledge',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspaceId:selection.workspaceId,bomId:selection.bomId,revision:selection.revision,documentId:id}),cache:'no-store'});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Deletion failed');
   if(selected===id){setSelected('');setVersions([]);}await load();onChooseVersion('');setMessage('Stored document and versions deleted.');
  }catch(e){setError(e instanceof Error?e.message:'Deletion failed');}finally{setBusy(false);}
 }
 return <section className="result-section">
  <h2>Persistent engineering knowledge base</h2>
  <p>Extracted datasheet text and source hashes can be saved by explicit opt-in. Search and version history are private to this active workspace and BOM. The original PDF bytes are not stored.</p>
  {error&&<p className="note error" role="alert">{error}</p>}{message&&<p className="note" role="status">{message}</p>}
  {documents.length===0?<p>No stored documents yet. Enable “Save extracted text” in the PDF workbench and upload a PDF.</p>:
   documents.map(d=><article key={d.id} className="note"><p><strong>{d.name}</strong> · {d.mpn} · active version {d.active_version} · {d.page_count} page(s){d.truncated?' · Partial':''}</p>
    <p><small>SHA-256: <code style={{overflowWrap:'anywhere'}}>{d.sha256}</code></small></p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     <button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void history(d.id)}>History</button>
     <button className="btn btn-secondary btn-sm" onClick={()=>{onChooseVersion(d.id);setMessage('Selected for next version upload: '+d.name);}}>Use as version target</button>
     <button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void remove(d.id)}>Delete stored text</button>
    </div>
   </article>)}
  {selected&&versions.length>0&&<div className="note"><h3>Document versions</h3>{versions.map(v=><p key={v.id}>Version {v.version} · {v.source_name} · {v.page_count} pages · SHA-256 {v.sha256.slice(0,16)}… · {new Date(v.created_at).toLocaleString()}</p>)}</div>}
  <h3>Search persisted PDF pages</h3>
  <label className="field">Full-text query<input style={field} maxLength={160} value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <button className="btn btn-primary btn-sm" disabled={busy||query.trim().length<2} onClick={()=>void search()}>Search knowledge base</button>
  {hits.map((h,i)=><article className="note" key={h.citation+':'+i}><strong>{h.name} · page {h.page_number}</strong><p>{h.excerpt}</p>
    <small>Source: [{h.citation}] · current version {h.version} · ranking {h.rank}</small></article>)}
  <p className="note">Search returns indexed source excerpts, not validated electrical specifications. Cross-workspace documents are never included.</p>
 </section>;
}
