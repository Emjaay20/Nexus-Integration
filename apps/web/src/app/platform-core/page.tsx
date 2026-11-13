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
} from "lucide-react";

export default function PlatformCoreStudio() {
  const [activeTab, setActiveTab] = useState<"authz" | "ai" | "agent" | "metrics">("authz");
  const [backendStatus, setBackendStatus] = useState<{ status: string; version: string; active_policies: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Authz State
  const [role, setRole] = useState("design_engineer");
  const [action, setAction] = useState("read");
  const [resourceType, setResourceType] = useState("bom");
  const [subjectTenant, setSubjectTenant] = useState("bosch-oem");
  const [resourceTenant, setResourceTenant] = useState("bosch-oem");
  const [sensitivity, setSensitivity] = useState("confidential");
  const [ndaSigned, setNdaSigned] = useState(true);
  const [evalResult, setEvalResult] = useState<any>(null);

  // AI Sourcing State
  const [queryMpn, setQueryMpn] = useState("STM32F401RET6");
  const [alternateResults, setAlternateResults] = useState<any>(null);
  const [riskReport, setRiskReport] = useState<any>(null);

  // Agent State
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM bom_items WHERE quantity > 50");
  const [sqlProfileResult, setSqlProfileResult] = useState<any>(null);

  // Metrics State
  const [metricsText, setMetricsText] = useState<string>("");

  useEffect(() => {
    checkHealth();
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
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                TEAM CORE PLATFORM
              </span>
              <span className="text-xs text-slate-400 font-mono">Rust actix-web Monolith</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-2">
              Luminovo Platform Core Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              High-performance authorization engine, LumiMatch AI copilot, and developer agent bridge.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono">
              <div className={`w-2.5 h-2.5 rounded-full ${backendStatus ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span>Daemon: {backendStatus ? "ONLINE (actix-web)" : "CONNECTING..."}</span>
              {backendStatus && (
                <span className="text-slate-500">| v{backendStatus.version}</span>
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
        <div className="flex gap-2 border-b border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab("authz")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "authz"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            ABAC Permission PDP
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "ai"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            LumiMatch AI Copilot
          </button>
          <button
            onClick={() => setActiveTab("agent")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "agent"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Developer Agent (DX)
          </button>
          <button
            onClick={() => {
              setActiveTab("metrics");
              handleFetchMetrics();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "metrics"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            Prometheus Telemetry
          </button>
        </div>

        {/* TAB 1: ABAC PERMISSIONS ENGINE */}
        {activeTab === "authz" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Policy Request Parameters
                </h3>
                <span className="text-xs font-mono text-slate-400">Lock-Free ArcSwap PDP</span>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Subject Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="design_engineer">OEM Design Engineer</option>
                    <option value="ems_procurement">EMS Procurement Specialist</option>
                    <option value="platform_admin">Team Core Platform Admin</option>
                    <option value="auditor">External Compliance Auditor</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Action</label>
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="read">Read</option>
                      <option value="write">Write</option>
                      <option value="export_pricing">Export Pricing</option>
                      <option value="approve_quotation">Approve Quotation</option>
                      <option value="source_alternates">Source Alternates</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Resource Type</label>
                    <select
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
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
                    <label className="block text-xs font-medium text-slate-400 mb-1">Subject Tenant ID</label>
                    <input
                      type="text"
                      value={subjectTenant}
                      onChange={(e) => setSubjectTenant(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Resource Tenant ID</label>
                    <input
                      type="text"
                      value={resourceTenant}
                      onChange={(e) => setResourceTenant(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={ndaSigned}
                      onChange={(e) => setNdaSigned(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
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
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-lg transition shadow-lg shadow-indigo-600/30"
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
                  <h3 className="font-semibold text-white">Live Decision Result</h3>
                  {evalResult && (
                    <span className="text-xs font-mono text-emerald-400">
                      Evaluated in: {(evalResult.latency_nanos / 1000).toFixed(1)} µs
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
                        <div className="text-xs opacity-90 mt-0.5">{evalResult.reason}</div>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
                      <div className="text-slate-500">// Audit Trail & Policy Trace</div>
                      <div>
                        Matched Rule ID:{" "}
                        <span className="text-indigo-400">{evalResult.matched_rule_id || "None (Default Deny)"}</span>
                      </div>
                      <div>
                        Latency: <span className="text-amber-400">{evalResult.latency_nanos} ns</span> (Zero-Copy)
                      </div>
                      <div>
                        Zero-Trust Boundary:{" "}
                        <span className={subjectTenant === resourceTenant ? "text-emerald-400" : "text-rose-400"}>
                          {subjectTenant === resourceTenant ? "Tenant Isolated" : "Cross-Tenant Detected"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-12 text-center text-slate-500 text-sm">
                    Click &ldquo;Evaluate Policy in Rust PDP&rdquo; to test authorization rules in real time.
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 border-t border-slate-800 pt-3 mt-6 flex justify-between">
                <span>Algorithm: In-Memory ArcSwap AST</span>
                <span>Thread-Safety: Lock-free atomic read</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LUMIMATCH AI COPILOT */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    LumiMatch AI Component & Supply Chain Copilot
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-source component normalization, second-source qualification, and supply chain vulnerability analysis.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={queryMpn}
                    onChange={(e) => setQueryMpn(e.target.value)}
                    placeholder="Enter MPN (e.g. STM32F401RET6)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleMatchAlternate}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Find Alternates
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

              {/* Alternates Grid */}
              {alternateResults && (
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Pin-Compatible Drop-In Alternates for {alternateResults.query_mpn}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alternateResults.alternates.map((alt: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-white">{alt.alternate_mpn}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {alt.cost_delta_pct > 0 ? `+${alt.cost_delta_pct}%` : `${alt.cost_delta_pct}%`} Cost
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Manufacturer: <span className="text-slate-200">{alt.manufacturer}</span> | Package:{" "}
                          <span className="text-slate-200">{alt.package_footprint}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{alt.rationale}</p>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900 text-slate-500">
                          <span>Match Confidence: {(alt.match_confidence * 100).toFixed(0)}%</span>
                          <span className="text-emerald-400">Pin-Compatible: YES</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sourcing Risk Report */}
              {riskReport && (
                <div className="mt-6 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-indigo-400">{riskReport.analyzed_by}</span>
                      <h4 className="text-base font-bold text-white">{riskReport.project_name} Risk Evaluation</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Overall Risk Score</div>
                        <div className="text-lg font-bold text-amber-400">{riskReport.overall_risk_score} / 100</div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-lg uppercase ${
                          riskReport.risk_level === "Critical"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {riskReport.risk_level}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-xs text-slate-400">Single Source Parts</div>
                      <div className="text-base font-bold text-white">{riskReport.single_source_count}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-xs text-slate-400">Obsolete / NRND</div>
                      <div className="text-base font-bold text-rose-400">{riskReport.obsolete_or_nrnd_count}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-xs text-slate-400">Max Lead Time</div>
                      <div className="text-base font-bold text-amber-400">{riskReport.max_lead_time_weeks} wks</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Strategic AI Recommendations
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {riskReport.strategic_recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DEVELOPER AGENT BRIDGE (DX) */}
        {activeTab === "agent" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  SQL Query Profiler & Linter
                </h3>
                <span className="text-xs font-mono text-slate-400">Team Core Platform Tool</span>
              </div>
              <p className="text-xs text-slate-400">
                AI coding agents and developers use this tool to detect multi-tenant leaks, missing LIMITs, and unindexed column joins.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">SQL Query to Profile</label>
                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleProfileSql}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-lg transition"
              >
                <Play className="w-4 h-4" />
                Profile Query with Rust Agent Bridge
              </button>
            </div>

            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="font-semibold text-white">Diagnostics & Anti-Pattern Analysis</h3>
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

                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Detected Findings ({sqlProfileResult.detected_anti_patterns.length})
                    </h5>
                    <ul className="space-y-2">
                      {sqlProfileResult.detected_anti_patterns.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-lg">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Platform Engineering Remediation
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {sqlProfileResult.optimization_suggestions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-sm mt-12">
                  Submit a SQL query to profile against Team Core standards.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PROMETHEUS METRICS */}
        {activeTab === "metrics" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Live Prometheus Metrics Stream (/metrics)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Raw telemetry scraped by Prometheus / Honeycomb agent from the Rust Actix-web server.
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
