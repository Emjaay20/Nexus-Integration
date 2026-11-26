'use client';
import {useState} from 'react';
import KnowledgeLibrary from './KnowledgeLibrary';
import {buildDocument,answerDocuments,compareDatasheets,type DatasheetDocument,type DocumentAnswer,type CompatibilityFinding} from '@/lib/regional/document-intelligence';
import type {EvidenceLine} from '@/lib/regional/intelligence';
type Selection={workspaceId:string;bomId:string;revision:number};
const field={width:'100%',padding:'8px 10px',background:'transparent',color:'inherit',border:'1px solid var(--border, #aaa)',borderRadius:6};
const fixtureA='FICTIONAL DATASHEET — synthetic demo only\nOperating voltage: 3.0 to 3.6 V\nOperating temperature: -40 to +85 C\fPAGE TWO — SYNTHETIC\nPackage: QFN-32\nPin count: 32';
const fixtureB='FICTIONAL ALTERNATIVE — synthetic demo only\nOperating voltage: 1.8 to 3.3 V\nOperating temperature: -20 to +70 C\nPackage: QFN-32\nPin count: 28';
export default function DatasheetWorkbench({selection,lines,canWrite=true}:{selection:Selection|null;lines:EvidenceLine[];canWrite?:boolean}){
 const [documents,setDocuments]=useState<DatasheetDocument[]>([]),[file,setFile]=useState<File|null>(null),[line,setLine]=useState(0);
 const [query,setQuery]=useState('operating voltage'),[answer,setAnswer]=useState<DocumentAnswer|null>(null);
 const [primary,setPrimary]=useState(''),[candidate,setCandidate]=useState(''),[comparison,setComparison]=useState<CompatibilityFinding[]|null>(null);
 const [working,setWorking]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [persist,setPersist]=useState(false),[existingId,setExistingId]=useState(''),[refresh,setRefresh]=useState(0);
 function demo(){
  const a=buildDocument({sha256:'a'.repeat(64),name:'FICTIONAL Microcontroller A',text:fixtureA});
  const b=buildDocument({sha256:'b'.repeat(64),name:'FICTIONAL Alternative B',text:fixtureB});
  setDocuments([a,b]);setPrimary(a.id);setCandidate(b.id);setComparison(null);setAnswer(answerDocuments([a,b],query));setNotice('Loaded synthetic text-layer evidence. These are not real manufacturer specifications.');setError('');
 }
 async function upload(){
  if(!file||!selection)return;setError('');setNotice('');setWorking(true);
  try{
   if(file.type!=='application/pdf'||file.size>1500000||file.size<32)throw Error('Upload an unencrypted PDF text layer under 1.5 MB');
   const data=new FormData();
   data.set('file',file);data.set('workspaceId',selection.workspaceId);data.set('bomId',selection.bomId);data.set('revision',String(selection.revision));data.set('line',String(line));
   data.set('persist',persist?'true':'false');if(persist&&existingId)data.set('documentId',existingId);
   const response=await fetch('/api/regional-sourcing/datasheet',{method:'POST',body:data,cache:'no-store',signal:AbortSignal.timeout(25000)});
   const payload=await response.json();if(!response.ok)throw Error(payload.error||'Unable to extract PDF');
   const result=payload.document as DatasheetDocument;
   setDocuments(old=>old.some(x=>x.id===result.id)?old:old.length>=5?[...old.slice(1),result]:[...old,result]);
   setAnswer(null);setComparison(null);setFile(null);if(payload.saved){setRefresh(n=>n+1);setExistingId(payload.saved.documentId);}
   setNotice(payload.saved?'Original PDF deleted from temporary storage; extracted text saved as document version '+payload.saved.version+'.':'PDF text processed and temporary PDF deleted. Analysis stays in this browser session only.');
  }catch(e){setError(e instanceof Error?e.message:'PDF analysis failed');}finally{setWorking(false);}
 }
 function find(){try{setAnswer(answerDocuments(documents,query));setError('');}catch(e){setError(e instanceof Error?e.message:'Search failed');}}
 function compare(){
  try{
   const a=documents.find(d=>d.id===primary),b=documents.find(d=>d.id===candidate);
   if(!a||!b||a.id===b.id)throw Error('Choose two different source documents');
   setComparison(compareDatasheets(a,b));setError('');
  }catch(e){setError(e instanceof Error?e.message:'Comparison failed');}
 }
 function exportJSON(){
  const evidence={purpose:'portfolio demonstration — manual engineering review required',documents:documents.map(d=>({id:d.id,name:d.name,sha256:d.sha256,pageCount:d.pages.length,properties:d.properties,truncated:d.truncated})),search:answer,comparison};
  const data=new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'});const url=URL.createObjectURL(data);
  const link=document.createElement('a');link.href=url;link.download='nexus-datasheet-evidence.json';link.click();URL.revokeObjectURL(url);
 }
 return <section id="nexus-datasheet-workbench" className="result-section">
  <h2>PDF datasheet intelligence &amp; citations</h2>
  <p>Upload a PDF text layer (up to 1.5 MB). The server processes at most 12 pages with local Poppler, returns bounded text and SHA-256 provenance, and deletes the temporary file. Documents remain only in this browser session. Scanned PDFs require separate OCR and are not supported.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn btn-secondary btn-sm" onClick={demo}>Load two synthetic datasheets</button>{documents.length>0&&<button className="btn btn-secondary btn-sm" onClick={exportJSON}>Export cited analysis JSON</button>}</div>
  {selection&&canWrite&&<div style={{marginTop:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))',gap:12}}>
   <label className="field">BOM component<select style={field} value={line} onChange={e=>setLine(Number(e.target.value))}>{lines.map((l,i)=><option key={l.id} value={i}>{l.mpn}</option>)}</select></label>
   <label className="field">PDF text document<input style={field} type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
   <div style={{display:'flex',alignItems:'end'}}><button className="btn btn-primary btn-sm" disabled={working||!file} onClick={()=>void upload()}>{working?'Extracting…':persist?'Extract & save text':'Extract PDF text'}</button></div>
  </div>}
  {selection&&canWrite&&<p><label><input type="checkbox" checked={persist} onChange={e=>setPersist(e.target.checked)}/> Save extracted PDF text to my private workspace knowledge base (up to five documents per BOM; original PDF bytes deleted)</label>{existingId&&<small> · Selected existing document for new version. <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setExistingId('')}>Create separate document</button></small>}</p>}
  {!selection&&<p className="note">Sign in and load a saved BOM to upload your own PDF. The fully synthetic demo works without sign-in.</p>}
  {error&&<p role="alert" className="note error">{error}</p>}{notice&&<p role="status" className="note">{notice}</p>}
  {documents.length>0&&<>
   <h3>In-session source document index</h3>
   {documents.map(d=><article key={d.id} className="note">
    <strong>{d.name}</strong> — {d.pages.length} extracted page(s) · {d.properties.length} candidate specifications{d.truncated?' · PARTIAL TEXT':''}
    <details><summary>Source fingerprint &amp; extracted properties</summary><p><code style={{overflowWrap:'anywhere'}}>SHA-256: {d.sha256}</code></p>
     {d.properties.map(p=><p key={p.citation}><strong>{p.property.replaceAll('_',' ')}:</strong> {p.value} · [{p.citation}]<br/><small>{p.excerpt} — review against original PDF</small></p>)}
    </details>
   </article>)}
   <h3>Ask a question about these documents</h3>
   <label className="field">Search original page text<input style={field} value={query} maxLength={500} onChange={e=>setQuery(e.target.value)}/></label>
   <button className="btn btn-primary btn-sm" onClick={find}>Retrieve cited excerpts</button>
   {answer&&<div className="note" style={{marginTop:12}}><strong>{answer.status.replaceAll('_',' ')}</strong><p>{answer.summary}</p>
    {answer.hits.map(hit=><p key={hit.citation}><strong>{hit.document}, page {hit.page}</strong> · [{hit.citation}]<br/>{hit.excerpt}</p>)}
    <p>{answer.caution}</p></div>}
   <h3>Conservative alternative comparison</h3>
   <p>Matching text does not demonstrate equivalent pinout, footprint or performance. This tool deliberately never approves a component substitution.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,180px),1fr))',gap:12}}>
    <label className="field">Original document<select style={field} value={primary} onChange={e=>setPrimary(e.target.value)}><option value="">Choose document</option>{documents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label className="field">Candidate alternative<select style={field} value={candidate} onChange={e=>setCandidate(e.target.value)}><option value="">Choose alternative</option>{documents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
   </div>
   <button className="btn btn-secondary btn-sm" onClick={compare}>Compare extracted properties</button>
   {comparison&&<div className="note">{comparison.map(c=><p key={c.property}><strong>{c.property.replaceAll('_',' ')}:</strong> {c.primary||'unknown'} vs {c.candidate||'unknown'} — {c.status.replaceAll('_',' ')}<br/><small>{c.note} {c.citations.join(' · ')}</small></p>)}</div>}
  </>}
  {selection&&<KnowledgeLibrary key={selection.bomId+':'+selection.revision} selection={selection} readOnly={!canWrite} refresh={refresh} onChooseVersion={id=>{setExistingId(id);setPersist(!!id);}}/>}
 </section>;
}
