"use client";
import { useState } from "react";
import { ArrowRight, Loader2, Download } from "lucide-react";
export type Part = {
  required_quantity?: number;
  normalized_mpn: string;
  manufacturer: string;
  lifecycle_status: string;
  total_stock: number;
  best_unit_price_at_qty: number;
  best_distributor: string;
  distributor_count: number;
  data_source: "live" | "reference" | "unavailable";
  warnings: string[];
  offers?: { distributor: string; source: string; fetched_at?: string }[];
  ml_risk_prediction?: {
    risk_score: number;
    risk_tier: string;
    top_attributions: { feature: string; raw_value: string }[];
  } | null;
};
export function PartsTable({ parts }: { parts: Part[] }) {
  return (
    <div className="responsive-table">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Part number</th>
              <th>Availability</th>
              <th>Unit price</th>
              <th>Sourcing score</th>
              <th>Lifecycle</th>
              <th>Data source</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p, i) => (
              <tr key={`${p.normalized_mpn}-${i}`}>
                <td data-label="Part number">
                  <span className="mpn">{p.normalized_mpn}</span>
                  <span className="sub">
                    {p.manufacturer || "Manufacturer unknown"}{p.required_quantity ? ` · Qty ${p.required_quantity.toLocaleString()}` : ""}
                  </span>
                </td>
                <td data-label="Availability">
                  {p.data_source === "unavailable" ? (
                    "No offers"
                  ) : (
                    <>
                      <span className="mono">
                        {p.total_stock.toLocaleString()}
                      </span>
                      <span className="sub">
                        {p.distributor_count} distributor
                        {p.distributor_count !== 1 ? "s" : ""}
                        {p.data_source === "reference"
                          ? " · reference stock"
                          : ""}
                      </span>
                    </>
                  )}
                </td>
                <td data-label="Unit price">
                  <span className="price">
                    {p.best_unit_price_at_qty > 0
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 4,
                        }).format(p.best_unit_price_at_qty)
                      : "—"}
                  </span>
                  <span className="sub">
                    {p.best_distributor === "None"
                      ? "Not available"
                      : p.best_distributor}
                  </span>
                </td>
                <td data-label="Sourcing score">
                  {p.ml_risk_prediction ? (
                    <>
                      <div className="risk-top">
                        <span className="risk-num">
                          {Math.round(p.ml_risk_prediction.risk_score * 100)}
                          /100
                        </span>
                        <span
                          className={
                            p.ml_risk_prediction.risk_score >= 0.45
                              ? "risk-crit"
                              : "risk-low"
                          }
                        >
                          {p.ml_risk_prediction.risk_tier}
                        </span>
                      </div>
                      <details
                        style={{
                          fontSize: 11,
                          marginTop: 5,
                          color: "var(--muted)",
                        }}
                      >
                        <summary>Contributing factors</summary>
                        <ul>
                          {p.ml_risk_prediction.top_attributions.map((a) => (
                            <li key={a.feature}>
                              {a.feature.replaceAll("_", " ")}: {a.raw_value}
                            </li>
                          ))}
                        </ul>
                      </details>
                      <div className="meter">
                        <i
                          className={
                            p.ml_risk_prediction.risk_score >= 0.45
                              ? "fill-crit"
                              : "fill-low"
                          }
                          style={{
                            width: `${p.ml_risk_prediction.risk_score * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    "Insufficient data"
                  )}
                </td>
                <td data-label="Lifecycle">
                  <span className="status-dot">
                    <span
                      className={`dot ${p.lifecycle_status === "Active" ? "dot-green" : p.lifecycle_status ? "dot-amber" : "dot-grey"}`}
                    />
                    {p.lifecycle_status || "Unknown"}
                  </span>
                </td>
                <td data-label="Data source">
                  <span className="status-dot">
                    <span
                      className={`dot ${p.data_source === "live" ? "dot-green" : p.data_source === "reference" ? "dot-amber" : "dot-grey"}`}
                    />
                    {p.data_source === "live"
                      ? "Live API"
                      : p.data_source === "reference"
                        ? "Reference catalog"
                        : "Unavailable"}
                  </span>
                  <span className="sub">
                    {p.data_source === "live"
                      ? "Retrieved from supplier"
                      : "Not a current quote"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function Enrichment({ compact = false }: { compact?: boolean }) {
  const [input, setInput] = useState(
    "STM32F401RET6\nLM1117-3.3\nRC0603FR-0710KL\nOPA2350UA",
  );
  const [quantity, setQuantity] = useState(1000);
  const [resultQuantity, setResultQuantity] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [filter, setFilter] = useState("all");
  const [elapsed, setElapsed] = useState<number | null>(null);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const mpns = input
      .split(/[,\n]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (
      !mpns.length ||
      mpns.length > 25 ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      setError(
        "Enter 1–25 part numbers and a positive whole-number quantity.",
      );
      return;
    }
    setBusy(true);
    setParts([]);
    const start = performance.now();
    try {
      const response = await fetch("/api/platform-core/api/v1/bom/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mpns, target_batch_size: quantity }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to enrich these parts.");
      setParts(data.results);
      setResultQuantity(quantity);
      setElapsed(Math.round(performance.now() - start));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const rows = [
      [
        "Part number",
        "Manufacturer",
        "Stock",
        "Unit price USD",
        "Source",
        "Risk score (heuristic)",
      ],
      ...parts.map((p) => [
        p.normalized_mpn,
        p.manufacturer,
        p.total_stock,
        p.best_unit_price_at_qty,
        p.data_source,
        p.ml_risk_prediction?.risk_score ?? "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexus-sourcing-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const shown = parts.filter(
    (p) =>
      filter === "all" ||
      (filter === "attention"
        ? (p.ml_risk_prediction?.risk_score ?? 1) >= 0.45
        : p.data_source === "live"),
  );
  return (
    <>
      <form onSubmit={run}>
        <div className={compact ? "form-grid" : ""}>
          <label className="field">
            Manufacturer part numbers
            <textarea
              rows={compact ? 3 : 4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder="One part number per line"
              required
            />
          </label>
          <label
            className="field"
            style={{ alignContent: "start", marginTop: compact ? 0 : 16 }}
          >
            Quantity per part
            <input
              type="number"
              min="1"
              max="100000000"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
            <span className="sub" style={{ fontWeight: 400 }}>
              Used to select the appropriate price break.
            </span>
          </label>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}{" "}
            {busy
              ? "Checking distributors…"
              : compact
                ? "Try sample enrichment"
                : "Enrich BOM"}
          </button>
          <span className="sub">
            {elapsed !== null
              ? `${parts.length} parts checked · ${(elapsed / 1000).toFixed(2)}s`
              : "Up to 25 parts per public run; use Workspace for larger BOMs"}
          </span>
        </div>
      </form>
      {error && (
        <p className="note error result-section" role="alert">
          {error}
        </p>
      )}
      {!!parts.length && (
        <section
          className="result-section"
          aria-label="Enrichment results"
          aria-live="polite"
        >
          <div className="section-head">
            <div className="filterbar" aria-label="Filter results">
              {[
                ["all", "All lines"],
                ["attention", "Needs attention"],
                ["live", "Live data"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "active" : ""}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={download}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          {parts.some((p) => p.data_source !== "live") && (
            <div className="note warning">
              Some results use the built-in reference catalog. These stock
              levels and prices are illustrative. Configure distributor
              credentials for live quotes.
            </div>
          )}
          {shown.length ? (
            <PartsTable parts={shown} />
          ) : (
            <div className="empty-state">No parts match this filter.</div>
          )}
          <div className="data-caption">
            <span>
              Showing {shown.length} of {parts.length} parts · USD · Quantity{" "}
              {resultQuantity.toLocaleString()}
            </span>
            <span>
              Heuristic scores indicate relative risk, not stock-out
              probability.
            </span>
          </div>
          {[...new Set(parts.flatMap((p) => p.warnings || []))].filter(
            (w) => !w.startsWith("Reference"),
          ).length > 0 && (
            <details
              style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}
            >
              <summary>Supplier lookup details</summary>
              <ul>
                {[...new Set(parts.flatMap((p) => p.warnings || []))].map(
                  (w) => (
                    <li key={w}>{w}</li>
                  ),
                )}
              </ul>
            </details>
          )}
        </section>
      )}
      {!parts.length && !error && !compact && (
        <div className="empty-state">
          Your sourcing results will appear here.
          <br />
          <span className="sub">
            Run the sample parts above, or paste your own list.
          </span>
        </div>
      )}
    </>
  );
}
