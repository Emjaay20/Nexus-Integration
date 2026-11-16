"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Shield,
  Plus,
} from "lucide-react";
import { PartsTable, type Part } from "@/components/platform/Enrichment";

type Context = {
  actor: { user_id: string; workspace_id: string; role: string };
  workspaces: { id: string; name: string; role: string }[];
};
type Item = {
  partNumber: string;
  quantity: number;
  description: string;
  manufacturer: string;
};
type BomSummary = {
  id: string;
  name: string;
  revision: number;
  item_count: number;
  updated_at: string;
};
type Bom = {
  id: string;
  name: string;
  revision: number;
  items: Item[];
  updated_at: string;
};
type JobSummaryStats = {
  total_extended_cost_usd?: number | null;
  priced_parts?: number;
  unpriced_parts?: number;
  reference_count?: number;
  unknown_lead_time_parts?: number;
  attention_count?: number;
  single_source_count?: number;
  max_lead_time_weeks?: number | null;
  live_count?: number;
  total_parts?: number;
};
type Job = {
  id: string;
  bom_id: string;
  bom_revision: number;
  state: string;
  attempt: number;
  max_attempts: number;
  progress: number;
  total: number;
  error: string | null;
  request_id: string;
  has_result?: boolean;
  result: { results: Part[]; summary?: JobSummaryStats } | null;
};

type Member = { user_id: string; role: string };
type Audit = {
  id: string;
  actor_id: string;
  action: string;
  decision: string;
  reason: string;
  created_at: string;
  request_id: string;
};
const sample =
  "MPN,Quantity,Manufacturer,Description\nSTM32F401RET6,10,STMicroelectronics,Controller\nLM1117-3.3,40,Texas Instruments,Regulator";
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const r = await fetch(`/api/workspace/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const result = await r.json();
  if (!r.ok)
    throw new Error(
      `${result.error || "Operation failed"}${r.headers.get("x-request-id") ? ` · Reference ${r.headers.get("x-request-id")}` : ""}`,
    );
  return result;
}
function csv(items: Item[]) {
  return [
    "MPN,Quantity,Manufacturer,Description",
    ...items.map((i) =>
      [i.partNumber, i.quantity, i.manufacturer, i.description]
        .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
        .join(","),
    ),
  ].join("\n");
}
export default function Workspace() {
  const [context, setContext] = useState<Context | null>(null);
  const [boms, setBoms] = useState<BomSummary[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [tab, setTab] = useState("boms");
  const [selected, setSelected] = useState<Bom | null>(null);
  const [name, setName] = useState("Controller board");
  const [raw, setRaw] = useState(sample);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState("");
  const [memberRole, setMemberRole] = useState("viewer");
  const [resultJob, setResultJob] = useState<Job | null>(null);
  const requestKey = useRef<{
    bom: string;
    revision: number;
    key: string;
  } | null>(null);
  const refresh = useCallback(async () => {
    const c = await api<Context>("context");
    setContext(c);
    const [bs, js] = await Promise.all([
      api<BomSummary[]>("boms"),
      api<Job[]>("jobs"),
    ]);
    setBoms(bs);
    setJobs(js);
    if (c.actor.role === "owner") {
      const [ms, as] = await Promise.all([
        api<Member[]>("members"),
        api<Audit[]>("audit"),
      ]);
      setMembers(ms);
      setAudit(as);
    } else {
      setMembers([]);
      setAudit([]);
    }
  }, []);
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refresh]);
  const hasActiveJobs = jobs.some((j) =>
    ["queued", "running", "retry_wait"].includes(j.state),
  );
  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      api<Job[]>("jobs")
        .then(setJobs)
        .catch((e) => setError(e.message));
    }, 2000);
    return () => clearInterval(interval);
  }, [hasActiveJobs]);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  const canWrite = !!context && context.actor.role !== "viewer";
  const owner = context?.actor.role === "owner";
  async function edit(summary: BomSummary) {
    await act(async () => {
      const bom = await api<Bom>(`boms/${summary.id}`);
      setSelected(bom);
      setName(bom.name);
      setRaw(csv(bom.items));
      setTab("boms");
    });
  }
  async function enrich(bom: BomSummary) {
    await act(async () => {
      if (
        requestKey.current?.bom !== bom.id ||
        requestKey.current?.revision !== bom.revision
      )
        requestKey.current = {
          bom: bom.id,
          revision: bom.revision,
          key: crypto.randomUUID(),
        };
      await api(
        "jobs",
        "POST",
        { bom_id: bom.id, revision: bom.revision },
        requestKey.current.key,
      );
      requestKey.current = null;
      await refresh();
      setTab("jobs");
      setNotice("Job queued. Progress is saved between worker restarts.");
    });
  }
  return (
    <main id="main-content" className="wrap">
      <header className="pagehead">
        <div className="eyebrow">WORKSPACE / BOM LIBRARY</div>
        <h1>Your BOMs. Your workspace.</h1>
        <p>
          Save and revise parts lists, run background sourcing jobs, and control
          who can make changes.
        </p>
      </header>
      <div className="workspace-toolbar">
        <div>
          {context && (
            <>
              <label className="field">
                Active workspace
                <select
                  aria-label="Active workspace"
                  value={context.actor.workspace_id}
                  disabled={busy}
                  onChange={(e) =>
                    act(async () => {
                      await api("context", "POST", {
                        workspace_id: e.target.value,
                      });
                      setSelected(null);
                      setResultJob(null);
                      setTab("boms");
                      await refresh();
                    })
                  }
                >
                  {context.workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} · {w.role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <p className="sub">
                Your user ID:{" "}
                <code style={{ overflowWrap: "anywhere" }}>
                  {context.actor.user_id}
                </code>
              </p>
            </>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => act(refresh)}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <nav className="workspace-nav" aria-label="BOM workspace">
        {[
          ["boms", "BOM library"],
          ["jobs", "Background jobs"],
          ...(owner
            ? [
                ["members", "Permissions"],
                ["audit", "Audit trail"],
              ]
            : []),
        ].map(([value, label]) => (
          <button
            className={`workspace-tab ${tab === value ? "active" : ""}`}
            aria-pressed={tab === value}
            key={value}
            onClick={() => {
              setTab(value);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="note error result-section" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="note result-section" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <div className="empty-state">
          <Loader2
            size={18}
            className="animate-spin"
            style={{ display: "inline" }}
          />{" "}
          Loading workspace…
        </div>
      ) : !context ? (
        <div className="empty-state">
          Workspace unavailable. Try refreshing, or{" "}
          <Link href="/login">sign in again</Link>.
        </div>
      ) : (
        <div className="workspace-main">
          {tab === "boms" && (
            <div className="bom-library-layout">
              <section>
                <div className="section-head">
                  <h2 style={{ fontSize: 23 }}>
                    Saved BOMs{" "}
                    <span className="sub" style={{ fontWeight: 400 }}>
                      Latest 50
                    </span>
                  </h2>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelected(null);
                      setName("Untitled BOM");
                      setRaw("MPN,Quantity,Manufacturer,Description\n");
                    }}
                    disabled={!canWrite}
                  >
                    <Plus size={14} /> New BOM
                  </button>
                </div>
                {boms.length ? (
                  boms.map((bom) => (
                    <article className="saved-bom" key={bom.id}>
                      <div>
                        <strong>{bom.name}</strong>
                        <span className="sub">
                          {bom.item_count} rows · Revision {bom.revision}
                        </span>
                        <span className="sub">
                          Updated {new Date(bom.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="form-actions" style={{ marginTop: 12 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => edit(bom)}
                        >
                          {canWrite ? "Open / edit" : "View BOM"}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!canWrite || busy}
                          onClick={() => enrich(bom)}
                        >
                          Enrich <ArrowRight size={13} />
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <FileSpreadsheet size={22} style={{ display: "inline" }} />
                    <p style={{ marginTop: 8 }}>
                      No BOMs yet. Save your first parts list.
                    </p>
                  </div>
                )}
              </section>
              <section className="workspace-editor">
                <div className="eyebrow">
                  {selected ? `REVISION ${selected.revision}` : "NEW BOM"}
                </div>
                <h2 style={{ fontSize: 23 }}>
                  {selected ? "Review and update" : "Start with a parts list"}
                </h2>
                <p className="sub" style={{ margin: "10px 0 22px" }}>
                  CSV columns may appear in any order. Every row needs an MPN
                  and a positive whole-number quantity.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      const saved = await api<Bom>(
                        selected ? `boms/${selected.id}` : "boms",
                        selected ? "PUT" : "POST",
                        {
                          name,
                          raw_content: raw,
                          ...(selected ? { revision: selected.revision } : {}),
                        },
                      );
                      setSelected(saved);
                      await refresh();
                      setNotice(
                        `Saved ${saved.items.length} rows as revision ${saved.revision}.`,
                      );
                    });
                  }}
                >
                  <label className="field">
                    BOM name
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={name}
                      readOnly={!canWrite}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="field" style={{ marginTop: 16 }}>
                    Parts list (CSV)
                    <textarea
                      rows={12}
                      required
                      spellCheck={false}
                      readOnly={!canWrite}
                      value={raw}
                      onChange={(e) => setRaw(e.target.value)}
                    />
                  </label>
                  <div className="form-actions">
                    {canWrite ? (
                      <button className="btn btn-primary" disabled={busy}>
                        {busy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ArrowRight size={14} />
                        )}{" "}
                        {selected ? "Save revision" : "Save BOM"}
                      </button>
                    ) : (
                      <span className="note">
                        Viewer access. A workspace owner can change your role.
                      </span>
                    )}
                    <Link href="/bom-importer" className="textlink">
                      Import CSV or Excel ↗
                    </Link>
                  </div>
                </form>
              </section>
            </div>
          )}
          {tab === "jobs" && (
            <section>
              <div className="section-head">
                <div>
                  <h2>Background sourcing jobs</h2>
                  <p>
                    Each job uses a saved BOM revision. Retries are bounded;
                    cancellation prevents late responses from overwriting the
                    job.
                  </p>
                </div>
              </div>
              {!jobs.length ? (
                <div className="empty-state">
                  Open a saved BOM and choose Enrich to queue your first job.
                </div>
              ) : (
                jobs.map((job) => (
                  <article className="job-row" key={job.id}>
                    <div>
                      <strong>
                        {boms.find((b) => b.id === job.bom_id)?.name || "BOM"} ·
                        revision {job.bom_revision}
                      </strong>
                      <span className="sub">
                        {job.progress}/{job.total} rows · Attempt {job.attempt}/
                        {job.max_attempts}
                      </span>
                      {job.error && (
                        <span className="sub" style={{ color: "var(--amber)" }}>
                          {job.error}
                        </span>
                      )}
                      <span
                        className="sub mono"
                        style={{ fontSize: 10, overflowWrap: "anywhere" }}
                      >
                        Request {job.request_id}
                      </span>
                    </div>
                    <div className="form-actions" style={{ marginTop: 0 }}>
                      <span className="status-dot">
                        <span
                          className={`dot ${job.state === "completed" ? "dot-green" : ["failed", "cancelled"].includes(job.state) ? "dot-grey" : "dot-amber"}`}
                        />
                        {job.state.replaceAll("_", " ")}
                      </span>
                      {job.has_result && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            act(async () => {
                              setResultJob(await api<Job>(`jobs/${job.id}`));
                            })
                          }
                        >
                          View results
                        </button>
                      )}
                      {canWrite &&
                        ["queued", "running", "retry_wait"].includes(
                          job.state,
                        ) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={busy}
                            onClick={() =>
                              act(async () => {
                                await api(`jobs/${job.id}/cancel`, "POST", {});
                                await refresh();
                              })
                            }
                          >
                            Cancel
                          </button>
                        )}
                    </div>
                  </article>
                ))
              )}
              {resultJob?.result && (
                <section className="result-section">
                  <h3>Results · saved revision {resultJob.bom_revision}</h3>
                  {resultJob.result.summary && (
                    <div className="metric-row" style={{ marginTop: 16 }}>
                      <div className="metric">
                        <b>
                          {resultJob.result.summary.total_extended_cost_usd == null ? "—" : new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 2,
                          }).format(
                            resultJob.result.summary.total_extended_cost_usd,
                          )}
                        </b>
                        <span>Cost of priced lines</span>
                      </div>
                      <div className="metric">
                        <b>{resultJob.result.summary.attention_count ?? 0}</b>
                        <span>Needs attention</span>
                      </div>
                      <div className="metric">
                        <b>
                          {resultJob.result.summary.single_source_count ?? 0}
                        </b>
                        <span>One-distributor parts</span>
                      </div>
                      <div className="metric">
                        <b>
                          {resultJob.result.summary.max_lead_time_weeks == null ? "Unknown" : `${resultJob.result.summary.max_lead_time_weeks} wks`}
                        </b>
                        <span>Max reported lead time</span>
                      </div>
                    </div>
                  )}
                  {resultJob.result.summary && (
                    <p className="note" style={{ marginTop: 16 }}>
                      Prices available for {resultJob.result.summary.priced_parts ?? "unknown"} of {resultJob.result.summary.total_parts} lines. Totals exclude unpriced lines.
                      {" "}{resultJob.result.summary.live_count ?? 0} live-response lines; {resultJob.result.summary.reference_count ?? 0} reference lines.
                      {" "}Unknown lead times: {resultJob.result.summary.unknown_lead_time_parts ?? "unknown"}. Needs attention includes unscored parts.
                    </p>
                  )}
                  <p className="note warning" style={{ marginTop: 16 }}>
                    Reference catalog results are illustrative. Only rows
                    labeled Live API represent supplier responses. Quantity on
                    each row determines its price break.
                  </p>
                  <PartsTable parts={resultJob.result.results} />
                </section>
              )}
            </section>
          )}
          {tab === "members" && owner && (
            <section>
              <div className="section-head">
                <div>
                  <h2>Workspace permissions</h2>
                  <p>
                    Engineers can save BOMs and run jobs. Viewers can read. Only
                    the owner can assign roles.
                  </p>
                </div>
              </div>
              <div className="note" style={{ marginBottom: 24 }}>
                <Shield size={14} style={{ display: "inline" }} /> Members must
                sign in once, then share the user ID shown at the top of their
                workspace. Adding someone does not change their active
                workspace; they select it themselves.
              </div>
              <form
                className="member-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    await api(`members/${memberId}`, "PUT", {
                      role: memberRole,
                    });
                    setMemberId("");
                    await refresh();
                    setNotice("Membership saved.");
                  });
                }}
              >
                <label className="field">
                  Registered user ID
                  <input
                    type="text"
                    required
                    pattern="[0-9a-fA-F-]{36}"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="User UUID"
                  />
                </label>
                <label className="field">
                  Role
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                  >
                    <option value="viewer">Viewer · read only</option>
                    <option value="design_engineer">
                      Engineer · read and write
                    </option>
                  </select>
                </label>
                <button className="btn btn-primary" disabled={busy}>
                  Add member
                </button>
              </form>
              {members.map((m) => (
                <div className="job-row" key={m.user_id}>
                  <code style={{ fontSize: 12, overflowWrap: "anywhere" }}>
                    {m.user_id}
                    {m.user_id === context.actor.user_id ? " (you)" : ""}
                  </code>
                  {m.role === "owner" ? (
                    <span className="tag">Owner</span>
                  ) : (
                    <select
                      aria-label={`Role for ${m.user_id}`}
                      style={{ width: "auto" }}
                      disabled={busy}
                      value={m.role}
                      onChange={(e) =>
                        act(async () => {
                          await api(`members/${m.user_id}`, "PUT", {
                            role: e.target.value,
                          });
                          await refresh();
                        })
                      }
                    >
                      <option value="viewer">Viewer</option>
                      <option value="design_engineer">Engineer</option>
                    </select>
                  )}
                </div>
              ))}
            </section>
          )}
          {tab === "audit" && owner && (
            <section>
              <div className="section-head">
                <div>
                  <h2>Access and change history</h2>
                  <p>
                    Workspace-scoped records of allowed operations, denied
                    access, revisions, and role changes. Latest 100 events.
                  </p>
                </div>
              </div>
              {audit.length ? (
                audit.map((event) => (
                  <div className="job-row" key={event.id}>
                    <div>
                      <strong>{event.action}</strong>
                      <span className="sub">{event.reason}</span>
                      <span className="sub">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                      <code
                        className="sub"
                        style={{ fontSize: 10, overflowWrap: "anywhere" }}
                      >
                        Actor {event.actor_id} · Request {event.request_id}
                      </code>
                    </div>
                    <span className="status-dot">
                      <span
                        className={`dot ${event.decision === "allow" ? "dot-green" : "dot-red"}`}
                      />
                      {event.decision}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No audit records yet.</div>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
