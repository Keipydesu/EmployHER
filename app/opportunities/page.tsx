"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { View } from "../../src/opportunities/state";
import type { Command, Preferences } from "../../src/opportunities/contracts";

type CommandInput = Command extends infer C
  ? C extends Command
    ? Omit<C, "expectedVersion">
    : never
  : never;
const labels: Record<string, string> = {
  python: "Python",
  sql: "SQL",
  git: "Version control",
  cloud: "Cloud deployment",
  access: "Access controls",
  monitoring: "Monitoring",
  statistics: "Statistics",
  modeling: "ML modeling",
  testing: "Testing",
  research: "User research",
  circuits: "Circuits",
};
const statusLabels: Record<string, string> = {
  resume_supported: "Supported by résumé",
  user_reported: "User-reported evidence",
  needs_confirmation: "Needs clarification",
};
function date(value: string) {
  return value.slice(0, 10);
}
export default function Opportunities() {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/demo/opportunities", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error.message);
      setView(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo/opportunities", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error.message);
        if (!cancelled) setView(body);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function send(input: CommandInput) {
    if (!view) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/demo/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ ...input, expectedVersion: view.version }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error.message);
      setView(body);
      setNotice("Saved. Your path and next steps are up to date.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function removeData() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/opportunities", { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to clear demo data.");
      setView(null);
      setNotice("Demo data deleted. Reload to start a new session.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function preference(
    key: Exclude<keyof Preferences, "inclusion">,
    value: string,
  ) {
    if (view)
      void send({
        kind: "preferences",
        preferences: { ...view.preferences, [key]: value } as Preferences,
      });
  }
  return (
    <main className="opportunities">
      <header>
        <Link href="/" aria-label="EmployHER home">
          Employ<span>HER</span>
        </Link>
        <span className="badge">Synthetic demo · no real résumé data</span>
      </header>
      <section className="op-hero">
        <p className="eyebrow">Find a direction. Take a next step.</p>
        <h1>
          Your next chapter,
          <br />
          <em>one step at a time.</em>
        </h1>
        <p className="lead">
          Explore your experience, discover a path, and leave with a plan you
          can act on.
        </p>
      </section>
      <div className="demo-note">
        <strong>A practice space.</strong> Profiles, employers, vacancies and
        checklist requirements below are invented fixtures. Learning and
        community links lead to real official sites. This demo uses
        deterministic skill vectors, not Gemini or live job data.
      </div>
      <div role="status" aria-live="polite" className="status-message">
        {busy ? "Saving…" : notice}
      </div>
      {error && (
        <div role="alert" className="error-box">
          {error}{" "}
          <button onClick={load} disabled={busy}>
            Refresh and retry
          </button>
        </div>
      )}
      {!view ? (
        <section>
          <p>{notice || "Loading your opportunities…"}</p>
          <button onClick={load} disabled={busy}>
            Load demo
          </button>
        </section>
      ) : (
        <>
          <section
            className="toolbar"
            aria-label="Demo profile and preferences"
          >
            <label>
              Synthetic profile
              <select
                disabled={busy}
                value={view.profile.id}
                onChange={(e) =>
                  send({ kind: "profile", profileId: e.target.value as "maya" })
                }
              >
                {view.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role type
              <select
                disabled={busy}
                value={view.preferences.roleType}
                onChange={(e) => preference("roleType", e.target.value)}
              >
                <option value="any">All early-career roles</option>
                <option value="internship">Internships</option>
                <option value="new-grad">New grad</option>
              </select>
            </label>
            <label>
              Work arrangement
              <select
                disabled={busy}
                value={view.preferences.remote}
                onChange={(e) => preference("remote", e.target.value)}
              >
                <option value="any">Any arrangement</option>
                <option value="remote">Remote</option>
                <option value="onsite">On site</option>
              </select>
            </label>
            <label>
              Location
              <select
                disabled={busy}
                value={view.preferences.location}
                onChange={(e) => preference("location", e.target.value)}
              >
                <option value="any">All locations</option>
                <option value="Georgia">Georgia</option>
                <option value="US">US (listed broadly)</option>
              </select>
            </label>
          </section>
          <div className="workspace">
            <nav className="path-nav" aria-label="Career paths">
              <p className="eyebrow">Explore paths</p>
              {view.paths.map((path) => (
                <button
                  key={path.id}
                  className={`path-choice ${path.parentId ? "subpath" : ""}`}
                  aria-pressed={view.plan.pathId === path.id}
                  disabled={busy}
                  onClick={() => send({ kind: "path", pathId: path.id })}
                >
                  <strong>{path.title}</strong>
                  <span>
                    {path.coverage === null
                      ? "Path being curated / assessment unavailable"
                      : `${path.supported} of ${path.total} checkpoints evidenced`}
                  </span>
                </button>
              ))}
              <p className="muted">
                Cybersecurity and Cloud are curated EmployHER subpaths. Progress
                across different checklists is not a ranking of your readiness.
              </p>
            </nav>
            <div className="path-content">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Your selected path</p>
                    <h2>{view.assessment.path.title}</h2>
                  </div>
                  <span className="badge">
                    Checklist v{view.assessment.path.version}
                  </span>
                </div>
                {view.assessment.coverage === null ? (
                  <p>
                    Not enough evidence to assess.{" "}
                    {view.profile.status === "draft"
                      ? "This profile is an unconfirmed draft."
                      : "This path is being curated."}
                  </p>
                ) : (
                  <>
                    <p className="coverage-label">
                      <strong>
                        {view.assessment.supported} of {view.assessment.total}
                      </strong>{" "}
                      evidence checkpoints supported
                    </p>
                    <progress
                      aria-label={`${view.assessment.path.title} evidence coverage`}
                      value={view.assessment.supported}
                      max={view.assessment.total}
                    />
                    <p className="muted">
                      Evidence coverage of this synthetic checklist—not hiring
                      probability. Eligibility is checked separately. Repeated
                      skills count once.
                    </p>
                  </>
                )}
                <div className="checkpoints">
                  {view.assessment.checkpoints.map((c) => (
                    <details key={c.skill}>
                      <summary>
                        <span>{labels[c.skill]}</span>
                        <span
                          className={`checkpoint-state ${c.evidence ? "supported" : ""}`}
                        >
                          {c.confirmedGap
                            ? "Learning need confirmed"
                            : statusLabels[c.state]}
                        </span>
                      </summary>
                      <div className="checkpoint-body">
                        {c.evidence ? (
                          <>
                            <blockquote>{c.evidence.excerpt}</blockquote>
                            <p>
                              {c.evidence.source === "resume"
                                ? "Synthetic résumé evidence"
                                : "Reviewed synthetic user report"}
                              . Profile v{view.profile.version}.
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              Have you done relevant work that is missing from
                              this profile?
                            </p>
                            <div className="button-row">
                              <button
                                disabled={
                                  busy || view.profile.status !== "confirmed"
                                }
                                onClick={() =>
                                  send({ kind: "add-evidence", skill: c.skill })
                                }
                              >
                                Simulate adding reviewed evidence
                              </button>
                              <button
                                disabled={
                                  busy ||
                                  view.profile.status !== "confirmed" ||
                                  c.confirmedGap
                                }
                                onClick={() =>
                                  send({ kind: "confirm-gap", skill: c.skill })
                                }
                              >
                                {c.confirmedGap
                                  ? "Learning need confirmed"
                                  : "No, I want to learn this"}
                              </button>
                            </div>
                          </>
                        )}
                        <p className="muted">
                          Why it matters: the synthetic role requirements in
                          this checklist ask for {labels[c.skill].toLowerCase()}
                          . Reviewed{" "}
                          {date(view.context.checkedAt ?? "2026-09-18")}.
                          Requirement references: {c.requirementIds.join(", ")}.
                        </p>
                        {c.confirmedGap && (
                          <div className="action-suggestion">
                            <h3>A bounded next step</h3>
                            <p>{c.deliverable}</p>
                            <button
                              disabled={busy}
                              onClick={() =>
                                send({ kind: "select-action", skill: c.skill })
                              }
                            >
                              Save learning action
                            </button>
                            <p className="muted">
                              You can explore and apply to real jobs while
                              learning. This is suggested practice, not a
                              universal prerequisite.
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
              <section className="panel">
                <h2>Your next steps</h2>
                <p>
                  Keep up to three active actions. Finishing an action does not
                  change evidence coverage.
                </p>
                {view.plan.actions.length === 0 ? (
                  <p className="empty">
                    Open a checkpoint, clarify the gap, and save a small next
                    step.
                  </p>
                ) : (
                  <ul className="action-list">
                    {view.plan.actions.map((action) => (
                      <li key={action.id}>
                        <div>
                          <h3>
                            {action.title}{" "}
                            <span className="small-label">
                              {action.state === "done" ? "Completed" : "Active"}{" "}
                              · {action.pathId}
                            </span>
                          </h3>
                          <p>{action.deliverable}</p>
                          {view.staleActions.includes(action.id) && (
                            <p className="warning">
                              Historical action: your profile or checklist
                              changed. Clarify the current checkpoint before
                              reusing this advice.
                            </p>
                          )}
                          {!view.staleActions.includes(action.id) &&
                            action.resourceId &&
                            view.resources.find(
                              (r) => r.id === action.resourceId,
                            ) && (
                              <a
                                href={
                                  view.resources.find(
                                    (r) => r.id === action.resourceId,
                                  )!.url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open reviewed learning resource ↗
                              </a>
                            )}
                        </div>
                        <div className="button-row">
                          {action.state === "selected" && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                send({
                                  kind: "action-state",
                                  actionId: action.id,
                                  state: "done",
                                })
                              }
                            >
                              Mark done
                            </button>
                          )}
                          <button
                            disabled={busy}
                            onClick={() =>
                              send({
                                kind: "action-state",
                                actionId: action.id,
                                state: "remove",
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="panel">
                <h2>Opportunities to explore</h2>
                <p>
                  Ranked by deterministic similarity to this synthetic profile.
                  No fit percentages.{" "}
                  {view.filteredOut > 0
                    ? `${view.filteredOut} role(s) excluded by strict filters, including unknown metadata. Relax filters explicitly to broaden results.`
                    : ""}
                </p>
                {view.matchError && <p className="empty">{view.matchError}</p>}
                {!view.matchError && !view.matches.length && (
                  <p className="empty">
                    No matching roles in this sample. Try another path or relax
                    your filters.
                  </p>
                )}
                {view.matches.map((match) => (
                  <details className="job-card" key={match.job.id}>
                    <summary>
                      <span>
                        <strong>{match.job.title}</strong>
                        <small>
                          {match.job.company} · {match.job.remote} ·{" "}
                          {match.job.location}
                        </small>
                      </span>
                      <span className="small-label">
                        Synthetic {match.job.roleType}
                      </span>
                    </summary>
                    <div className="checkpoint-body">
                      <p>
                        Fixture marked open · Checked{" "}
                        {date(match.job.checkedAt)} · {match.job.sourceCommit}.
                        Not a real vacancy; no application link.
                      </p>
                      {!match.requirementsAvailable ? (
                        <p>
                          Discovery candidate: requirements unavailable. No
                          skill-gap assessment.
                        </p>
                      ) : (
                        <>
                          <h3>Evidence you can foreground</h3>
                          {match.strengths.length ? (
                            <ul>
                              {match.strengths.map((s) => (
                                <li key={s.requirementId}>
                                  <strong>{labels[s.evidence.skill]}</strong>:{" "}
                                  {s.evidence.excerpt}{" "}
                                  <span className="muted">
                                    ({s.evidence.source})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>No supported requirements yet.</p>
                          )}
                          <h3>Clarify before calling it a gap</h3>
                          {match.gaps.length ? (
                            <ul>
                              {match.gaps.map((g) => (
                                <li key={g.requirementId}>
                                  {labels[g.skill]} — {g.reason}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>
                              All displayed skill requirements have evidence.
                              This does not guarantee eligibility or an offer.
                            </p>
                          )}
                          <h3>Requirement evidence</h3>
                          <ul>
                            {match.job.requirements.map((r) => (
                              <li key={r.id}>
                                <q>{r.excerpt}</q>{" "}
                                <span className="muted">
                                  {r.importance} · {r.id}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <p>
                        <strong>Eligibility:</strong>{" "}
                        {match.job.eligibility.noSponsorship === true
                          ? "Fixture explicitly says no sponsorship."
                          : "Sponsorship unknown."}{" "}
                        {match.job.eligibility.advancedDegree === true
                          ? "Fixture explicitly asks for an advanced degree."
                          : "Degree restriction unknown."}{" "}
                        Citizenship unknown. Verify eligibility yourself.
                      </p>
                    </div>
                  </details>
                ))}
              </section>
              <section className="panel field-context">
                <h2>Field context</h2>
                <p>
                  <strong>{view.context.competition}.</strong> Listing counts
                  cannot establish applicant competition.
                </p>
                <p>
                  {view.context.sampleSize} unique synthetic, source-marked-open
                  roles in this path and filter slice. Small illustrative
                  sample; no market inference.
                </p>
                {view.context.sampleSize > 0 ? (
                  <ul>
                    {view.context.tags.map((tag) => (
                      <li key={tag.key}>
                        {
                          {
                            noSponsorship: "Explicit no-sponsorship tag",
                            citizenship: "Explicit citizenship requirement",
                            advancedDegree:
                              "Explicit advanced-degree requirement",
                          }[tag.key]
                        }
                        : {tag.count} of {tag.total}; {tag.unknown} unknown.
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No sample available.</p>
                )}
                <p className="muted">
                  Fixture source: {view.catalogVersion} · checked{" "}
                  {date(view.context.checkedAt ?? "2026-09-18")}.
                </p>
              </section>
              <section className="panel">
                <h2>Learning and people</h2>
                <p>
                  Browse official starting points. Costs, prerequisites and
                  availability can change; a link does not promise enrolment or
                  a mentor.
                </p>
                <fieldset disabled={busy}>
                  <legend>
                    Optional community categories, available to anyone
                  </legend>
                  {(["community", "women"] as const).map((category) => (
                    <label className="checkbox-label" key={category}>
                      <input
                        type="checkbox"
                        checked={view.preferences.inclusion.includes(category)}
                        onChange={(e) =>
                          send({
                            kind: "preferences",
                            preferences: {
                              ...view.preferences,
                              inclusion: e.target.checked
                                ? [...view.preferences.inclusion, category]
                                : view.preferences.inclusion.filter(
                                    (x) => x !== category,
                                  ),
                            },
                          })
                        }
                      />
                      {category === "women"
                        ? "Women-focused mentorship"
                        : "Technology communities"}
                    </label>
                  ))}
                </fieldset>
                <div className="resource-grid">
                  {view.resources.map((resource) => (
                    <article className="resource-card" key={resource.id}>
                      <span className="eyebrow">
                        {resource.kind.replaceAll("_", " ")}
                      </span>
                      <h3>
                        <a href={resource.url} target="_blank" rel="noreferrer">
                          {resource.title} ↗
                        </a>
                      </h3>
                      <p>{resource.claim}</p>
                      <p className="muted">
                        {resource.eligibility}
                        <br />
                        {resource.cost}. {resource.prerequisites}.<br />
                        {resource.region}
                        <br />
                        Checked {date(resource.checkedAt)} · Review expires{" "}
                        {date(resource.expiresAt)}
                      </p>
                      <details>
                        <summary>Source evidence</summary>
                        <blockquote>{resource.excerpt}</blockquote>
                        <a href={resource.url} target="_blank" rel="noreferrer">
                          Official source
                        </a>
                      </details>
                    </article>
                  ))}
                </div>
                {!view.resources.length && (
                  <p className="empty">
                    No reviewed, current resources for this selection. Resource
                    review may be due.
                  </p>
                )}
              </section>
            </div>
          </div>
          <footer>
            <p>
              Demo selections are saved on this local server for up to 30 days
              using an anonymous demo cookie. No real résumé intake, account
              authentication, live job feed or provider calls are enabled.
              Production A/C integration remains pending.
            </p>
            <div className="button-row">
              <button disabled={busy} onClick={() => send({ kind: "reset" })}>
                Reset demo choices
              </button>
              <button disabled={busy} onClick={removeData}>
                Delete demo data
              </button>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
