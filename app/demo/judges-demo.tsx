"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildFields,
  demoCommunities,
  type DemoProfile,
  type DemoField,
  type DemoAction,
} from "./demo-data";

import { demoPeers } from "./demo-peers";

type View = "profile" | "plan" | "saved" | "connect";
type SavedStep = { id: string; completed: boolean };
const views: { id: View; label: string; icon: string }[] = [
  { id: "profile", label: "Your story", icon: "▤" },
  { id: "plan", label: "Career plan", icon: "✧" },
  { id: "saved", label: "Saved steps", icon: "✓" },
  { id: "connect", label: "Connect", icon: "♧" },
];

export function JudgesDemo({
  profile,
  signIn,
}: {
  profile: DemoProfile;
  signIn: ReactNode;
}) {
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
  const dialog = useRef<HTMLDialogElement>(null);
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
      setNotice("Step removed from your plan.");
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
      "Your career plan",
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

  return (
    <div className="jd-shell">
      <a className="jd-skip" href="#demo-content">
        Skip to workspace content
      </a>
      <aside className="jd-sidebar">
        <Link className="jd-brand" href="/">
          Employ<span>HER</span>
          <i />
        </Link>
        <div className="jd-workspace-label">YOUR NEXT CHAPTER</div>
        <nav aria-label="Workspace">
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
          <span className="jd-avatar">{profile.initials}</span>
          <div>
            <strong>{profile.name}</strong>
            <small>Your career workspace</small>
          </div>
        </div>
      </aside>

      <div className="jd-body">
        <header className="jd-topbar">
          <span>
            <i /> Your workspace
          </span>
          {signIn}
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
                    : view === "saved"
                      ? "SMALL STEPS. REAL MOMENTUM."
                      : "GROW TOGETHER. GO FURTHER."}
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
                ) : view === "connect" ? (
                  <>
                    Find your <em>people.</em>
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
                    : view === "saved"
                      ? "An achievable plan you can come back to. Pick a step, make progress, and keep going."
                      : "Meet peers exploring similar projects and career directions. A little shared experience can be the start of something great."}
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
                        : index === 2
                          ? "Turn ideas into action"
                          : "Meet peers on a similar path"}
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
                <section className="jd-resume-wrap" aria-label={"Your résumé"}>
                  <div className="jd-document-bar">
                    <span>▤ &nbsp; Your résumé</span>
                    <span>Your profile</span>
                  </div>
                  <div className="jd-paper">
                    <div className="jd-paper-top">
                      <span>{profile.initials}</span>
                      <small>YOUR RÉSUMÉ</small>
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
                      Your experience, in focus.
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
                    résumé.
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
                        disabled={!ready}
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
                  Build my plan <span>↗</span>
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
                          "Showing the plan for " + fields[id].title + ".",
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
                  2 career paths inform this direction
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
                <span>Recommended next steps</span>
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
              <section
                className="jd-community"
                aria-labelledby="community-title"
              >
                <div className="jd-community-heading">
                  <div>
                    <span className="jd-eyebrow">
                      WOMEN LED · COMMUNITY POWERED
                    </span>
                    <h2 id="community-title">
                      Your next chapter has a community.
                    </h2>
                    <p>
                      Meet women building careers in tech. Pick one community
                      and take one small step this week.
                    </p>
                  </div>
                  <span className="jd-community-star" aria-hidden="true">
                    ✳
                  </span>
                </div>
                <div className="jd-community-grid">
                  {demoCommunities.map((community) => (
                    <article className="jd-community-card" key={community.name}>
                      <span className="jd-community-tag">{community.tag}</span>
                      <h3>{community.name}</h3>
                      <p>{community.description}</p>
                      <div className="jd-community-next">
                        <small>YOUR FIRST STEP</small>
                        <p>{community.next}</p>
                      </div>
                      <p className="jd-community-access">{community.access}</p>
                      <a
                        href={community.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {community.link} <span aria-hidden="true">↗</span>
                        <span className="jd-sr-only">
                          {" "}
                          (opens in a new tab)
                        </span>
                      </a>
                    </article>
                  ))}
                </div>
                <p className="jd-community-note">
                  Optional communities to explore · Official pages checked
                  September 19, 2026 · Suggested first steps are curated for
                  this demo.
                </p>
              </section>
              <div className="jd-context-grid">
                <section className="jd-role-section">
                  <div className="jd-section-heading">
                    <h2>Where this could lead</h2>
                    <span>Career directions</span>
                  </div>
                  <p className="jd-subtle">
                    Explore the skills and projects connected to each career
                    direction.
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
                        <strong>Role focus:</strong> {role.requirement}
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
                    Explore my plan ↗
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
                    ? "This plan lasts for this visit only."
                    : "Your plan stays in this browser, including after a refresh."}{" "}
                  Keep building your plan at your own pace.
                </p>
              </div>
            </>
          )}
          {view === "saved" && (
            <div className="jd-bottom-cta">
              <p>Your next step could start with a conversation.</p>
              <button
                className="jd-primary"
                onClick={() => navigate("connect")}
              >
                Meet similar peers <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}
          {view === "connect" && (
            <section aria-label="Similar peer profiles">
              <div className="jd-plan-top">
                <div className="jd-field-picker" aria-label="Peer career field">
                  {(["ml", "software"] as const).map((id) => (
                    <button
                      key={id}
                      aria-pressed={field === id}
                      onClick={() => setField(id)}
                    >
                      {id === "ml"
                        ? "Applied ML & robotics"
                        : "Software engineering"}
                    </button>
                  ))}
                </div>
                <span className="jd-subtle">
                  3 peers with shared project interests
                </span>
              </div>
              <div className="jd-section-heading">
                <div>
                  <span className="jd-eyebrow">
                    FAMILIAR EXPERIENCE. NEW PERSPECTIVES.
                  </span>
                  <h2>People on a similar path</h2>
                </div>
              </div>
              <div className="jd-peer-grid">
                {demoPeers[field].map((peer) => (
                  <article className="jd-peer" key={peer.email}>
                    <div className="jd-peer-avatar" aria-hidden="true">
                      <svg
                        viewBox="0 0 80 80"
                        fill="currentColor"
                        focusable="false"
                      >
                        <circle cx="40" cy="29" r="14" />
                        <path d="M13 76v-8a27 27 0 0 1 54 0v8Z" />
                      </svg>
                    </div>
                    <h3>{peer.name}</h3>
                    <p className="jd-peer-field">{peer.field}</p>
                    <p>{peer.background}</p>
                    <h4>Shared interests</h4>
                    <ul className="jd-peer-tags">
                      {peer.shared.map((skill) => (
                        <li key={skill}>{skill}</li>
                      ))}
                    </ul>
                    <div className="jd-card-next">
                      <small>A CONVERSATION STARTER</small>
                      <p>{peer.goal}</p>
                    </div>
                    <div className="jd-peer-contact">
                      <h4>Contact</h4>
                      <span>{peer.email}</span>
                    </div>
                  </article>
                ))}
              </div>
              <p className="jd-local-note jd-subtle">
                Find common ground through shared projects, interests, and
                career goals.
              </p>
            </section>
          )}
          <footer className="jd-footer">
            <span>
              EmployHER <i /> More possibilities, one step at a time.
            </span>
            <span>Your story. Your direction. Your next chapter.</span>
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
                FROM {profile.name.split(" ")[0].toUpperCase()}’S RÉSUMÉ
              </small>
              <blockquote>{detail.evidence}</blockquote>
              <small>CONNECTED CAREER SKILLS</small>
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
    </div>
  );
}
