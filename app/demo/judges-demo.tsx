"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildFields,
  type DemoProfile,
  type DemoField,
  type DemoAction,
} from "./demo-data";

type View = "profile" | "plan" | "saved";
type SavedStep = { id: string; completed: boolean };
const views: { id: View; label: string; icon: string }[] = [
  { id: "profile", label: "Your story", icon: "▤" },
  { id: "plan", label: "Career plan", icon: "✧" },
  { id: "saved", label: "Saved steps", icon: "✓" },
];

export function JudgesDemo({ profile }: { profile: DemoProfile }) {
  const fields = useMemo(() => buildFields(profile), [profile]);
  const allActions = useMemo(
    () => Object.values(fields).flatMap((field) => field.actions),
    [fields],
  );
  const storageKey = `employher-judges-demo-v2-${profile.id}`;
  const [taskChecks, setTaskChecks] = useState<Record<string, number[]>>({});
  const [view, setView] = useState<View>("profile");
  const [field, setField] = useState<DemoField>("ml");
  const [saved, setSaved] = useState<SavedStep[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [hasPublicDemo, setHasPublicDemo] = useState(false);
  const [detail, setDetail] = useState<DemoAction | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = fields[field];

  // Restore browser-only state after hydration, keeping the server render stable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const value = JSON.parse(raw);
        if (value.field === "ml" || value.field === "software")
          setField(value.field);
        if (Array.isArray(value.saved)) {
          const ids = new Set<string>();
          setSaved(
            value.saved
              .filter((step: SavedStep) => {
                if (
                  !step ||
                  typeof step.completed !== "boolean" ||
                  ids.has(step.id) ||
                  !allActions.some((action) => action.id === step.id)
                )
                  return false;
                ids.add(step.id);
                return true;
              })
              .slice(0, 3),
          );
        }
        if (value.taskChecks && typeof value.taskChecks === "object") {
          const restored: Record<string, number[]> = {};
          for (const action of allActions) {
            const indexes = value.taskChecks[action.id];
            if (Array.isArray(indexes))
              restored[action.id] = [
                ...new Set(
                  indexes.filter(
                    (index: unknown): index is number =>
                      typeof index === "number" &&
                      Number.isInteger(index) &&
                      index >= 0 &&
                      index < action.steps.length,
                  ),
                ),
              ];
          }
          setTaskChecks(restored);
        }
        setReviewed(value.reviewed === true);
        setHasPublicDemo(value.hasPublicDemo === true);
      }
    } catch {
      setStorageUnavailable(true);
    }
    setReady(true);
  }, [allActions, storageKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ field, saved, reviewed, hasPublicDemo, taskChecks }),
      );
    } catch {
      setStorageUnavailable(true);
    }
  }, [field, saved, reviewed, hasPublicDemo, taskChecks, ready, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (detail) dialog.current?.showModal();
  }, [detail]);
  useEffect(() => {
    if (resetOpen) resetDialog.current?.showModal();
  }, [resetOpen]);

  function navigate(next: View) {
    setView(next);
    setNotice("");
    requestAnimationFrame(() => {
      heading.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  function save(action: DemoAction) {
    if (saved.some((step) => step.id === action.id)) {
      setSaved(saved.filter((step) => step.id !== action.id));
      setNotice("Step removed from your sample plan.");
    } else if (saved.length >= 3) {
      setNotice(
        "Keep it achievable: save up to three steps. Remove a saved step to make room.",
      );
    } else {
      setSaved([...saved, { id: action.id, completed: false }]);
      setNotice("Step saved. Find it in Saved steps.");
    }
  }
  function exportPlan() {
    const chosen = saved.map((item) =>
      allActions.find((action) => action.id === item.id)!,
    );
    const text = [
      "EmployHER — my next steps",
      profile.local
        ? "Local résumé preview. Recommendations are curated examples."
        : "Synthetic demo profile. Recommendations are curated examples.",
      ...chosen.map((action) =>
        [
          action.title,
          action.timing + " · " + action.effort,
          "FIRST SESSION: " + action.firstSession,
          ...action.steps.map(
            (step, index) =>
              `${(taskChecks[action.id] ?? []).includes(index) ? "[x]" : "[ ]"} ${step}`,
          ),
          "DELIVERABLES:",
          ...action.artifacts.map(
            (artifact) => artifact.name + ": " + artifact.detail,
          ),
          "DONE WHEN:",
          ...action.done,
          "REFERENCE: " + action.resource.url,
        ].join("\n"),
      ),
    ].join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "employher-next-steps.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Plan downloaded with tasks, deliverables, and references.");
  }
  function reset() {
    setSaved([]);
    setTaskChecks({});
    setField("ml");
    setReviewed(false);
    setHasPublicDemo(false);
    setResetOpen(false);
    resetDialog.current?.close();
    navigate("profile");
    setNotice("Demo reset. Ready for a new walkthrough.");
  }

  return (
    <div className="jd-shell">
      <a className="jd-skip" href="#demo-content">
        Skip to demo content
      </a>
      <aside className="jd-sidebar">
        <Link className="jd-brand" href="/">
          Employ<span>HER</span>
          <i />
        </Link>
        <div className="jd-workspace-label">YOUR NEXT CHAPTER</div>
        <nav aria-label="Demo workspace">
          {views.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "is-active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.id === "saved" && <b>{saved.length}</b>}
            </button>
          ))}
        </nav>
        <div className="jd-sidebar-note">
          <span aria-hidden="true">✳</span>
          <p>You don’t need to have it all figured out.</p>
          <small>Just a next step that feels like you.</small>
          <Link className="jd-personal-entry" href="/onboarding">
            Build a plan with my résumé →
          </Link>
        </div>
        <div className="jd-person">
          <span className="jd-avatar">{profile.initials}</span>
          <div>
            <strong>{profile.name}</strong>
            <small>
              {profile.local
                ? "Provided résumé · local only"
                : "Fictional student profile"}
            </small>
          </div>
        </div>
      </aside>

      <div className="jd-body">
        <header className="jd-topbar">
          <span>
            <i /> Interactive sample
          </span>
          <p>Hard-coded examples · No live AI or account</p>
          <button onClick={() => setResetOpen(true)}>
            Reset demo <span aria-hidden="true">↺</span>
          </button>
        </header>
        <main id="demo-content" className="jd-main">
          <div className="jd-breadcrumb">
            MY WORKSPACE <span>/</span>{" "}
            {views.find((item) => item.id === view)?.label.toUpperCase()}
          </div>
          <div className="jd-page-heading">
            <div>
              <p className="jd-eyebrow">
                {view === "profile"
                  ? "BUILD ON THE EXPERIENCE YOU ALREADY HAVE."
                  : view === "plan"
                    ? "BUILT AROUND WHAT YOU ALREADY BRING"
                    : "SMALL STEPS. REAL MOMENTUM."}
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {view === "profile" ? (
                  <>
                    Your story starts <em>here.</em>
                  </>
                ) : view === "plan" ? (
                  <>
                    Your next chapter, <em>{profile.name.split(" ")[0]}.</em>
                  </>
                ) : (
                  <>
                    Make room for <em>what’s next.</em>
                  </>
                )}
              </h1>
              <p className="jd-intro">
                {view === "profile"
                  ? "There’s more in your résumé than a list of skills. Let’s connect it to where you want to go."
                  : view === "plan"
                    ? selected.description
                    : "An achievable plan you can come back to. Pick a step, make progress, and keep going."}
              </p>
            </div>
            <span className="jd-heading-star" aria-hidden="true">
              ✳
            </span>
          </div>

          <ol className="jd-journey" aria-label="Your journey">
            {views.map((item, index) => (
              <li key={item.id}>
                <button
                  aria-current={view === item.id ? "step" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <span>{index === 0 && reviewed ? "✓" : `0${index + 1}`}</span>
                  <strong>{item.label}</strong>
                  <small>
                    {index === 0
                      ? "Recognize your strengths"
                      : index === 1
                        ? "Explore your direction"
                        : "Turn ideas into action"}
                  </small>
                </button>
              </li>
            ))}
          </ol>
          <div
            role="status"
            className={`jd-notice ${notice ? "jd-notice-visible" : ""}`}
          >
            {notice}
          </div>
          {storageUnavailable && (
            <p className="jd-storage-note">
              Browser storage is unavailable. You can still explore; changes
              will last for this visit only.
            </p>
          )}

          {view === "profile" && (
            <>
              <div className="jd-profile-grid">
                <section
                  className="jd-resume-wrap"
                  aria-label={
                    profile.local ? "Provided résumé" : "Sample résumé"
                  }
                >
                  <div className="jd-document-bar">
                    <span>
                      ▤ &nbsp;{" "}
                      {profile.local
                        ? "Provided résumé · selected evidence"
                        : "Fictional résumé · selected evidence"}
                    </span>
                    <span>
                      {profile.local ? "Local preview" : "Demo profile"}
                    </span>
                  </div>
                  <div className="jd-paper">
                    <div className="jd-paper-top">
                      <span>{profile.initials}</span>
                      <small>
                        {profile.local
                          ? "PROVIDED RÉSUMÉ"
                          : "THE SAMPLE RÉSUMÉ"}
                      </small>
                    </div>
                    <h2>{profile.name}</h2>
                    <p>{profile.summary}</p>
                    <h3>EDUCATION</h3>
                    <strong>{profile.school}</strong>
                    <p>
                      {profile.degree} · Expected {profile.graduation}
                    </p>
                    <h3>PROJECTS & EXPERIENCE</h3>
                    {profile.projects.map((project) => (
                      <div key={project.title}>
                        <h4>{project.title}</h4>
                        <p>{project.description}</p>
                      </div>
                    ))}
                    <h3>TECHNICAL SKILLS</h3>
                    <div className="jd-resume-skills">
                      {profile.skills.join(" / ")}
                    </div>
                    <div className="jd-paper-foot">
                      {profile.local
                        ? "Selected résumé evidence. Contact details omitted."
                        : "A fictional profile, made for this demo."}
                    </div>
                  </div>
                </section>
                <section className="jd-evidence">
                  <div className="jd-section-kicker">
                    <span>✧</span> THE STRENGTHS IN YOUR STORY
                  </div>
                  <h2>
                    You’re not starting
                    <br />
                    from zero.
                  </h2>
                  <p className="jd-subtle">
                    These insights connect to {profile.name.split(" ")[0]}’s{" "}
                    {profile.local ? "provided" : "sample"} résumé.
                  </p>
                  {profile.evidence.map((fact, i) => (
                    <article className="jd-evidence-item" key={fact.title}>
                      <span className="jd-evidence-number">0{i + 1}</span>
                      <div>
                        <h3>{fact.title}</h3>
                        <p>{fact.detail}</p>
                        <span className="jd-source-tag">↳ {fact.tag}</span>
                      </div>
                    </article>
                  ))}
                  <div className="jd-clarification">
                    <strong>Your résumé doesn’t tell the whole story.</strong>
                    <p>
                      Is there already a shareable project demo? Your résumé
                      shows testing experience; the question now is what a
                      reviewer can inspect.
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        checked={hasPublicDemo}
                        onChange={(event) =>
                          setHasPublicDemo(event.target.checked)
                        }
                      />{" "}
                      I have a shareable demo (self-reported)
                    </label>
                    {hasPublicDemo && (
                      <small>
                        Added as self-reported, separate from résumé evidence.
                      </small>
                    )}
                  </div>
                </section>
              </div>
              <section className="jd-profile-cta">
                <div>
                  <span className="jd-eyebrow">YOU CHOOSE THE DIRECTION</span>
                  <h2>What would you like to explore?</h2>
                  <div
                    className="jd-field-picker"
                    aria-label="Field of interest"
                  >
                    {(["ml", "software"] as const).map((id) => (
                      <button
                        key={id}
                        aria-pressed={field === id}
                        onClick={() => setField(id)}
                      >
                        {id === "ml"
                          ? "Applied ML & robotics"
                          : "Software engineering"}
                        <span>{field === id ? "✓" : "+"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="jd-primary"
                  disabled={!ready}
                  onClick={() => {
                    setReviewed(true);
                    navigate("plan");
                  }}
                >
                  Build my sample plan <span>↗</span>
                </button>
              </section>
            </>
          )}

          {view === "plan" && (
            <>
              <div className="jd-plan-top">
                <div className="jd-field-picker" aria-label="Career field">
                  {(["ml", "software"] as const).map((id) => (
                    <button
                      key={id}
                      aria-pressed={field === id}
                      onClick={() => {
                        setField(id);
                        setNotice(
                          "Showing the sample plan for " +
                            fields[id].title +
                            ".",
                        );
                      }}
                    >
                      {id === "ml"
                        ? "Applied ML & robotics"
                        : "Software engineering"}
                    </button>
                  ))}
                </div>
                <span className="jd-subtle">
                  2 sample roles inform this direction
                </span>
              </div>
              <section className="jd-insight">
                <div className="jd-insight-icon" aria-hidden="true">
                  ✧
                </div>
                <div>
                  <span className="jd-eyebrow">YOUR STARTING POINT</span>
                  <h2>{selected.signal}</h2>
                  <p>
                    {hasPublicDemo
                      ? "You have a shareable demo. Use it as a starting point; update it with the evaluation and failure cases below."
                      : "We see evidence to build on. These suggestions are possibilities, not a list of skills you lack."}
                  </p>
                </div>
                <div className="jd-insight-art" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <span>↗</span>
                </div>
              </section>
              <section className="jd-target">
                <div>
                  <span className="jd-eyebrow">
                    DIRECTIONS WORTH INVESTIGATING
                  </span>
                  <h2>{selected.target}</h2>
                  <p>{selected.timing}</p>
                </div>
                <span className="jd-target-badge">
                  Build on your existing work
                </span>
              </section>
              <section
                className="jd-roadmap"
                aria-label="Suggested work sequence"
              >
                {selected.actions.map((action, index) => (
                  <button key={action.id} onClick={() => setDetail(action)}>
                    <span>0{index + 1}</span>
                    <div>
                      <small>{action.timing}</small>
                      <strong>{action.title}</strong>
                    </div>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </section>
              <div className="jd-section-heading">
                <div>
                  <p className="jd-eyebrow">
                    A PLAN THAT FITS YOUR NEXT CHAPTER
                  </p>
                  <h2>Your next 10 days, made concrete</h2>
                </div>
                <span>Curated sample recommendations</span>
              </div>
              <div className="jd-action-grid">
                {selected.actions.map((action, index) => (
                  <article className="jd-action" key={action.id}>
                    <div className="jd-action-top">
                      <span className={`jd-kind jd-kind-${index}`}>
                        {action.kind}
                      </span>
                      <span>0{index + 1}</span>
                    </div>
                    <h3>{action.title}</h3>
                    <p>{action.why}</p>
                    <div className="jd-deliverable">
                      <small>YOU’LL WALK AWAY WITH</small>
                      <p>{action.deliverable}</p>
                    </div>
                    <div className="jd-card-next">
                      <small>DO THIS FIRST</small>
                      <p>{action.firstSession}</p>
                    </div>
                    <div className="jd-effort">◷ &nbsp; {action.effort}</div>
                    <small className="jd-order">{action.timing}</small>
                    <button
                      className="jd-evidence-link"
                      onClick={() => setDetail(action)}
                    >
                      Open the work plan <span>↗</span>
                    </button>
                    <button
                      disabled={!ready}
                      className={`jd-save ${saved.some((step) => step.id === action.id) ? "is-saved" : ""}`}
                      aria-pressed={saved.some((step) => step.id === action.id)}
                      onClick={() => save(action)}
                    >
                      {saved.some((step) => step.id === action.id)
                        ? "✓ Saved to my steps"
                        : "+ Save this step"}
                    </button>
                  </article>
                ))}
              </div>
              <div className="jd-context-grid">
                <section className="jd-role-section">
                  <div className="jd-section-heading">
                    <h2>Where this could lead</h2>
                    <span>Illustrative roles</span>
                  </div>
                  <p className="jd-subtle">
                    A little context for your plan. These are sample
                    requirements, not live openings or eligibility decisions.
                  </p>
                  {selected.roles.map((role, index) => (
                    <details className="jd-role" key={role.title}>
                      <summary>
                        <span className="jd-role-icon">
                          {index === 0 ? "⌘" : "⌁"}
                        </span>
                        <span>
                          <strong>{role.title}</strong>
                          <small>{role.overlap}</small>
                        </span>
                        <span aria-hidden="true">+</span>
                      </summary>
                      <p>
                        <strong>Sample requirement:</strong> {role.requirement}
                      </p>
                      <p>
                        <strong>Search to start with:</strong>{" "}
                        <code>{role.query}</code>
                      </p>
                      <p>
                        <strong>Check before applying:</strong> {role.check}
                      </p>
                    </details>
                  ))}
                </section>
                <section className="jd-resume-tip">
                  <span className="jd-eyebrow">LET YOUR EXPERIENCE SPEAK</span>
                  <h2>
                    A stronger story.
                    <br />
                    Still entirely yours.
                  </h2>
                  <small>EVIDENCE-BACKED RÉSUMÉ BULLET</small>
                  <blockquote>
                    {field === "ml"
                      ? profile.researchBullet
                      : profile.softwareBullet}
                  </blockquote>
                  <p>
                    No invented outcomes. No inflated numbers. Just a clearer
                    description of the work.
                  </p>
                  <button onClick={() => navigate("profile")}>
                    Review the original evidence ↗
                  </button>
                </section>
              </div>
              <div className="jd-bottom-cta">
                <p>A good plan starts with one small commitment.</p>
                <button
                  className="jd-primary"
                  onClick={() => navigate("saved")}
                >
                  See my saved steps <span>↗</span>
                </button>
              </div>
            </>
          )}

          {view === "saved" && (
            <>
              <section className="jd-progress">
                <div>
                  <span className="jd-eyebrow">YOUR PERSONAL ACTION LIST</span>
                  <h2>
                    {saved.filter((step) => step.completed).length} of{" "}
                    {saved.length} steps completed
                  </h2>
                  <p>
                    Progress records your actions. It doesn’t automatically add
                    skills to your résumé.
                  </p>
                </div>
                <div
                  className="jd-progress-track"
                  role="progressbar"
                  aria-label="Saved steps completed"
                  aria-valuemin={0}
                  aria-valuemax={saved.length || 1}
                  aria-valuenow={saved.filter((step) => step.completed).length}
                >
                  <span
                    style={{
                      width: `${saved.length ? (saved.filter((step) => step.completed).length / saved.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </section>
              {!saved.length ? (
                <section className="jd-empty">
                  <span aria-hidden="true">✧</span>
                  <h2>Your next step is yours to choose.</h2>
                  <p>
                    Save up to three recommendations from your career plan.
                    <br />
                    Start with the one you’re most curious about.
                  </p>
                  <button
                    className="jd-primary"
                    onClick={() => navigate("plan")}
                  >
                    Explore my sample plan ↗
                  </button>
                </section>
              ) : (
                <div className="jd-saved-list">
                  {saved.map((step) => {
                    const action = allActions.find(
                      (item) => item.id === step.id,
                    )!;
                    return (
                      <article
                        className={
                          step.completed
                            ? "jd-saved-card is-complete"
                            : "jd-saved-card"
                        }
                        key={step.id}
                      >
                        <label className="jd-complete">
                          <input
                            type="checkbox"
                            checked={step.completed}
                            aria-label={`Mark ${action.title} complete`}
                            onChange={() => {
                              setSaved(
                                saved.map((item) =>
                                  item.id === step.id
                                    ? { ...item, completed: !item.completed }
                                    : item,
                                ),
                              );
                              setNotice(
                                step.completed
                                  ? "Step marked as in progress."
                                  : "Step completed. Nice work taking that next step.",
                              );
                            }}
                          />
                          <span aria-hidden="true">✓</span>
                        </label>
                        <div>
                          <span className="jd-eyebrow">
                            {step.completed
                              ? "COMPLETED"
                              : action.kind + " · " + action.effort}
                          </span>
                          <h2>{action.title}</h2>
                          <p>{action.deliverable}</p>
                          <button
                            className="jd-evidence-link"
                            onClick={() => setDetail(action)}
                          >
                            Open step-by-step guide ↗
                          </button>
                        </div>
                        <button
                          className="jd-remove"
                          aria-label={`Remove ${action.title}`}
                          onClick={() => save(action)}
                        >
                          Remove
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
              {saved.length > 0 && (
                <button className="jd-primary jd-export" onClick={exportPlan}>
                  Download my detailed plan ↓
                </button>
              )}
              <div className="jd-local-note">
                <span aria-hidden="true">↳</span>
                <p>
                  {storageUnavailable
                    ? "This sample plan lasts for this visit only."
                    : "Your sample plan stays in this browser, including after a refresh."}{" "}
                  Reset demo clears the sample choices. Nothing is sent to
                  Gemini, Backboard, or an account.
                </p>
              </div>
            </>
          )}
          <footer className="jd-footer">
            <span>
              EmployHER <i /> More possibilities, one step at a time.
            </span>
            <span>
              {profile.local
                ? "Provided résumé · Local preview"
                : "Synthetic résumé"}{" "}
              · Illustrative requirements · Demo only
            </span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="jd-dialog"
        onClose={() => setDetail(null)}
        aria-labelledby="step-title"
      >
        {detail && (
          <>
            <div className="jd-dialog-top">
              <span className="jd-eyebrow">
                THE REASON BEHIND THE RECOMMENDATION
              </span>
              <button
                autoFocus
                aria-label="Close step details"
                onClick={() => dialog.current?.close()}
              >
                ✕
              </button>
            </div>
            <h2 id="step-title">{detail.title}</h2>
            <p>{detail.why}</p>
            <div className="jd-dialog-evidence">
              <small>
                FROM {profile.name.split(" ")[0].toUpperCase()}’S{" "}
                {profile.local ? "PROVIDED" : "SAMPLE"} RÉSUMÉ
              </small>
              <blockquote>{detail.evidence}</blockquote>
              <small>CONNECTED SAMPLE REQUIREMENT</small>
              <p>{detail.source}</p>
            </div>
            <div className="jd-first-session">
              <span className="jd-eyebrow">YOUR FIRST WORK SESSION</span>
              <p>{detail.firstSession}</p>
            </div>
            <h3>Make it happen</h3>
            <p className="jd-task-count">
              {(taskChecks[detail.id] ?? []).length} of {detail.steps.length}{" "}
              tasks checked ·{" "}
              {storageUnavailable ? "this visit only" : "saved in this browser"}
            </p>
            <ol className="jd-task-list">
              {detail.steps.map((step, index) => (
                <li key={step}>
                  <label>
                    <input
                      type="checkbox"
                      checked={(taskChecks[detail.id] ?? []).includes(index)}
                      onChange={() =>
                        setTaskChecks((current) => {
                          const checked = current[detail.id] ?? [];
                          return {
                            ...current,
                            [detail.id]: checked.includes(index)
                              ? checked.filter((item) => item !== index)
                              : [...checked, index],
                          };
                        })
                      }
                    />
                    <span>{step}</span>
                  </label>
                </li>
              ))}
            </ol>
            <h3>What to put in your portfolio</h3>
            <div className="jd-artifacts">
              {detail.artifacts.map((artifact) => (
                <div key={artifact.name}>
                  <code>{artifact.name}</code>
                  <p>{artifact.detail}</p>
                </div>
              ))}
            </div>
            <h3>You’re done when</h3>
            <ul className="jd-done-list">
              {detail.done.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
            <div className="jd-worked-example">
              <h3>{detail.example.title}</h3>
              <pre>{detail.example.text}</pre>
            </div>
            <div className="jd-resource">
              <span className="jd-eyebrow">
                USE THIS REFERENCE FOR THIS TASK
              </span>
              <a href={detail.resource.url} target="_blank" rel="noreferrer">
                {detail.resource.title} ↗
              </a>
              <p>{detail.resource.use}</p>
              <small>Official documentation · checked September 19, 2026</small>
            </div>
            <p className="jd-subtle">
              This is a hard-coded example, not a live AI response. It does not
              establish a missing skill or job eligibility.
            </p>
            <button
              className="jd-primary"
              onClick={() => {
                save(detail);
                dialog.current?.close();
              }}
            >
              {saved.some((step) => step.id === detail.id)
                ? "Remove saved step"
                : "Save this step"}
            </button>
          </>
        )}
      </dialog>
      <dialog
        ref={resetDialog}
        className="jd-dialog jd-reset-dialog"
        onClose={() => setResetOpen(false)}
        aria-labelledby="reset-title"
      >
        <h2 id="reset-title">Start a fresh walkthrough?</h2>
        <p>
          This clears saved steps, progress, and sample profile choices in this
          browser.
        </p>
        <div className="jd-dialog-buttons">
          <button autoFocus onClick={() => resetDialog.current?.close()}>
            Keep exploring
          </button>
          <button className="jd-primary" onClick={reset}>
            Reset sample
          </button>
        </div>
      </dialog>
    </div>
  );
}
