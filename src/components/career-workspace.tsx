"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CareerService } from "@/opportunities/career-service";
type View = Awaited<ReturnType<CareerService["read"]>>;
export function CareerWorkspace({
  profileId,
  profileVersion,
}: {
  profileId: string;
  profileVersion: number;
}) {
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState("Loading your career context…");
  const [error, setError] = useState("");
  async function load(url: string, body?: unknown) {
    const response = await fetch(
      url,
      body
        ? {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify(body),
          }
        : { cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error?.message ?? "Could not load your career plan.",
      );
    setView(data);
  }
  async function command(value: Record<string, unknown>) {
    if (!view) return;
    await load("/api/career", {
      profileId,
      profileVersion,
      catalogVersion: view.saved.catalogVersion,
      command: { ...value, expectedVersion: view.saved.version },
    });
  }
  async function run(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      `/api/career?profileId=${encodeURIComponent(profileId)}&profileVersion=${profileVersion}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error?.message ?? "Could not load your plan.");
        if (!controller.signal.aborted) setView(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "Please retry.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy("");
      });
    return () => controller.abort();
  }, [profileId, profileVersion]);
  return (
    <main className="opportunities">
      <header>
        <Link href="/">EmployHER</Link>
        <Link href="/profile">Review résumé</Link>
        <Link href="/onboarding">Edit interests</Link>
      </header>
      <section className="op-hero">
        <p className="eyebrow">Your next chapter</p>
        <h1>A practical next step, chosen for you.</h1>
        <p>
          Gemini considers your résumé and the selected field’s reviewed
          listings. These are AI suggestions you can question and refine, not
          hiring predictions.
        </p>
      </section>
      <div aria-live="polite">{busy && <p>{busy}</p>}</div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {view && (
        <>
          <section className="panel">
            <label htmlFor="career-field">Field to explore</label>
            <select
              id="career-field"
              value={view.saved.plan.pathId}
              disabled={!!busy}
              onChange={(e) =>
                void run("Updating your field…", () =>
                  load("/api/career", {
                    profileId,
                    profileVersion,
                    catalogVersion: view.saved.catalogVersion,
                    command: {
                      kind: "path",
                      pathId: e.target.value,
                      expectedVersion: view.saved.version,
                    },
                  }),
                )
              }
            >
              {view.paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.title}
                </option>
              ))}
            </select>
            <p>
              Only this field is included in the analysis. Changing your field
              or résumé requires a new analysis.
            </p>
            <button
              disabled={!!busy}
              onClick={() =>
                void run("Gemini is considering your next steps…", () =>
                  load("/api/career/analyze", {
                    profileId,
                    profileVersion,
                    catalogVersion: view.saved.catalogVersion,
                  }),
                )
              }
            >
              {view.analysis
                ? "Load saved Gemini analysis"
                : "Find my next steps with Gemini"}
            </button>
          </section>
          <section className="panel" aria-label="Gemini career recommendations">
            <h2>Your next steps</h2>
            {!view.analysis ? (
              <p>
                No Gemini analysis is saved for this context yet. Generate one
                above; if the provider is unavailable, you can still inspect the
                source context below.
              </p>
            ) : (
              <ol>
                {view.analysis.recommendations.map((action, i) => (
                  <li key={i} className="job-card">
                    <h3>{action.title}</h3>
                    <button
                      disabled={
                        !!busy ||
                        view.saved.plan.actions.some(
                          (saved) =>
                            saved.recommendation?.contextHash ===
                              view.analysisContextHash &&
                            saved.recommendation.index === i,
                        )
                      }
                      onClick={() =>
                        void run("Saving your next step…", () =>
                          command({
                            kind: "select-recommendation",
                            contextHash: view.analysisContextHash,
                            index: i,
                          }),
                        )
                      }
                    >
                      Save this next step
                    </button>
                    <p>{action.why}</p>
                    <p>
                      <strong>Your deliverable:</strong> {action.deliverable}
                    </p>
                    {action.learningNeed === "needs_clarification" && (
                      <p>
                        This is a possible direction to explore, not a claim
                        that you lack the skill.
                      </p>
                    )}
                    <details>
                      <summary>Why this suggestion?</summary>
                      <ul>
                        {action.sourceIds.map((id) => {
                          const source = view.analysisSources.find(
                            (s) => s.id === id,
                          );
                          return source ? (
                            <li key={id}>
                              <q>{source.text}</q>{" "}
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View source
                              </a>{" "}
                              · {source.importance}
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </details>
                    {action.resourceIds.map((id) => {
                      const resource = view.resources.find((r) => r.id === id);
                      return resource ? (
                        <p key={id}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {resource.title}
                          </a>{" "}
                          — {resource.cost}. {resource.eligibility}
                        </p>
                      ) : null;
                    })}
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="panel" aria-label="Saved next steps">
            <h2>Your saved next steps</h2>
            <p>
              Keep up to three active steps. Completing a step records progress;
              it does not add résumé evidence automatically.
            </p>
            {!view.saved.plan.actions.length && (
              <p>Save a recommendation above to start your plan.</p>
            )}
            <ul>
              {view.saved.plan.actions.map((action) => (
                <li key={action.id} className="job-card">
                  <h3>{action.title}</h3>
                  <p>{action.deliverable}</p>
                  <p>
                    {action.state === "done" ? "Completed" : "Active"}
                    {view.saved.staleActionIds.includes(action.id)
                      ? " · Based on older context; review before relying on it."
                      : ""}
                  </p>
                  {action.recommendation && <p>{action.recommendation.why}</p>}
                  {action.state !== "done" && (
                    <button
                      disabled={!!busy}
                      onClick={() =>
                        void run("Recording progress…", () =>
                          command({
                            kind: "action-state",
                            actionId: action.id,
                            state: "done",
                          }),
                        )
                      }
                    >
                      Mark complete
                    </button>
                  )}
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      void run("Removing saved step…", () =>
                        command({
                          kind: "action-state",
                          actionId: action.id,
                          state: "remove",
                        }),
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Context from this field</h2>
            <p>
              {view.guidance.patterns.sampleSize} reviewed listings;{" "}
              {view.guidance.patterns.knownRequirements} have mapped skill
              excerpts. {view.guidance.patterns.limitation}
            </p>
            <ul>
              {view.guidance.checkpoints.map((c) => (
                <li key={c.skill}>
                  <strong>{c.skill}</strong> — {c.listingCount} listing
                  mentions;{" "}
                  {c.state === "evidenced"
                    ? "evidenced in your profile"
                    : "not yet evidenced in this profile"}
                </li>
              ))}
            </ul>
            <details>
              <summary>Supporting roles and qualification notes</summary>
              {view.matches.map((m) => (
                <article key={m.job.id}>
                  <h3>
                    {m.job.title} · {m.job.company}
                  </h3>
                  {m.job.qualificationNotes?.map((note, i) => (
                    <p key={i}>{note}</p>
                  ))}
                  <a
                    href={m.job.applyUrl ?? m.job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View employer posting
                  </a>
                </article>
              ))}
            </details>
          </section>
        </>
      )}
    </main>
  );
}
