import Link from 'next/link';
import {
  BookOpen,
  Cpu,
  Shield,
  Terminal,
  Layers,
  Scale,
  Sparkles,
  GitBranch,
  Database,
  Activity,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const adrs = [
  {
    id: 'ADR-001',
    title: 'Rust (actix-web) Monolith as the Authoritative Domain & Policy Core',
    status: 'Accepted',
    context:
      'Electronics supply chain workflows combine strict multi-tenant authorization (OEMs, EMS contract manufacturers, and component brokers sharing partial BOM views under NDAs), CPU-bound BOM parsing (50,000+ line spreadsheets), and deterministic pricing/risk calculations.',
    decision:
      'Keep domain modeling, ABAC policy evaluation, BOM normalization, and ML risk inference inside a single modular Rust workspace (crates/platform-core) using actix-web 4.9 and ArcSwap.',
    tradeoffs: [
      'Pro: Zero network serialization hops between authorization checks, BOM line parsing, and ML stock-out scoring.',
      'Pro: Compile-time memory safety and fearless concurrency; policy snapshots hot-reload atomically via ArcSwap in < 2 microseconds without RwLock reader contention.',
      'Trade-off: Longer cold compile times in CI (~3–5 min without caching), mitigated via cargo-chef Docker layers and Swatinem/rust-cache.',
    ],
  },
  {
    id: 'ADR-002',
    title: 'Polyglot Boundary: Why Go Owns External Distributor Fan-Out (services/ingest)',
    status: 'Accepted',
    context:
      'Enriching a 400-line BOM requires fanning out concurrent HTTP/OAuth2 requests across DigiKey Product Information v4, Mouser Search API v1, and Nexar/Octopart GraphQL. Each upstream vendor enforces distinct rate limits, retry semantics, and burst quotas.',
    decision:
      'Isolate external distributor I/O into a dedicated Go ingestion service (services/ingest) using a bounded worker pool, while keeping Rust as the authoritative domain core.',
    tradeoffs: [
      'Pro: Fault isolation — upstream distributor timeouts or rate-limit backpressure never starve actix-web worker threads serving interactive UI and ABAC requests.',
      'Pro: Go goroutines, context cancellation, and standard-library net/http make high-concurrency fan-out and per-vendor rate limiters concise and easy to audit.',
      'Counter-argument considered: A Tokio task pool inside the Rust monolith works well too; we separated Go specifically to draw a clean process boundary between untrusted third-party API latency and core domain state.',
    ],
  },
  {
    id: 'ADR-003',
    title: 'In-Process Rust ML Inference & 32-D Parametric Vector Search (No Python in Request Path)',
    status: 'Accepted',
    context:
      'Procurement teams need quantitative stock-out probabilities and pin-compatible drop-in alternate recommendations during interactive BOM quoting, where a 300ms Python microservice round-trip or GIL contention degrades UX.',
    decision:
      'Execute calibrated gradient-boosted log-odds inference (MlRiskEngine) and 32-dimensional L2-normalized parametric + trigram cosine similarity search directly in Rust (crates/platform-core/src/ml_engine), reserving LLMs (Gemini 2.5 Flash) strictly for unstructured synthesis with deterministic fallback.',
    tradeoffs: [
      'Pro: Sub-millisecond inference with explicit per-feature attribution (lead-time hinge, stock-to-demand ratio, distributor diversity, lifecycle stage).',
      'Pro: Deterministic behavior in CI and offline environments — every AI/ML feature has a verified non-LLM baseline so a third-party LLM outage never breaks quoting.',
      'Trade-off: Model weights and feature projections must be versioned alongside Rust code or loaded from serialized artifacts.',
    ],
  },
  {
    id: 'ADR-004',
    title: 'Developer Experience (DX) & Agent Guardrails via Rust Agent Bridge',
    status: 'Accepted',
    context:
      'As engineers rely more heavily on AI coding agents (Cursor, Claude, internal bots), the highest-severity risk in a multi-tenant B2B platform is an agent generating a SQL query without a tenant_id predicate or authoring a wildcard ABAC rule.',
    decision:
      'Expose first-class verification endpoints (/api/v1/agent/validate-rule and /api/v1/agent/profile-query) and a companion Rust CLI (platform-cli) so both humans and coding agents validate rules and SQL queries before merge.',
    tradeoffs: [
      'Pro: Turns platform engineering standards into executable checks callable from CI, CLI, or MCP agent tools.',
      'Pro: Catches missing WHERE tenant_id predicates, unbounded SELECT *, and missing NDA constraints automatically.',
    ],
  },
];

export default function ArchitectureDocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Hero */}
      <section className="border-b border-slate-800 bg-slate-900/60 py-14 px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PLATFORM ENGINEERING HANDBOOK
            </span>
            <span className="text-xs font-mono text-slate-400">
              Architecture Decision Records (ADRs) • Polyglot Trade-Offs • Agent DX
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            System Architecture, Technical Trade-Offs &amp; ADRs
          </h1>
          <p className="text-slate-300 max-w-3xl text-sm sm:text-base leading-relaxed">
            A transparent look at how Nexus is architected: why the core monolith is written in Rust (<code className="text-indigo-300">actix-web</code>), where Go (<code className="text-blue-300">services/ingest</code>) earns its place, how multi-tenant ABAC and ML inference run in-process, and how the platform empowers engineers and AI agents.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/platform-core"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              <Cpu className="w-4 h-4" />
              Test Live in Platform Core Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/api-reference"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              API Reference
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-14">
        {/* Data Flow Topology */}
        <section className="space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              1. End-to-End Request &amp; Data Flow
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="font-mono text-blue-400 font-bold">01. NEXT.JS 16 BFF &amp; AUTH</div>
              <div className="font-semibold text-white">Tenant Session &amp; Proxy</div>
              <p className="text-slate-400 leading-relaxed">
                Authenticates users via PostgreSQL credentials, Magic Link, or GitHub OAuth. Proxies requests through <code className="text-slate-200">/api/platform-core/*</code> to the Rust monolith.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="font-mono text-indigo-400 font-bold">02. RUST ACTIX-WEB CORE</div>
              <div className="font-semibold text-white">ABAC PDP + BOM Engine</div>
              <p className="text-slate-400 leading-relaxed">
                Evaluates zero-trust tenant &amp; NDA rules via lock-free <code className="text-slate-200">ArcSwap</code> snapshots, normalizes raw MPN suffixes, and coordinates distributor enrichment.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="font-mono text-cyan-400 font-bold">03. GO INGEST SERVICE</div>
              <div className="font-semibold text-white">Bounded Worker Fan-Out</div>
              <p className="text-slate-400 leading-relaxed">
                Spawns a bounded goroutine pool to query DigiKey v4, Mouser v1, and the verified catalog concurrently, solving best price-break tiers at target batch qty.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="font-mono text-emerald-400 font-bold">04. RUST ML &amp; VECTOR ENGINE</div>
              <div className="font-semibold text-white">Risk &amp; Second-Source Ranker</div>
              <p className="text-slate-400 leading-relaxed">
                Computes calibrated GBDT stock-out probability with feature attributions and ranks pin-compatible replacements via 32-D cosine similarity.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Decision Records */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              2. Architecture Decision Records (ADRs) &amp; Explicit Trade-Offs
            </h2>
          </div>

          <div className="space-y-5">
            {adrs.map((adr) => (
              <div
                key={adr.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {adr.id}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">{adr.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded">
                    {adr.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-1.5">
                    <div className="font-mono uppercase text-slate-400 font-semibold">Context &amp; Problem</div>
                    <p className="text-slate-300 leading-relaxed">{adr.context}</p>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-1.5">
                    <div className="font-mono uppercase text-blue-400 font-semibold">Architectural Decision</div>
                    <p className="text-slate-300 leading-relaxed">{adr.decision}</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-mono uppercase text-slate-400 font-semibold">
                    Consequences &amp; Engineering Trade-Offs
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {adr.tradeoffs.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CLI & Agent Tooling Reference */}
        <section className="space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              3. Developer Experience (DX) &amp; Rust CLI Usage
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              The workspace ships with <code className="text-indigo-300">crates/platform-cli</code> so engineers and AI coding agents can evaluate ABAC policies, lint SQL queries for multi-tenant isolation, and parse BOMs directly from the terminal or CI pipelines:
            </p>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
{`# 1. Verify platform health & active policy version
cargo run --bin platform-cli -- health

# 2. Simulate an ABAC policy decision across tenant boundaries
cargo run --bin platform-cli -- test-perm \\
  --role design_engineer --action read --resource-type bom \\
  --subject-tenant acme-oem --resource-tenant globex-oem

# 3. Lint a SQL query for multi-tenancy leaks & unbounded result sets
cargo run --bin platform-cli -- profile-sql \\
  --query "SELECT * FROM bom_items WHERE quantity > 10"

# 4. Stream-parse a PCBA BOM CSV and normalize MPN packaging suffixes
cargo run --bin platform-cli -- parse-bom --file sample.csv`}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
