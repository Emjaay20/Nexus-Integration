"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Cpu,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Search,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
  Database,
  Plus,
} from "lucide-react";

export default function PlatformCoreStudio() {
  const [activeTab, setActiveTab] = useState<
    "authz" | "polyglot" | "ml" | "agent" | "metrics"
  >("authz");
  const [backendStatus, setBackendStatus] = useState<{
    status: string;
    version: string;
    active_policies: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Authz State
  const [role, setRole] = useState("design_engineer");
  const [action, setAction] = useState("read");
  const [resourceType, setResourceType] = useState("bom");
  const [subjectTenant, setSubjectTenant] = useState("acme-oem");
  const [resourceTenant, setResourceTenant] = useState("acme-oem");
  const [sensitivity, setSensitivity] = useState("confidential");
  const [ndaSigned, setNdaSigned] = useState(true);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [policiesList, setPoliciesList] = useState<any>(null);

  // Polyglot Go Ingest + Rust ML Enrichment State
  const [batchMpns, setBatchMpns] = useState(
    "STM32F401RET6-TR, LM1117-3.3, RC0603FR-0710KL, GRM188R71H104KA93D, TPS62130RGTR, OPA2350UA"
  );
  const [targetBatchQty, setTargetBatchQty] = useState(1000);
  const [enrichResult, setEnrichResult] = useState<any>(null);

  // ML Vector Search & Risk State
  const [vectorQuery, setVectorQuery] = useState(
    "STM32F401RET6 ARM Cortex-M4 LQFP-64 3.3V MCU"
  );
  const [vectorMatches, setVectorMatches] = useState<any>(null);
  const [queryMpn, setQueryMpn] = useState("STM32F401RET6");
  const [alternateResults, setAlternateResults] = useState<any>(null);
  const [riskReport, setRiskReport] = useState<any>(null);

  // Agent State
  const [sqlQuery, setSqlQuery] = useState(
    "SELECT * FROM bom_items WHERE quantity > 50"
  );
  const [sqlProfileResult, setSqlProfileResult] = useState<any>(null);

  // Metrics State
  const [metricsText, setMetricsText] = useState<string>("");

  useEffect(() => {
    checkHealth();
    fetchPolicies();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch("/api/platform-core/health");
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/platform-core/api/v1/authz/policies");
      if (res.ok) {
        const data = await res.json();
        setPoliciesList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const payload = {
        subject: {
          user_id: "usr-live-tester",
          tenant_id: subjectTenant,
          role: role,
          clearance: sensitivity,
          attributes: {},
        },
        action: action,
        resource: {
          resource_id: "res-pcba-99",
          resource_type: resourceType,
          tenant_id: resourceTenant,
          sensitivity: sensitivity,
          attributes: {},
        },
        context: {
          current_time: new Date().toISOString(),
          nda_signed: ndaSigned,
          ip_address: "127.0.0.1",
        },
      };

      const res = await fetch("/api/platform-core/api/v1/authz/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setEvalResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePolyglotEnrich = async () => {
    setLoading(true);
    try {
      const mpns = batchMpns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/platform-core/api/v1/bom/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mpns,
          target_batch_size: targetBatchQty,
        }),
      });
      const data = await res.json();
      setEnrichResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSemanticSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform-core/api/v1/ml/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: vectorQuery,
          top_k: 4,
        }),
      });
      const data = await res.json();
      setVectorMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchAlternate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform-core/api/v1/ai/match-alternate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_mpn: queryMpn,
          manufacturer: "Unknown",
          description: "Electronic Component",
          max_results: 3,
        }),
      });
      const data = await res.json();
      setAlternateResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunRiskAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform-core/api/v1/ai/sourcing-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: "Automotive Gateway ECU",
          target_batch_size: 5000,
          components: [
            {
              mpn: queryMpn,
              manufacturer: "STMicroelectronics",
              description: "32-bit MCU 512KB Flash",
              lead_time_weeks: 26,
              lifecycle_status: "Active",
              is_single_source: true,
              unit_price_usd: 4.8,
            },
            {
              mpn: "LM1117-3.3",
              manufacturer: "TI",
              description: "3.3V LDO Regulator",
              lead_time_weeks: 6,
              lifecycle_status: "Active",
              is_single_source: false,
              unit_price_usd: 0.45,
            },
            {
              mpn: "OPA2350-OBS",
              manufacturer: "Legacy Semi",
              description: "High Speed OpAmp",
              lead_time_weeks: 4,
              lifecycle_status: "Obsolete",
              is_single_source: true,
              unit_price_usd: 1.2,
            },
          ],
        }),
      });
      const data = await res.json();
      setRiskReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSql = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform-core/api/v1/agent/profile-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql_query: sqlQuery }),
      });
      const data = await res.json();
      setSqlProfileResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform-core/metrics");
      const text = await res.text();
      setMetricsText(text);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                POLYGLOT PLATFORM CORE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Rust (actix-web) + Go (Worker Pool) + In-Process ML
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-2">
              Platform Core Engineering Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Sub-microsecond ABAC policy engine, Go multi-distributor BOM enrichment, 32-D vector search, and SQL/Agent guardrails.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  backendStatus ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>
                Rust Core: {backendStatus ? "ONLINE" : "CONNECTING"}
              </span>
              {backendStatus && (
                <span className="text-slate-500">
                  | v{backendStatus.version} ({backendStatus.active_policies} rules)
                </span>
              )}
            </div>
            <button
              onClick={checkHealth}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Refresh Health"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("authz")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === "authz"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            ABAC Permission PDP
          </button>
          <button
            onClick={() => {
              setActiveTab("polyglot");
              if (!enrichResult) handlePolyglotEnrich();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === "polyglot"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            Go Distributor Fan-Out + ML Risk
          </button>
          <button
            onClick={() => {
              setActiveTab("ml");
              if (!vectorMatches) handleSemanticSearch();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === "ml"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            32-D Vector Search &amp; AI Copilot
          </button>
          <button
            onClick={() => setActiveTab("agent")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === "agent"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Developer Agent Bridge (DX)
          </button>
          <button
            onClick={() => {
              setActiveTab("metrics");
              handleFetchMetrics();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === "metrics"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            Prometheus Telemetry
          </button>
        </div>

        {/* TAB 1: ABAC PERMISSIONS ENGINE */}
        {activeTab === "authz" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    Policy Request Simulator
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Lock-free ArcSwap PDP
                  </span>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Subject Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="design_engineer">OEM Design Engineer</option>
                      <option value="ems_procurement">
                        EMS Procurement Specialist
                      </option>
                      <option value="platform_admin">Platform Admin</option>
                      <option value="auditor">External Compliance Auditor</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Action
                      </label>
                      <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                        <option value="export_pricing">Export Pricing</option>
                        <option value="approve_quotation">Approve Quotation</option>
                        <option value="source_alternates">Source Alternates</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Resource Type
                      </label>
                      <select
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="bom">Bill of Materials (BOM)</option>
                        <option value="quotation">Supplier Quotation</option>
                        <option value="pricing">Restricted Pricing Model</option>
                        <option value="component">Component Metadata</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Subject Tenant ID
                      </label>
                      <input
                        type="text"
                        value={subjectTenant}
                        onChange={(e) => setSubjectTenant(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Resource Tenant ID
                      </label>
                      <input
                        type="text"
                        value={resourceTenant}
                        onChange={(e) => setResourceTenant(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={ndaSigned}
                        onChange={(e) => setNdaSigned(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                      />
                      Signed Non-Disclosure Agreement (NDA)
                    </label>

                    <select
                      value={sensitivity}
                      onChange={(e) => setSensitivity(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300"
                    >
                      <option value="public">Public</option>
                      <option value="internal">Internal</option>
                      <option value="confidential">Confidential</option>
                      <option value="restricted_price">Restricted Pricing</option>
                    </select>
                  </div>

                  <button
                    onClick={handleEvaluate}
                    disabled={loading}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg transition shadow-lg shadow-blue-600/30"
                  >
                    <Play className="w-4 h-4" />
                    Evaluate Policy in Rust PDP
                  </button>
                </div>
              </div>

              {/* Evaluation Outcome Display */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-semibold text-white">
                      Live Decision Result
                    </h3>
                    {evalResult && (
                      <span className="text-xs font-mono text-emerald-400">
                        Evaluated in: {(evalResult.latency_nanos / 1000).toFixed(2)} µs
                      </span>
                    )}
                  </div>

                  {evalResult ? (
                    <div className="mt-6 space-y-4">
                      <div
                        className={`p-4 rounded-xl border flex items-center gap-4 ${
                          evalResult.decision === "allow"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        }`}
                      >
                        {evalResult.decision === "allow" ? (
                          <CheckCircle2 className="w-8 h-8 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-8 h-8 flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-lg font-bold tracking-wide uppercase">
                            DECISION: {evalResult.decision}
                          </div>
                          <div className="text-xs opacity-90 mt-0.5">
                            {evalResult.reason}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
                        <div className="text-slate-500">
                          // Audit Trail &amp; Policy Trace
                        </div>
                        <div>
                          Matched Rule ID:{" "}
                          <span className="text-blue-400">
                            {evalResult.matched_rule_id || "None (Default Deny)"}
                          </span>
                        </div>
                        <div>
                          Latency:{" "}
                          <span className="text-amber-400">
                            {evalResult.latency_nanos} ns
                          </span>
                        </div>
                        <div>
                          Zero-Trust Boundary:{" "}
                          <span
                            className={
                              subjectTenant === resourceTenant
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {subjectTenant === resourceTenant
                              ? "Tenant Isolated"
                              : "Cross-Tenant Detected"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-12 text-center text-slate-500 text-sm">
                      Click &ldquo;Evaluate Policy in Rust PDP&rdquo; to test
                      authorization rules in real time.
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 border-t border-slate-800 pt-3 mt-6 flex justify-between">
                  <span>Compiled policy snapshot in RAM</span>
                  <span>Hot reload via ArcSwap</span>
                </div>
              </div>
            </div>

            {/* Active Policy Set Inspector */}
            {policiesList && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Active In-Memory Policy Set (v{policiesList.version})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Loaded directly from Rust <code className="text-blue-300">GET /api/v1/authz/policies</code>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {policiesList.rules?.map((r: any) => (
                    <div
                      key={r.id}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">
                          {r.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase ${
                            r.effect === "allow"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {r.effect}
                        </span>
                      </div>
                      <p className="text-slate-400">{r.description}</p>
                      <div className="text-[11px] font-mono text-slate-500 pt-1">
                        Roles: {r.allowed_roles.join(", ")} | Same-Tenant:{" "}
                        {String(r.require_same_tenant)} | NDA:{" "}
                        {String(r.require_nda)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POLYGLOT GO INGESTION + RUST ML RISK */}
        {activeTab === "polyglot" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-mono text-blue-400 uppercase">
                    Rust Core → Go Bounded Worker Pool → Rust GBDT ML Scorer
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Concurrent Multi-Distributor BOM Enrichment &amp; Stock-Out Prediction
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fans out MPNs across the Go ingestion service (<code className="text-slate-300">services/ingest</code>) and scores each part with the in-process Rust GBDT model.
                  </p>
                </div>
                <button
                  onClick={handlePolyglotEnrich}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run Polyglot Batch Enrichment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Comma-Separated Manufacturer Part Numbers (MPNs)
                  </label>
                  <input
                    type="text"
                    value={batchMpns}
                    onChange={(e) => setBatchMpns(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Target Batch Size (PCBA Units)
                  </label>
                  <input
                    type="number"
                    value={targetBatchQty}
                    onChange={(e) => setTargetBatchQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {enrichResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5">
                    <span className="text-emerald-400">
                      Engine: {enrichResult.engine}
                    </span>
                    <span className="text-slate-400">
                      Parts Enriched: {enrichResult.total_parts_queried} | Batch Qty:{" "}
                      {enrichResult.target_batch_size}
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                          <th className="py-3 px-4">Normalized MPN</th>
                          <th className="py-3 px-4">Manufacturer &amp; Package</th>
                          <th className="py-3 px-4">Total Stock</th>
                          <th className="py-3 px-4">Best Unit Price</th>
                          <th className="py-3 px-4">Lead Time</th>
                          <th className="py-3 px-4">Rust ML Stock-Out Risk</th>
                          <th className="py-3 px-4">Top Risk Feature Attribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {enrichResult.results?.map((r: any, idx: number) => {
                          const ml = r.ml_risk_prediction;
                          const topAttr = ml?.top_attributions?.[0];
                          return (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="py-3 px-4 font-bold text-white">
                                {r.normalized_mpn}
                                <div className="text-[10px] text-slate-500 font-normal">
                                  {r.lifecycle_status}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                {r.manufacturer}
                                <div className="text-[10px] text-slate-500">
                                  {r.package} ({r.distributor_count} dist.)
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-200">
                                {Number(r.total_stock || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-emerald-400 font-semibold">
                                ${r.best_unit_price_at_qty} ({r.best_distributor})
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                {r.min_lead_time_weeks}–{r.max_lead_time_weeks} wks
                              </td>
                              <td className="py-3 px-4">
                                {ml && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      ml.risk_tier === "Critical" ||
                                      ml.risk_tier === "Elevated"
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                        : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    }`}
                                  >
                                    {(ml.stockout_probability * 100).toFixed(1)}% (
                                    {ml.risk_tier})
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-[11px] text-slate-400">
                                {topAttr
                                  ? `${topAttr.feature}: ${topAttr.raw_value} (${
                                      topAttr.weight_contribution >= 0 ? "+" : ""
                                    }${topAttr.weight_contribution})`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 32-D VECTOR SEARCH & AI SOURCING */}
        {activeTab === "ml" && (
          <div className="space-y-6">
            {/* 32-D Semantic Vector Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-mono text-indigo-400 uppercase">
                    In-Process Rust 32-D Parametric + Trigram Embeddings
                  </span>
                  <h3 className="font-semibold text-white text-lg">
                    Semantic Component Vector Search (Cosine Similarity)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Finds drop-in pin-compatible replacements by projecting electrical parameters and footprints into a 32-dimensional L2-normalized vector space.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={vectorQuery}
                    onChange={(e) => setVectorQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono w-full md:w-80"
                  />
                  <button
                    onClick={handleSemanticSearch}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0"
                  >
                    Search Vectors
                  </button>
                </div>
              </div>

              {vectorMatches && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vectorMatches.matches?.map((m: any, i: number) => (
                    <div
                      key={i}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-white">
                          {m.entry.mpn}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Cosine Sim: {(m.cosine_similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {m.entry.manufacturer} • Package:{" "}
                        <span className="text-slate-200">{m.entry.package}</span> •{" "}
                        <span className="text-emerald-400">
                          ${m.entry.unit_price_usd}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{m.entry.description}</p>
                      <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-900 flex justify-between">
                        <span>Stock: {m.entry.stock_qty.toLocaleString()}</span>
                        <span>Lead: {m.entry.lead_time_weeks} wks</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing AI Copilot Risk & Alternates */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    LLM &amp; Heuristic PCBA Risk Synthesis
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Combines deterministic risk scoring with Gemini 2.5 Flash synthesis when GEMINI_API_KEY is set.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={queryMpn}
                    onChange={(e) => setQueryMpn(e.target.value)}
                    placeholder="Enter MPN (e.g. STM32F401RET6)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <button
                    onClick={handleMatchAlternate}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Alternates
                  </button>
                  <button
                    onClick={handleRunRiskAnalysis}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Analyze PCBA Risk
                  </button>
                </div>
              </div>

              {alternateResults && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alternateResults.alternates.map((alt: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-white">
                          {alt.alternate_mpn}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {alt.cost_delta_pct > 0
                            ? `+${alt.cost_delta_pct}%`
                            : `${alt.cost_delta_pct}%`}{" "}
                          Cost
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{alt.rationale}</p>
                    </div>
                  ))}
                </div>
              )}

              {riskReport && (
                <div className="mt-6 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-blue-400">
                        {riskReport.analyzed_by}
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {riskReport.project_name} Risk Evaluation
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">
                        Overall Risk Score
                      </div>
                      <div className="text-lg font-bold text-amber-400">
                        {riskReport.overall_risk_score} / 100 (
                        {riskReport.risk_level})
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {riskReport.strategic_recommendations.map(
                      (rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DEVELOPER AGENT BRIDGE (DX) */}
        {activeTab === "agent" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  SQL Multi-Tenant Query Profiler &amp; Linter
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Agent Guardrail
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI coding agents and developers call this endpoint to catch missing{" "}
                <code className="text-slate-200">tenant_id</code> predicates,{" "}
                <code className="text-slate-200">SELECT *</code> projections, and
                unbounded table scans before merge.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  SQL Query to Profile
                </label>
                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleProfileSql}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg transition"
              >
                <Play className="w-4 h-4" />
                Profile Query with Rust Agent Bridge
              </button>
            </div>

            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="font-semibold text-white">
                  Diagnostics &amp; Anti-Pattern Analysis
                </h3>
              </div>

              {sqlProfileResult ? (
                <div className="space-y-4">
                  <div
                    className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2.5 ${
                      sqlProfileResult.is_production_ready
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {sqlProfileResult.is_production_ready ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                    <span>
                      {sqlProfileResult.is_production_ready
                        ? "PRODUCTION READY: No Anti-Patterns Detected"
                        : "BLOCKED: Architectural Anti-Patterns Detected"}
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {sqlProfileResult.detected_anti_patterns.map(
                      (item: string, i: number) => (
                        <li
                          key={i}
                          className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-lg"
                        >
                          {item}
                        </li>
                      )
                    )}
                  </ul>

                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {sqlProfileResult.optimization_suggestions.map(
                      (item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-sm mt-12">
                  Submit a SQL query to profile against platform standards.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROMETHEUS METRICS */}
        {activeTab === "metrics" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Live Prometheus Metrics Stream (/metrics)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Raw telemetry scraped from the Rust Actix-web server.
                </p>
              </div>
              <button
                onClick={handleFetchMetrics}
                disabled={loading}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Refresh Stream
              </button>
            </div>

            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[500px]">
              {metricsText || "// Scraping live Prometheus metrics..."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
