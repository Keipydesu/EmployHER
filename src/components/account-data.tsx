"use client";
import { useState } from "react";
type Deletion = {
  deletionId: string;
  status: "pending" | "failed" | "completed";
  providerNotice?: string;
};
export function AccountData({ initial }: { initial: Deletion | null }) {
  const [deletion, setDeletion] = useState(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function request(remove: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/me/data", {
        method: remove ? "DELETE" : "GET",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message ?? "Could not load your deletion status.",
        );
      setDeletion(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Delete my application data</h2>
      <p>
        This removes your saved résumé evidence, career plans, preferences and
        remembered Backboard context. Access to your private work stops as soon
        as the request is accepted. This cannot be undone.
      </p>
      <p>
        Your Auth0 sign-in account is separate. A minimal deletion record
        remains to prevent late writes; provider and backup retention follow
        their published terms.
      </p>
      {error && <p role="alert">{error}</p>}
      {deletion ? (
        <>
          <p role="status">
            {deletion.status === "completed"
              ? "Application data cleanup completed."
              : deletion.status === "failed"
                ? "Cleanup encountered a problem and will retry. Your private data remains inaccessible."
                : "Deletion pending. Your private data is inaccessible while cleanup continues."}
          </p>
          <p>{deletion.providerNotice}</p>
          <p>
            Cleanup targets 24 hours. Provider outages can delay completion. The
            local app must be running for its cleanup worker to continue.
          </p>
          <button disabled={busy} onClick={() => void request(false)}>
            Refresh deletion status
          </button>
        </>
      ) : (
        <>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I understand that deleting my saved work cannot be undone.
          </label>
          <p>
            <button
              disabled={busy || !confirmed}
              onClick={() => void request(true)}
            >
              {busy ? "Requesting deletion…" : "Delete my data"}
            </button>
          </p>
        </>
      )}
    </section>
  );
}
