"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  fields,
  sampleProfile as profile,
  type DemoField,
  type DemoAction,
} from "./demo-data";

type View = "profile" | "plan" | "saved";
type SavedStep = { id: string; completed: boolean };
const storageKey = "employher-judges-demo-v1";
const allActions = Object.values(fields).flatMap((field) => field.actions);
const views: { id: View; label: string; icon: string }[] = [
  { id: "profile", label: "Your story", icon: "▤" },
  { id: "plan", label: "Career plan", icon: "✧" },
  { id: "saved", label: "Saved steps", icon: "✓" },
];

export function JudgesDemo() {
  const [view, setView] = useState<View>("profile");
  const [field, setField] = useState<DemoField>("ml");
  const [saved, setSaved] = useState<SavedStep[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [hasTesting, setHasTesting] = useState(false);
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
        setReviewed(value.reviewed === true);
        setHasTesting(value.hasTesting === true);
      }
    } catch {
      setStorageUnavailable(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ field, saved, reviewed, hasTesting }),
      );
    } catch {
      setStorageUnavailable(true);
    }
  }, [field, saved, reviewed, hasTesting, ready]);
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
  function reset() {
    setSaved([]);
    setField("ml");
    setReviewed(false);
    setHasTesting(false);
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
        </div>
        <div className="jd-person">
          <span className="jd-avatar">MC</span>
          <div>
            <strong>Maya Chen</strong>
            <small>Fictional student profile</small>
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
                  ? "A LITTLE EXPERIENCE. A LOT OF POSSIBILITY."
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
                    Your next chapter, <em>Maya.</em>
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
                <section className="jd-resume-wrap" aria-label="Sample résumé">
                  <div className="jd-document-bar">
                    <span>▤ &nbsp; maya-chen-sample.pdf</span>
                    <span>1 page · Sample</span>
                  </div>
                  <div className="jd-paper">
                    <div className="jd-paper-top">
                      <span>MC</span>
                      <small>THE SAMPLE RÉSUMÉ</small>
                    </div>
                    <h2>{profile.name}</h2>
                    <p>Curious about data. Excited to build.</p>
                    <h3>EDUCATION</h3>
                    <strong>{profile.school}</strong>
                    <p>
                      {profile.degree} · Expected {profile.graduation}
                    </p>
                    <h3>PROJECTS & EXPERIENCE</h3>
                    <h4>Campus energy project</h4>
                    <p>
                      Compared three classifiers using Python and scikit-learn.
                      Cleaned and explored energy data with pandas.
                    </p>
                    <h4>Study-group finder</h4>
                    <p>
                      Built a React app backed by SQL. Collaborated with three
                      classmates using Git branches and pull requests.
                    </p>
                    <h3>TECHNICAL SKILLS</h3>
                    <div className="jd-resume-skills">
                      {profile.skills.join(" / ")}
                    </div>
                    <div className="jd-paper-foot">
                      A fictional profile, made for this demo.
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
                    These sample insights connect directly to Maya’s résumé.
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
                      Have you also written automated tests? Missing from the
                      résumé doesn’t mean missing from your experience.
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        checked={hasTesting}
                        onChange={(event) =>
                          setHasTesting(event.target.checked)
                        }
                      />{" "}
                      Add testing as sample self-reported experience
                    </label>
                    {hasTesting && (
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
                          ? "Data science & ML"
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
                        ? "Data science & ML"
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
                    {hasTesting
                      ? "You also added testing experience. Use it as a foundation and show a concrete example."
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
              <div className="jd-section-heading">
                <div>
                  <p className="jd-eyebrow">
                    A PLAN THAT FITS YOUR NEXT CHAPTER
                  </p>
                  <h2>Three ways to move forward</h2>
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
                    <div className="jd-effort">◷ &nbsp; {action.effort}</div>
                    <button
                      className="jd-evidence-link"
                      onClick={() => setDetail(action)}
                    >
                      Why this step? <span>↗</span>
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
                        Confirm dates, location, and eligibility against an
                        actual listing before applying.
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
                  <small>SAMPLE RÉSUMÉ REWRITE</small>
                  <blockquote>
                    {field === "ml"
                      ? "“Compared three classifiers for a campus energy project using Python and scikit-learn.”"
                      : "“Built a React study-group finder with SQL-backed course and meeting data; collaborated through Git pull requests.”"}
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
              Synthetic résumé · Illustrative requirements · Demo only
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
              <small>FROM MAYA’S SAMPLE RÉSUMÉ</small>
              <blockquote>{detail.evidence}</blockquote>
              <small>CONNECTED SAMPLE REQUIREMENT</small>
              <p>{detail.source}</p>
            </div>
            <h3>Make it happen</h3>
            <ol>
              {detail.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
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
