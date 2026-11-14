"use client";

import { useState } from "react";
import { ArrowRight, Play, Loader2 } from "lucide-react";
import { IntegrationStatus } from "@/types/integration";
import { getSystemConfig } from "@/config/integration-types";
import { triggerSync } from "@/actions/integration-actions";
import toast from "react-hot-toast";
import Link from "next/link";

interface IntegrationCardProps {
  id: string; // Added ID prop
  name: string;
  source: string;
  destination: string;
  status: IntegrationStatus;
  lastRun: string;
  uptime: string;
}

export function IntegrationCard({
  id,
  name,
  source,
  destination,
  status,
  lastRun,
  uptime,
}: IntegrationCardProps) {
  const sourceConfig = getSystemConfig(source);
  const destConfig = getSystemConfig(destination);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.loading("Sync started...", { id: "sync-toast" });
    try {
      const result = await triggerSync(id);
      if (result.success) {
        toast.success("Sync completed successfully", { id: "sync-toast" });
      } else {
        toast.error("Sync failed. Check logs.", { id: "sync-toast" });
      }
    } catch (error) {
      toast.error("Failed to trigger sync", { id: "sync-toast" });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <article className="int-row integration-row">
      <div className="int-icon" aria-hidden="true">
        <sourceConfig.icon size={19} />
      </div>
      <div className="integration-description">
        <h3>{name}</h3>
        <p>
          {sourceConfig.name}{" "}
          <ArrowRight
            size={12}
            style={{ display: "inline", verticalAlign: "middle" }}
          />{" "}
          {destConfig.name}
        </p>
        <span className="sub" style={{ fontSize: 12 }}>
          Last activity: {lastRun}
        </span>
      </div>
      <div className="integration-actions">
        <span className="status-dot">
          <span
            className={`dot ${status === "healthy" ? "dot-green" : status === "warning" ? "dot-amber" : "dot-red"}`}
          />
          {status === "healthy"
            ? "Healthy"
            : status === "warning"
              ? "Warning"
              : "Error"}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Play size={13} />
          )}{" "}
          {isSyncing ? "Syncing…" : "Sync now"}
        </button>
        <Link
          className="textlink"
          href={`/integration-hub/logs?integrationId=${id}`}
          style={{ fontSize: 12 }}
        >
          View logs ↗
        </Link>
        <Link
          className="textlink"
          href={`/integration-hub/settings?id=${id}`}
          style={{ fontSize: 12 }}
        >
          Settings
        </Link>
      </div>
    </article>
  );
}
