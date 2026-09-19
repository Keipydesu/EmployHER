"use client";
import { useEffect, useState } from "react";
import { MemoryControls } from "./memory-controls";
import Link from "next/link";
import type { CareerService } from "@/opportunities/career-service";
import type { Preferences } from "@/opportunities/contracts";
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
  async function preferences(patch: Partial<Preferences>) {
    if (!view) return;
    await command({
      kind: "preferences",
      preferences: { ...view.saved.preferences, ...patch },
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
      <header style={{ flexWrap: "wrap", gap: "1rem" }}>
        <Link href="/">EmployHER</Link>
        <Link href="/profile">Review résumé</Link>
        <Link href="/onboarding">Edit interests</Link>
        <Link href="/account">Manage my data</Link>
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
          <section className="panel" aria-label="Guidance preferences">
            <h2>Focus your guidance</h2>
            <fieldset disabled={!!busy}>
              <legend>Listing context</legend>
              <label>
                Career stage
                <select
                  value={view.saved.preferences.roleType}
                  onChange={(e) =>
                    void run("Updating your preferences…", () =>
                      preferences({
                        roleType: e.target.value as Preferences["roleType"],
                      }),
                    )
                  }
                >
                  <option value="any">Internships and new-grad roles</option>
                  <option value="internship">Internships</option>
                  <option value="new-grad">New-grad roles</option>
                </select>
              </label>
              <label>
                Work arrangement
                <select
                  value={view.saved.preferences.remote}
                  onChange={(e) =>
                    void run("Updating your preferences…", () =>
                      preferences({
                        remote: e.target.value as Preferences["remote"],
                      }),
                    )
                  }
                >
                  <option value="any">Any arrangement</option>
                  <option value="remote">Remote</option>
                  <option value="onsite">On site</option>
                </select>
              </label>
              <label>
                Location
                <select
                  value={view.saved.preferences.location}
                  onChange={(e) =>
                    void run("Updating your preferences…", () =>
                      preferences({
                        location: e.target.value as Preferences["location"],
                      }),
                    )
                  }
                >
                  <option value="any">Any location</option>
                  <option value="US">United States</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </label>
            </fieldset>
            <fieldset disabled={!!busy}>
              <legend>Optional community resources</legend>
              <p>
                Choose resources you want to explore. These choices are
                available to everyone and do not describe your identity.
              </p>
              {(["women", "community"] as const).map((category) => (
                <label key={category} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={view.saved.preferences.inclusion.includes(
                      category,
                    )}
                    onChange={(e) =>
                      void run("Updating community choices…", () =>
                        preferences({
                          inclusion: e.target.checked
                            ? [...view.saved.preferences.inclusion, category]
                            : view.saved.preferences.inclusion.filter(
                                (value) => value !== category,
                              ),
                        }),
                      )
                    }
                  />
                  {category === "women"
                    ? "Women-focused mentorship and organizations"
                    : "Community and inclusion organizations"}
                </label>
              ))}
            </fieldset>
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
          <MemoryControls
            profileId={profileId}
            profileVersion={profileVersion}
          />
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
            <h3>Your evidence checklist</h3>
            <p>
              {
                view.guidance.checkpoints.filter((c) => c.state === "evidenced")
                  .length
              }{" "}
              of {view.guidance.checkpoints.length} reviewed skill checkpoints
              have evidence in this profile. This is evidence coverage, not job
              readiness or a hiring probability.
            </p>
            {!!view.guidance.checkpoints.length && (
              <progress
                aria-label="Reviewed skill evidence coverage"
                max={view.guidance.checkpoints.length}
                value={
                  view.guidance.checkpoints.filter(
                    (c) => c.state === "evidenced",
                  ).length
                }
              />
            )}
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
                    : c.state === "confirmed_learning_need"
                      ? "you chose this as a learning need"
                      : "not yet evidenced in this profile"}
                  <details>
                    <summary>Evidence and sources for {c.skill}</summary>
                    {c.evidence.map((e, i) => (
                      <p key={i}>
                        {e.source === "resume"
                          ? "Résumé evidence"
                          : "User-reported evidence"}
                        : {e.excerpt}
                      </p>
                    ))}
                    {c.requirements.map((r) => (
                      <p key={`${r.jobId}:${r.requirementId}`}>
                        <q>{r.excerpt}</q>{" "}
                        <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                          Reviewed source
                        </a>{" "}
                        · checked {r.checkedAt.slice(0, 10)}
                      </p>
                    ))}
                  </details>
                  {c.state === "needs_clarification" && (
                    <div>
                      <p>
                        Your résumé may simply omit this experience. Add
                        existing experience through profile review, or confirm
                        that you want to learn this skill.
                      </p>
                      <Link href="/profile">Review my experience</Link>{" "}
                      <button
                        disabled={!!busy}
                        onClick={() =>
                          void run("Saving your learning choice…", () =>
                            command({ kind: "confirm-gap", skill: c.skill }),
                          )
                        }
                      >
                        Confirm I want to learn {c.skill}
                      </button>
                    </div>
                  )}
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
          <section
            className="panel"
            aria-label="Learning and community resources"
          >
            <h2>Organizations and learning resources</h2>
            {!view.resources.length && (
              <p>
                No current reviewed resources match these choices. Update the
                optional community categories above to explore more.
              </p>
            )}
            {view.resources.map((resource) => (
              <article key={resource.id}>
                <h3>
                  <a href={resource.url} target="_blank" rel="noreferrer">
                    {resource.title}
                  </a>
                </h3>
                <p>{resource.claim}</p>
                <p>Access: {resource.eligibility}</p>
                <p>Cost: {resource.cost}</p>
                <p>Prerequisites: {resource.prerequisites}</p>
                <p>Checked {resource.checkedAt.slice(0, 10)}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
