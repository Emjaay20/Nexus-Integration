/** Ephemeral, local text-layer PDF extraction. No OCR, network fetch or persistent document storage. */
import {createHash} from 'node:crypto';
import {execFile as callbackExecFile} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {buildDocument,type DatasheetDocument} from './document-intelligence';
const execFile=promisify(callbackExecFile);
export class PdfError extends Error{constructor(readonly code:string){super(code)}}
export async function extractPDF(bytes:Uint8Array,name:string):Promise<DatasheetDocument>{
 if(!(bytes instanceof Uint8Array)||bytes.length<32||bytes.length>1500000)throw new PdfError('pdf_size_invalid');
 if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new PdfError('invalid_pdf_magic');
 if(typeof name!=='string'||name.length>160||!name.toLowerCase().endsWith('.pdf'))throw new PdfError('pdf_filename_invalid');
 const sha256=createHash('sha256').update(bytes).digest('hex');
 const dir=await mkdtemp(join(tmpdir(),'nexus-pdf-'));
 const file=join(dir,'input.pdf');
 try{
  await writeFile(file,bytes,{mode:0o600,flag:'wx'});
  // -f/-l bound the amount of text extracted. All argument vectors are fixed, no shell interpolation.
  const [extracted,info]=await Promise.all([
   execFile('pdftotext',['-f','1','-l','12','-layout','-enc','UTF-8',file,'-'],{timeout:7000,maxBuffer:700000,encoding:'utf8'}),
   execFile('pdfinfo',[file],{timeout:5000,maxBuffer:24000,encoding:'utf8'}).catch(()=>({stdout:''}))
  ]);
  const text=extracted.stdout;
  if(typeof text!=='string'||!text.trim())throw new PdfError('pdf_no_readable_text');
  const document=buildDocument({sha256,name,text});
  const pages=/^Pages:\s*(\d+)/m.exec(info.stdout||'');
  const count=pages?Number(pages[1]):null;
  return {...document,truncated:document.truncated||(count!==null&&count>12)};
 }catch(e){
  if(e instanceof PdfError)throw e;
  throw new PdfError('pdf_extraction_failed_or_unsupported');
 }finally{
  await rm(dir,{recursive:true,force:true}).catch(()=>{});
 }
}
