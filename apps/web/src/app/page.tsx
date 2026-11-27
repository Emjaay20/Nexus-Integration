import Link from "next/link";
import Script from "next/script";
import { ArrowUpRight, ArrowRight, FileSpreadsheet, Search, ListChecks, Database, Network, ShieldCheck, FileCheck2, GitBranch, CalendarDays } from "lucide-react";
import { Enrichment } from "@/components/platform/Enrichment";
import FlowMeetContact from "@/components/portfolio/FlowMeetContact";
import { bookingUrl, bookingSlug, captureConfigured, FALLBACK_BOOKING_URL } from "@/lib/portfolio/flowmeet";

const architecture = [
  {
    tag: "RUST / ACTIX",
    title: "Policy and platform core",
    body: "Part normalization, permission evaluation and inspectable risk heuristics live in the core. Sourcing risk is explainable, not a validated failure probability.",
    href: "/platform-core",
    link: "Explore the Rust Studio",
  },
  {
    tag: "GO / CONCURRENT INGESTION",
    title: "Bounded supplier acquisition",
    body: "Parallel supplier lookups with explicit live, reference and unavailable labels. Commercial catalog integrations require independent provider credentials.",
    href: "/platform-core",
    link: "See distributor enrichment",
  },
  {
    tag: "NEXT.JS / POSTGRESQL",
    title: "One auditable workspace",
    body: "Multi-tenant BOM storage, revision checks, completed evidence records, source-cited document search and research plans with human approval.",
    href: "/regional-sourcing/intelligence",
    link: "Inspect evidence intelligence",
  },
  {
    tag: "CI / CONTAINER DELIVERY",
    title: "Engineered for the full lifecycle",
    body: "Automated tests, immutable images, deployment checks and rollback verification support an implementation that can be inspected beyond a slide deck.",
    href: "/case-study",
    link: "Read the engineering decisions",
  },
];
const ecosystem = [
  {
    title: "AetherHost",
    label: "Deployment and infrastructure",
    description: "A separate hosting platform I built. It provides the deployment context for the hosted Nexus demonstration; its security and lifecycle engineering form another portfolio case study.",
    href: "https://aetherhost.com.ng",
    repo: "https://github.com/Emjaay20/AetherHost",
  },
  {
    title: "FlowMeet",
    label: "Lead capture and scheduling",
    description: "The enquiry and booking handoff on this site uses my FlowMeet system. The integration uses a server-held workspace API key when enabled, with a booking-link fallback.",
    href: "https://flowmeet.aetherhost.app",
    repo: "https://github.com/Emjaay20/Flowmeet",
  },
  {
    title: "SmartCrawler",
    label: "Data ingestion & crawler engine",
    description: "A dedicated web crawling and content extraction engine hosted on AetherHost. It powers Nexus from behind the scenes by asynchronously retrieving component datasheets, technical specs, and supplier catalog evidence with strict egress and SSRF controls.",
    href: "https://smart-crawler.aetherhost.app/",
    repo: "https://github.com/Emjaay20/Smart-Crawler-Plugin",
  },
];
export default function Home() {
  let book = FALLBACK_BOOKING_URL;
  try { book = bookingUrl(process.env.NEXUS_FLOWMEET_BOOKING_URL); } catch { /* Known shared founder calendar fallback. */ }
  const capture = captureConfigured();
  return (
    <main id="main-content">
      <div className="wrap">
        <section className="hero story-hero">
          <div className="hero-label">A founder-built engineering case study · Nigeria-first electronics sourcing</div>
          <h1>
            Building hardware is hard enough.
            <br />
            <em>Finding the right components shouldn't be.</em>
          </h1>
          <p className="hero-sub">
            I&apos;m a computer and software engineer. Nexus began with a problem I faced
            during my postgraduate IoT research: turning a promising prototype into
            working hardware meant navigating fragmented suppliers, unclear prices and
            uncertain component availability.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" href="/case-study">
              Why I built Nexus <ArrowUpRight size={17} />
            </Link>
            <Link className="btn btn-secondary" href="/regional-sourcing/planner">
              <FileSpreadsheet size={17} /> Try the BOM planner
            </Link>
            <a className="btn btn-secondary" href={book} data-flowmeet-open>
              <CalendarDays size={17} /> Talk through FlowMeet
            </a>
          </div>
          <p className="hero-stack">
            Research problem → practical engineering platform → inspectable evidence, not just a presentation.
          </p>
          <div className="statrow" aria-label="What Nexus demonstrates">
            <div className="stat"><b>7 phases</b><span>One connected sourcing and research workflow</span></div>
            <div className="stat"><b>3 runtimes</b><span>Next.js, Rust and Go working together</span></div>
            <div className="stat"><b>Human-approved</b><span>Recommendations do not place orders or authorize crawling</span></div>
            <div className="stat"><b>Source-aware</b><span>Quotation, research and demo data stay distinct</span></div>
          </div>
        </section>
        <section id="origin" className="section story-origin">
          <div className="section-head">
            <div>
              <div className="eyebrow">01 — THE PROBLEM I EXPERIENCED</div>
              <h2>From remote patient monitoring research to electronics procurement.</h2>
            </div>
            <Link href="/case-study" className="textlink">The complete origin story <ArrowRight size={14} style={{display:"inline"}} /></Link>
          </div>
          <div className="story-origin-grid">
            <div className="story-quote">
              <p className="eyebrow">POSTGRADUATE ENGINEERING RESEARCH</p>
              <h3>A Blockchain-Secure IoT Platform for Remote Patient Monitoring with Interpretable Health Forecasting</h3>
              <p>
                Developing the prototype involved IoT sensing hardware, real-time application services,
                interpretable forecasting and integrity verification. Those components were not simply
                items on a slide: I needed to find, compare and assemble physical parts.
              </p>
              <p className="story-muted">The research project inspired Nexus; Nexus is a separate software engineering project, not a claimed clinical product.</p>
            </div>
            <div className="story-problems">
              <div><span>01</span><div><h3>Fragmented sourcing</h3><p>Different sellers, inconsistent product descriptions and no single place to understand a complete Bill of Materials.</p></div></div>
              <div><span>02</span><div><h3>Uncertain landed costs</h3><p>A low unit price can become an expensive purchase after minimum order quantities, shipping, FX and fees.</p></div></div>
              <div><span>03</span><div><h3>Evidence I could not trust blindly</h3><p>A catalog listing is not a confirmed quotation. A similarly named component is not necessarily an engineering-safe substitute.</p></div></div>
            </div>
          </div>
        </section>
        <section className="section story-proposition" id="solution">
          <div className="section-head"><div>
            <div className="eyebrow">02 — THE SOLUTION I BUILT</div>
            <h2>Make the decision process as inspectable as the code.</h2>
            <p>Nexus connects the steps between a component requirement and a defensible sourcing decision, while preserving what is known, unknown and still awaiting review.</p>
          </div></div>
          <div className="process-strip">
            {[
              {icon:FileSpreadsheet,title:"Import the BOM",text:"Validate exact part identities, manufacturers and build quantities."},
              {icon:Search,title:"Compare sourcing paths",text:"Evaluate Nigeria-first, international and mixed supplier allocations with landed-cost constraints."},
              {icon:ListChecks,title:"Review the evidence",text:"Trace quotations, consented research, datasheet passages, risks and human-approved next steps."}
            ].map((step,i)=><div key={step.title}>
              <span className="eyebrow">0{i+1} &nbsp; <step.icon size={16} style={{display:"inline",verticalAlign:"middle"}} /></span>
              <b>{step.title}</b><p>{step.text}</p>
            </div>)}
          </div>
          <div className="story-links">
            <Link href="/bom-importer">Import a BOM <ArrowUpRight size={14}/></Link>
            <Link href="/regional-sourcing">Explore regional sourcing <ArrowUpRight size={14}/></Link>
            <Link href="/regional-sourcing/intelligence">Open evidence intelligence <ArrowUpRight size={14}/></Link>
          </div>
        </section>
        <section className="section" style={{paddingTop:12}}>
          <div className="section-head">
            <div><div className="eyebrow">03 — SEE IT IN PRACTICE</div>
              <h2>A working demonstration, not a claim of unlimited supplier coverage.</h2>
              <p>Run a sample sourcing request. Synthetic examples, reference catalogs and live supplier responses are explicitly identified; external feeds require provider authorisation.</p>
            </div>
            <Link href="/platform-core" className="textlink">Open the full Studio <ArrowUpRight size={14} style={{display:"inline"}} /></Link>
          </div>
          <Enrichment compact />
        </section>
        <section className="section" id="architecture">
          <div className="section-head">
            <div>
              <div className="eyebrow">04 — ENGINEERING ARCHITECTURE</div>
              <h2>What I can explain, test and defend.</h2>
              <p>Each runtime has a defined responsibility, from sourcing rules and concurrent ingestion to tenant-safe records and release engineering.</p>
            </div>
            <Link className="textlink" href="/docs">Architecture documentation <ArrowUpRight size={14} style={{display:"inline"}} /></Link>
          </div>
          {architecture.map((a,i)=><div className="arch-row" key={a.tag}>
            <span className="arch-num">0{i+1}</span>
            <div><div className="arch-tag">{a.tag}</div><h3>{a.title}</h3></div>
            <p>{a.body}</p>
            <div className="arch-meta"><Link href={a.href}>{a.link} ↗</Link></div>
          </div>)}
        </section>
        <section className="section story-ecosystem" id="ecosystem">
          <div className="section-head"><div>
            <div className="eyebrow">05 — AN INTERCONNECTED ENGINEERING PORTFOLIO</div>
            <h2>Separate products. Shared engineering discipline.</h2>
            <p>Nexus does not stand alone. I also built the infrastructure that hosts applications, the system that handles portfolio enquiries, and related data-ingestion tools. Each project has its own trust boundaries and implementation evidence.</p>
          </div></div>
          <div className="story-ecosystem-grid">
            {ecosystem.map(item=><article className="story-ecosystem-card" key={item.title}>
              <p className="eyebrow">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div><a href={item.href} target="_blank" rel="noopener noreferrer">Explore project <ArrowUpRight size={14}/></a>
                <a href={item.repo} target="_blank" rel="noopener noreferrer">Source code <ArrowUpRight size={14}/></a></div>
            </article>)}
          </div>
          <p className="story-muted">These are separate repositories and services. Cross-project links and hosting relationships do not imply that all systems share a database or that every connector is enabled in production.</p>
        </section>
        <section className="section story-evidence" id="proof">
          <div className="section-head"><div><div className="eyebrow">06 — EVIDENCE OVER HYPE</div>
            <h2>The engineering claims have boundaries.</h2>
          </div></div>
          <div className="story-proof-grid">
            <article><ShieldCheck size={22}/><h3>Tenant-aware permissions</h3><p>Saved BOM revisions, membership checks and audited research operations are scoped to each workspace.</p></article>
            <article><Database size={22}/><h3>Reproducible evaluation</h3><p>Tests and labelled fictional fixtures exercise optimisation, source citation integrity and safe failure modes.</p></article>
            <article><FileCheck2 size={22}/><h3>Human-in-the-loop intelligence</h3><p>Heuristic risk scores, datasheet comparisons and proposed agent actions require qualified human verification.</p></article>
            <article><GitBranch size={22}/><h3>Release discipline</h3><p>Source control, automated checks, immutable images and rollback procedures are part of the engineering story.</p></article>
          </div>
          <p className="story-muted">Nexus is a functional engineering showcase, not a claim of supplier endorsement, independently validated ML forecasting, proven component equivalence or production purchasing volumes.</p>
          <Link href="/case-study" className="textlink">Inspect the full case study <ArrowUpRight size={14} style={{display:"inline"}} /></Link>
        </section>
        <section className="section story-contact" id="contact">
          <FlowMeetContact bookingHref={book} enabled={capture}/>
        </section>
        <section className="section story-close">
          <div>
            <div className="eyebrow">ENGINEERING IS MORE THAN THE TECH STACK</div>
            <h2>Understand the problem. Build the system. Show the evidence.</h2>
            <p>Nexus is one example of how I approach software and platform engineering: starting with a problem I encountered, designing across disciplines and being explicit about what the system can verify.</p>
          </div>
          <a href="https://yusufsaka.dev" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">View my engineering portfolio <ArrowUpRight size={17}/></a>
        </section>
      </div>
    </main>
  );
}
