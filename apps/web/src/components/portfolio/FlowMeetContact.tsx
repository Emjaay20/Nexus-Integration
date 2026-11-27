'use client';
import {useState} from 'react';
import type {InquiryInterest} from '@/lib/portfolio/flowmeet';
const interests:{value:InquiryInterest;label:string}[]=[
 {value:'engineering_discussion',label:'Engineering or architecture discussion'},
 {value:'recruiting',label:'Recruiting / interview'},
 {value:'collaboration',label:'Research or open-source collaboration'},
 {value:'demo_request',label:'Request a Nexus demonstration'}
];
type FormValues={name:string;email:string;company:string;region:string;interest:InquiryInterest;website:string;consent:boolean};
const empty:FormValues={name:'',email:'',company:'',region:'',interest:'engineering_discussion',website:'',consent:false};
function newKey(){return 'nexus-'+crypto.randomUUID();}
export default function FlowMeetContact({bookingHref,enabled}:{bookingHref:string;enabled:boolean}){
 const [values,setValues]=useState<FormValues>(empty),[requestKey,setRequestKey]=useState(''),[submitting,setSubmitting]=useState(false),[success,setSuccess]=useState(''),[error,setError]=useState('');
 function edit<K extends keyof FormValues>(field:K,value:FormValues[K]){
  setValues(v=>({...v,[field]:value}));setRequestKey('');setError('');setSuccess('');
 }
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(submitting||!enabled)return;setError('');setSuccess('');setSubmitting(true);
  const key=requestKey||newKey();setRequestKey(key);
  try{
   const r=await fetch('/api/portfolio/contact',{method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),
    body:JSON.stringify({...values,requestKey:key})});
   const result=await r.json().catch(()=>null);
   if(!r.ok||result?.ok!==true)throw Error(result?.error||'Enquiry could not be confirmed');
   setSuccess(result.notice||'Your enquiry was recorded in FlowMeet.');setValues(empty);setRequestKey('');
  }catch(e){setError(e instanceof Error?e.message:'Unable to send enquiry.');}
  finally{setSubmitting(false);}
 }
 return <div className="story-contact-layout">
  <div className="story-contact-copy">
   <div className="eyebrow">CONNECT THE WORK</div>
   <h2>Discuss Nexus, the architecture, or an engineering role.</h2>
   <p>I built FlowMeet for lead qualification, routing and scheduling. Nexus uses that same system for enquiries and booking, showing how independently developed projects can work together.</p>
   <a href={bookingHref} data-flowmeet-open className="btn btn-primary">
    Book a discussion through FlowMeet
   </a>
   <p className="story-disclaimer">Booking opens FlowMeet&apos;s shared founder calendar. A meeting is confirmed only by its booking provider.</p>
  </div>
  <div className="story-contact-form">
   <h3>Request an introduction</h3>
   <p className="story-disclaimer">Submit a short enquiry to my FlowMeet lead-management workspace. No automated booking email is sent by this form.</p>
   {enabled?<form onSubmit={e=>void submit(e)} aria-label="FlowMeet project enquiry">
    <div className="story-form-grid">
     <label>Name<input required autoComplete="name" maxLength={120} value={values.name} onChange={e=>edit('name',e.target.value)} /></label>
     <label>Email<input type="email" required autoComplete="email" maxLength={254} value={values.email} onChange={e=>edit('email',e.target.value)} /></label>
    </div>
    <div className="story-form-grid">
     <label>Organisation (optional)<input autoComplete="organization" maxLength={120} value={values.company} onChange={e=>edit('company',e.target.value)} /></label>
     <label>Location (optional)<input autoComplete="address-level2" maxLength={60} value={values.region} onChange={e=>edit('region',e.target.value)} /></label>
    </div>
    <label>What would you like to discuss?
     <select value={values.interest} onChange={e=>edit('interest',e.target.value as InquiryInterest)}>
      {interests.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}
     </select>
    </label>
    <div className="story-honeypot" aria-hidden="true">
     <label>Website<input tabIndex={-1} autoComplete="off" value={values.website} onChange={e=>edit('website',e.target.value)} /></label>
    </div>
    <label className="story-consent">
     <input type="checkbox" checked={values.consent} required onChange={e=>edit('consent',e.target.checked)} />
     <span>I consent to my contact details being submitted to FlowMeet for this enquiry.</span>
    </label>
    <button className="btn btn-primary" type="submit" disabled={submitting||!values.consent}>{submitting?'Submitting…':'Send through FlowMeet'}</button>
    {error&&<p role="alert" className="story-notice story-notice-error">{error} Your existing enquiry can be retried without creating a duplicate.</p>}
    {success&&<p role="status" className="story-notice">{success}</p>}
   </form>:
   <p className="story-notice">Direct form capture is not enabled in this environment. The FlowMeet booking link above remains available.</p>}
  </div>
 </div>;
}
