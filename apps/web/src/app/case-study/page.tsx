import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight,ArrowRight} from 'lucide-react';
import {bookingUrl,FALLBACK_BOOKING_URL} from '@/lib/portfolio/flowmeet';

export const metadata:Metadata={
 title:'Why I Built Nexus — An Engineering Case Study',
 description:'The personal engineering problem behind Nexus, its Rust/Go/Next.js architecture, evidence-grounded procurement workflow, trade-offs and reproducible verification.'
};
const stack=[
 ['Rust / Actix','BOM parsing, part normalization, policy evaluation, workspace service, protected jobs and audit boundaries.'],
 ['Go','Concurrency-bounded distributor ingestion with explicit live, reference or unavailable source provenance.'],
 ['Next.js / TypeScript','Engineer-facing workflows for regional sourcing, BOM optimisation, evidence review and human-approved agent recommendations.'],
 ['PostgreSQL / Neon','Tenant-scoped BOMs, source observations, research scheduling, versioned PDF text and indexed page retrieval.'],
 ['Docker / Helm / GitHub Actions','Polyglot image builds, CI tests, readiness probes, staged verification and rollback-oriented release practices.']
];
const phases=[
 ['1–2','Foundation and market data','Regional suppliers, operator-authorised feeds, FX references and defensible quote inputs.'],
 ['3','Whole-BOM optimisation','Exact bounded allocation for smaller assemblies and a disclosed heuristic for larger requirements.'],
 ['4–5','Evidence and document intelligence','Source-classified observations, grounded answers, approved research and page-cited PDF text extraction.'],
 ['6','Persistent knowledge and schedules','Versioned extracted document text, Postgres retrieval and narrowly authorised recurring research.'],
 ['7','Human-approved procurement planning','Ranked next steps, current document versions, evidence references and explicit approval handoffs.']
];
const proofs=[
 {title:'A bounded optimization problem',text:'The solver compares local, international and mixed supplier plans using quantity limits, MOQ, exchange rates and per-supplier setup costs. Exact mode is bounded; large cases disclose heuristic behavior.',link:'/regional-sourcing/planner',action:'Review whole-BOM planner'},
 {title:'Security as part of correctness',text:'A user session is not enough to read a BOM. Membership, active workspace and revision checks are enforced against PostgreSQL, with rate limits, request identity and read/write separation.',link:'/docs',action:'Inspect security documentation'},
 {title:'Provenance over impressive-looking guesses',text:'A scraped catalog observation, a customer-reported quotation and an illustrative fixture carry different statuses. Missing information stays missing rather than being invented.',link:'/regional-sourcing/intelligence',action:'Explore evidence intelligence'},
 {title:'A release process, not only a demo',text:'GitHub Actions checks web behavior and typed builds; the repository also contains Rust/Go tests, container configuration and rollout/rollback evidence. Tests are scoped to their exercised environments.',link:'https://github.com/Emjaay20/Nexus-Integration',action:'Inspect source and CI'}
];
const diagram=[
 'Engineer / portfolio visitor',
 '        |',
 '        v',
 'Next.js + TypeScript ----- PostgreSQL / Neon',
 '        |                 | tenant BOM revisions',
 '        |                 | source records + audit',
 '        |                 | versioned PDF text',
 '        v',
 'Rust / Actix core ------- policy + jobs + heuristics',
 '        |',
 '        v',
 'Go distributor workers -- approved provider connections',
 '        |',
 '        v',
 'Sources classified as live / reference / unavailable',
 '',
 'Separate portfolio systems:',
 'Nexus hosted using AetherHost infrastructure',
 'Portfolio enquiry -----> FlowMeet lead capture / booking'
].join('\n');
export default function CaseStudy(){
 let book=FALLBACK_BOOKING_URL;try{book=bookingUrl(process.env.NEXUS_FLOWMEET_BOOKING_URL);}catch{}
 return <main id="main-content" className="wrap">
  <header className="pagehead story-case-intro">
   <p className="eyebrow">CASE STUDY / FOUNDING MOTIVATION / PLATFORM ENGINEERING</p>
   <h1>Why I built Nexus.</h1>
   <p>From a postgraduate IoT research prototype to a demonstrable platform for electronics sourcing, evidence-aware decision-making and software reliability.</p>
   <div className="story-links">
    <Link href="/regional-sourcing/planner">Try the working sourcing demo <ArrowUpRight size={14}/></Link>
    <a href="https://github.com/Emjaay20/Nexus-Integration" target="_blank" rel="noopener noreferrer">View the GitHub repository <ArrowUpRight size={14}/></a>
    <a href={book} data-flowmeet-open target="_blank" rel="noopener noreferrer">Discuss the architecture through FlowMeet <ArrowUpRight size={14}/></a>
   </div>
  </header>
  <section className="section story-case-intro">
   <p className="eyebrow">THE HUMAN PROBLEM</p>
   <h2>I needed components before I could validate my research system.</h2>
   <p>My postgraduate engineering project, <strong>A Blockchain-Secure IoT Platform for Remote Patient Monitoring with Interpretable Health Forecasting</strong>, involved an ESP8266-class microcontroller, physiological sensors, a real-time application and a blockchain integrity layer.</p>
   <p>Prototyping required more than writing software. I had to identify the right physical components and source them under real constraints. In a fragmented market, unit prices alone did not tell me whether a part was available, compatible, deliverable or affordable after shipping and exchange-rate conversion.</p>
   <p>This experience motivated a separate question: <strong>What would an engineering-first sourcing platform look like if every recommendation could explain where its information came from, which constraints it used and what remained uncertain?</strong></p>
  </section>
  <section className="section">
   <p className="eyebrow">ENGINEERING SCOPE</p>
   <h2>Seven phases, one workflow.</h2>
   <div className="story-case-grid">
    {phases.map(([phase,title,description])=><article key={phase}>
     <p className="eyebrow">PHASE {phase}</p><h3>{title}</h3><p>{description}</p>
    </article>)}
   </div>
  </section>
  <section className="section">
   <p className="eyebrow">ARCHITECTURE</p>
   <h2>Separate the policy, integration and decision layers.</h2>
   <pre className="story-case-diagram" aria-label="Nexus platform architecture">{diagram}</pre>
   <p>Rust owns policy and protected workspace operations; Go isolates bounded distributor network activity; Next.js owns user experience and evidence analysis. Data persists in PostgreSQL with tenant-aware access checks. FlowMeet is a separate lead and booking system, not a backend dependency of the sourcing engine.</p>
   <div className="story-case-grid">
    {stack.map(([label,detail])=><article key={label}><h3>{label}</h3><p>{detail}</p></article>)}
   </div>
   <Link href="/docs" className="textlink">Review the architecture handbook <ArrowRight size={14} style={{display:"inline"}} /></Link>
  </section>
  <section className="section">
   <p className="eyebrow">REVIEWABLE EVIDENCE</p>
   <h2>Why this is an engineering case study, not a feature checklist.</h2>
   <div className="story-case-grid">{proofs.map(p=><article key={p.title}>
    <h3>{p.title}</h3><p>{p.text}</p>
    <p style={{marginTop:18}}><Link href={p.link}>{p.action} <ArrowUpRight size={14} style={{display:"inline"}} /></Link></p>
   </article>)}</div>
   <p className="story-muted">The project demonstrates system design and verification in the tested environments. It is not evidence of production-scale customer adoption, independent supplier-price guarantees or calibrated stock-out forecasts.</p>
  </section>
  <section className="section">
   <p className="eyebrow">CONNECTED PORTFOLIO</p><h2>Each product demonstrates a different part of my engineering practice.</h2>
   <div className="story-case-grid">
    <article><h3>Nexus</h3><p>Procurement intelligence, Rust/Go services, document provenance, tenant isolation and optimisation.</p><p style={{marginTop:15}}><a href="https://github.com/Emjaay20/Nexus-Integration" target="_blank" rel="noopener noreferrer">Source repository ↗</a></p></article>
    <article><h3>AetherHost</h3><p>Application deployment, infrastructure controls, workload lifecycle and the hosting context for this demonstration.</p><p style={{marginTop:15}}><a href="https://github.com/Emjaay20/AetherHost" target="_blank" rel="noopener noreferrer">Source repository ↗</a></p></article>
    <article><h3>FlowMeet</h3><p>Lead intake, routing, delivery and booking workflows. This site delegates visitor enquiries and booking to FlowMeet when integration credentials are enabled.</p><p style={{marginTop:15}}><a href="https://flowmeet.aetherhost.app" target="_blank" rel="noopener noreferrer">FlowMeet project ↗</a></p></article>
    <article><h3>SmartCrawler</h3><p>Dedicated crawling and content-processing engine hosted on AetherHost. Powers Nexus from behind the scenes by extracting datasheets and regional catalog evidence via audited, permission-governed jobs.</p><p style={{marginTop:15}}><a href="https://smart-crawler.aetherhost.app/" target="_blank" rel="noopener noreferrer">SmartCrawler project ↗</a> &nbsp; <a href="https://github.com/Emjaay20/Smart-Crawler-Plugin" target="_blank" rel="noopener noreferrer">Source ↗</a></p></article>
   </div>
  </section>
  <section className="section story-case-intro">
   <p className="eyebrow">LIMITATIONS I WOULD DISCUSS IN AN INTERVIEW</p>
   <h2>Useful software is also clear about what has not been established.</h2>
   <p>The procurement optimizer has a bounded exact mode and an approximate large-BOM mode. Risk scores are hand-authored and have not been calibrated against a production dataset. Document extraction is conservative, relies on text-layer PDFs and does not certify electrical replacements. External supplier data is only live when an authorised connector returns a provider response. Autonomous purchasing is intentionally absent.</p>
   <p>The approach is to make each limitation measurable: benchmark against realistic supplier data, run a documented staging acceptance, and add new autonomy only where trustworthy evidence and human controls justify it.</p>
  </section>
  <section className="section story-close">
   <div><p className="eyebrow">A CONVERSATION WORTH HAVING</p>
    <h2>Interested in how I built and tested it?</h2>
    <p>I can walk through the Rust architecture, tenant boundaries, sourcing algorithms, CI evidence and design trade-offs in a technical interview.</p>
   </div>
   <a className="btn btn-primary" href="https://flowmeet.aetherhost.app/book/aetherhost" data-flowmeet-open>Contact me through FlowMeet <ArrowUpRight size={17}/></a>
  </section>
 </main>;
}
