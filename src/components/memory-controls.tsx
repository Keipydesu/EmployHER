"use client";
import { useEffect, useState } from "react";
type Status = { configured: boolean; enabled: boolean; status: string };
export function MemoryControls({
  profileId,
  profileVersion,
}: {
  profileId: string;
  profileVersion: number;
}) {
  const [status, setStatus] = useState<Status | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/me/memory", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.ok) setStatus(await r.json());
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  async function save(enabled: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/me/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          enabled ? { enabled, profileId, profileVersion } : { enabled },
        ),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error?.message ?? "Could not update memory.");
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Remember this plan with Backboard</h2>
      <p>
        Optional: share your selected field and active next-step titles and
        deliverables with Backboard. Your raw résumé is not included. Tiger Data
        keeps your saved plan whether or not you enable this.
      </p>
      <p>
        Each save replaces the remembered snapshot. Later edits are shared only
        when you save again.
      </p>
      {status && (
        <p role="status">
          Memory: {status.status}
          {!status.configured ? " · Service not configured" : ""}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy || !status?.configured}
        onClick={() => void save(true)}
      >
        {status?.enabled
          ? "Update remembered plan"
          : "Opt in and remember this plan"}
      </button>
      <button
        disabled={busy || !status?.enabled}
        onClick={() => void save(false)}
      >
        Turn off and delete remembered context
      </button>
      <p>
        Queued changes are retried in the background. Reload to check status.
        Provider retention follows the published service terms.
      </p>
    </section>
  );
}
