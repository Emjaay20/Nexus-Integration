'use client';
import {useState} from 'react';
import {PlaygroundRequest} from '@/components/playground/PlaygroundRequest';
import Link from 'next/link';
export default function ApiPlaygroundPage(){
  const [response,setResponse]=useState<{status:number|null;duration:string;body:string}|null>(null);
  return <main id="main-content" className="wrap section"><h1>API Playground</h1><p>Record a private test event. No external requests, retries, or provider synchronisation occur. Sign in with a private account; the shared demo is read-only.</p><div className="note">30 test requests per minute per account. Payload contents are not stored.</div><div style={{marginTop:20}}><PlaygroundRequest onResponse={setResponse}/></div>{response&&<section aria-live="polite" className="note"><h2>{response.status===null?'Network error':`HTTP ${response.status}`} · {response.duration}</h2><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{response.body}</pre></section>}<Link href="/integration-hub/logs">View recorded activity ↗</Link></main>;
}
