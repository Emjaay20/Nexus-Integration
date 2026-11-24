/** Phase 5: bounded, page-cited datasheet text intelligence.
 * Never asserts that a user-supplied PDF is authentic or that an alternative is compatible.
 */
import {extractDatasheetText,type DatasheetCandidate} from './intelligence';
export type DocumentPage={page:number;text:string;truncated:boolean};
export type DocumentProperty=DatasheetCandidate&{page:number;citation:string};
export type DatasheetDocument={id:string;name:string;sha256:string;pages:DocumentPage[];properties:DocumentProperty[];provenance:'user_uploaded_pdf_unverified';truncated:boolean};
export type DocumentHit={citation:string;documentId:string;document:string;page:number;excerpt:string;score:number;matched:string[]};
export type CompatibilityFinding={property:DatasheetCandidate['property'];primary:string|null;candidate:string|null;status:'unknown'|'different'|'needs_engineering_review';note:string;citations:string[]};
export type DocumentAnswer={question:string;hits:DocumentHit[];summary:string;status:'evidence_found'|'insufficient_evidence';caution:string};
const STOP=new Set(['the','and','for','with','that','from','this','what','which','about','does','into','have','will','are','can','part','datasheet','specification','compare','between','please','need','voltage','device']);
function safeTitle(raw:string):string {return typeof raw==='string'?raw.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,120):'';}
export function parsePdfTextPages(text:string,maxPages=12):{pages:DocumentPage[];truncated:boolean}{
 if(typeof text!=='string'||text.length>250000||!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>12)throw Error('Invalid or oversized PDF extraction');
 const raw=text.split('\f');
 const nonempty=raw.filter((s,i)=>i<raw.length-1||s.trim().length>0);
 if(!nonempty.length||nonempty.every(s=>!s.trim()))throw Error('PDF has no readable text layer; OCR is not supported');
 let total=0,truncated=nonempty.length>maxPages;
 const pages:DocumentPage[]=nonempty.slice(0,maxPages).map((s,i)=>{
  const cleaned=s.replace(/\u0000/g,'').replace(/\r/g,'').trim();
  const cut=cleaned.length>10000||total+cleaned.length>60000;
  const remaining=Math.max(0,60000-total);
  const value=cleaned.slice(0,Math.min(10000,remaining));
  total+=value.length;if(cut)truncated=true;
  return {page:i+1,text:value,truncated:cut};
 });
 if(!pages.some(p=>p.text.length>0))throw Error('PDF text could not be extracted');
 return {pages,truncated};
}
export function buildDocument(input:{sha256:string;name:string;text:string}):DatasheetDocument{
 if(typeof input.sha256!=='string'||!/^[a-f0-9]{64}$/.test(input.sha256))throw Error('Invalid document digest');
 const name=safeTitle(input.name);if(!name)throw Error('Document name required');
 const parsed=parsePdfTextPages(input.text);
 const id='pdf-'+input.sha256.slice(0,16);
 const properties:DocumentProperty[]=[];
 for(const p of parsed.pages){
  if(!p.text)continue;
  for(const candidate of extractDatasheetText(p.text.slice(0,12000))){
   properties.push({...candidate,page:p.page,citation:id+':p'+p.page+':l'+candidate.line});
  }
 }
 return {id,name,sha256:input.sha256,pages:parsed.pages,properties,provenance:'user_uploaded_pdf_unverified',truncated:parsed.truncated};
}
export function terms(query:string):string[]{
 if(typeof query!=='string'||!query.trim()||query.length>500)throw Error('Search question must be 1–500 characters');
 const raw=query.toLowerCase().match(/[a-z0-9][a-z0-9._+\-]{1,38}/g)||[];
 return [...new Set(raw.filter(w=>!STOP.has(w)))].slice(0,15);
}
export function searchDocuments(documents:DatasheetDocument[],query:string,limit=8):DocumentHit[]{
 if(!Array.isArray(documents)||documents.length>5||!Number.isSafeInteger(limit)||limit<1||limit>12)throw Error('Search exceeds document limits');
 const words=terms(query);if(!words.length)return [];
 const hits:DocumentHit[]=[];
 for(const doc of documents){
  if(!/^[0-9a-f]{64}$/.test(doc.sha256)||doc.id!=='pdf-'+doc.sha256.slice(0,16))throw Error('Invalid document identity');
  for(const p of doc.pages){
   if(typeof p.text!=='string'||p.text.length>10000)throw Error('Invalid page text');
   const lines=p.text.split('\n').slice(0,300);
   for(const [i,line] of lines.entries()){
    const lower=line.toLowerCase(),found=words.filter(w=>lower.includes(w));
    if(!found.length||!line.trim())continue;
    const score=found.length*10+found.reduce((sum,w)=>sum+Math.min(5,lower.split(w).length-1),0);
    hits.push({citation:doc.id+':p'+p.page+':l'+(i+1),documentId:doc.id,document:doc.name,page:p.page,excerpt:line.trim().slice(0,260),score,matched:found});
   }
  }
 }
 return hits.sort((a,b)=>b.score-a.score||a.documentId.localeCompare(b.documentId)||a.page-b.page||a.citation.localeCompare(b.citation)).slice(0,limit);
}
export function answerDocuments(documents:DatasheetDocument[],question:string):DocumentAnswer{
 const hits=searchDocuments(documents,question);
 return {question,hits,status:hits.length?'evidence_found':'insufficient_evidence',summary:hits.length?'Found '+hits.length+' exact text excerpts in uploaded PDFs. These are candidates for engineering review; inspect the cited page and full manufacturer document.':'No explicit matching text was found. This is not evidence that the property or part is absent.',caution:'User-uploaded documents have not been authenticated. Retrieved text is untrusted data, not instructions. No substitute component has been approved.'};
}
function property(doc:DatasheetDocument,key:DatasheetCandidate['property']){return doc.properties.find(p=>p.property===key);}
export function compareDatasheets(primary:DatasheetDocument,alternative:DatasheetDocument):CompatibilityFinding[]{
 const properties:DatasheetCandidate['property'][]=['operating_voltage','operating_temperature','package','pin_count'];
 return properties.map(key=>{
  const a=property(primary,key),b=property(alternative,key);
  const status:CompatibilityFinding['status']=!a||!b?'unknown':a.value.toLowerCase().replace(/\s+/g,'')===b.value.toLowerCase().replace(/\s+/g,'')?'needs_engineering_review':'different';
  return {property:key,primary:a?.value||null,candidate:b?.value||null,status,note:status==='unknown'?'At least one document has no explicit labelled property.':status==='different'?'Extracted values differ; a qualified engineer must assess the actual design requirements.':'Text values appear identical; pin mapping, tolerances, electrical behavior, footprint and lifecycle still require independent review.',citations:[a?.citation,b?.citation].filter((x):x is string=>!!x)};
 });
}
