"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  Fact,
  PublicProfile,
  ResumeSuggestion,
} from "@/profile/contracts";
import { resumeFixtures, demoPaths } from "@/profile/fixtures";
import { reconcileAfterSessionRecovery } from "@/profile/recovery";

type Edit = Pick<Fact, "id" | "kind" | "label" | "detail" | "dateText">;
class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error?.code ?? "UNKNOWN",
      result.error?.message ?? "The request failed. Please retry.",
    );
  return result;
}
const editsFor = (profile: PublicProfile): Edit[] =>
  profile.facts.map(({ id, kind, label, detail, dateText }) => ({
    id,
    kind,
    label,
    detail,
    dateText,
  }));

export function ProfileWorkspace({
  localDemo,
  liveGemini,
  authenticated = false,
}: {
  localDemo: boolean;
  liveGemini: boolean;
  authenticated?: boolean;
}) {
  const baseUrl = localDemo ? "/api/demo/resumes" : "/api/resumes";
  const profileStorageKey = localDemo ? "profile-id" : "private-profile-id";
  const [session, setSession] = useState(authenticated);
  const [sessionExpired, setSessionExpired] = useState(false);
  const pristineRef = useRef<Edit[]>([]);
  const capturedInputRef = useRef("");
  const requestKeys = useRef(new Map<string, string>());
  function stableKey(intent: string) {
    const existing = requestKeys.current.get(intent);
    if (existing) return existing;
    const key = crypto.randomUUID();
    requestKeys.current.set(intent, key);
    return key;
  }
  const [text, setText] = useState(resumeFixtures[0].text);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"sample" | "text" | "pdf">("sample");
  const [sampleId, setSampleId] = useState(resumeFixtures[0].id);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [newKind, setNewKind] = useState<Fact["kind"]>("skill");
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pathId, setPathId] = useState("data");
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[] | null>(
    null,
  );
  const [decisions, setDecisions] = useState<
    Record<string, "accepted" | "dismissed">
  >({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  function inputSignature() {
    return mode === "pdf"
      ? `pdf:${file?.name ?? ""}:${file?.size ?? 0}:${file?.lastModified ?? 0}`
      : `${mode}:${sampleId}:${text}`;
  }
  function showProfile(next: PublicProfile) {
    setProfile(next);
    setEdits(editsFor(next));
    setSuggestions(null);
    setDirty(false);
    setDecisions({});
    setDrafts({});
    sessionStorage.setItem(profileStorageKey, next.profileId);
  }
  useEffect(() => {
    const id = sessionStorage.getItem(profileStorageKey);
    if (id)
      void api<PublicProfile>(`${baseUrl}/${id}`)
        .then((p) => {
          showProfile(p);
          pristineRef.current = editsFor(p);
          capturedInputRef.current = inputSignature();
          setSession(true);
        })
        .catch(() => {
          sessionStorage.removeItem(profileStorageKey);
          setNotice(
            "The previous sample session is unavailable. Start a new one.",
          );
        });
    // Runs once on mount against the initial mode/sampleId/text state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function run(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
        setSession(false);
        setSessionExpired(true);
        setSuggestions(null);
        setNotice(
          profile
            ? "Your sample session expired. Your in-progress edits are kept — start a new session to continue."
            : "Your sample session expired. Start a new one to continue.",
        );
      } else {
        setError(e instanceof Error ? e.message : "Please retry.");
      }
    } finally {
      setBusy("");
    }
  }
  function edit(index: number, patch: Partial<Edit>) {
    setEdits((previous) =>
      previous.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
    setDirty(true);
    setSuggestions(null);
  }
  async function performExtraction(): Promise<PublicProfile> {
    const headers: Record<string, string> = {};
    let body: BodyInit;
    if (mode === "pdf") {
      if (!file) throw new Error("Choose a sample PDF first.");
      if (file.size > 2 * 1024 * 1024)
        throw new Error("PDFs must be 2 MB or smaller.");
      const form = new FormData();
      form.set("file", file);
      body = form;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ text });
    }
    const content =
      mode === "pdf"
        ? await file!.arrayBuffer()
        : new TextEncoder().encode(text);
    const fingerprint = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", content)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const intent = `intake:${mode}:${fingerprint}`;
    headers["Idempotency-Key"] = stableKey(intent);
    const next = await api<PublicProfile>(baseUrl, {
      method: "POST",
      headers,
      body,
    });
    requestKeys.current.delete(intent);
    return next;
  }
  async function extract() {
    await run("Reading the résumé…", async () => {
      const next = await performExtraction();
      pristineRef.current = editsFor(next);
      capturedInputRef.current = inputSignature();
      showProfile(next);
      setNotice("Draft ready. Check every fact before confirming.");
    });
  }
  async function recoverAfterExpiry() {
    const pendingEdits = edits;
    const next = await performExtraction();
    const reconciled = reconcileAfterSessionRecovery(
      next,
      pristineRef.current,
      pendingEdits,
    );
    pristineRef.current = editsFor(next);
    capturedInputRef.current = inputSignature();
    setProfile(next);
    setEdits(reconciled);
    setSuggestions(null);
    setDecisions({});
    setDrafts({});
    setDirty(true);
    sessionStorage.setItem(profileStorageKey, next.profileId);
    setNotice(
      "Session restored. Your edits were carried over — recheck them before confirming.",
    );
  }
  async function save(confirm: boolean) {
    if (!profile) return;
    await run(
      confirm ? "Confirming and preparing embeddings…" : "Saving your draft…",
      async () => {
        const corrections = edits.map((f) => ({
          ...f,
          ...(f.id.startsWith("new-") ? { id: undefined } : {}),
        }));
        const payload = JSON.stringify({
          expectedVersion: profile.version,
          corrections,
          confirm,
        });
        const intent = `update:${profile.profileId}:${payload}`;
        const next = await api<PublicProfile>(
          `${baseUrl}/${profile.profileId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": stableKey(intent),
            },
            body: payload,
          },
        );
        requestKeys.current.delete(intent);
        showProfile(next);
        setNotice(
          confirm
            ? "Profile confirmed. Changes have invalidated earlier profile-based results."
            : "Draft saved. Confirm again when you are ready.",
        );
      },
    );
  }
  const sourceFor = (f: Edit) => {
    const original = profile?.facts.find((old) => old.id === f.id);
    return original &&
      ["kind", "label", "detail", "dateText"].every(
        (k) => original[k as keyof Fact] === f[k as keyof Edit],
      )
      ? original.evidence
      : { source: "user_reported" as const };
  };
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          employ<span>HER</span>
          <span className="brand-dot">✳</span>
        </Link>
        <span className="header-caption">A little clarity. A next step.</span>
        <span className="pill">PROFILE WORKSPACE</span>
      </header>
      <main className="profile-workspace">
        <div className="eyebrow">01 / KNOW YOUR STARTING POINT</div>
        <section className="hero">
          <div>
            <h1>
              You bring more
              <br />
              than you think.
            </h1>
            <p>
              Projects, coursework, community work. Start with what you’ve done,
              then make sure the story is yours.
            </p>
          </div>
          <div className="hero-note">
            <span>YOUR EXPERIENCE, IN YOUR WORDS</span>
            <p>
              Not on your résumé
              <br />
              doesn’t mean you
              <br />
              <em>can’t do it.</em>
            </p>
          </div>
        </section>
        <ol className="profile-steps">
          <li className="active">
            <b>1</b> Bring your experience
          </li>
          <li className={profile ? "active" : ""}>
            <b>2</b> Review the evidence
          </li>
          <li
            className={
              profile?.status === "confirmed" && !dirty ? "active" : ""
            }
          >
            <b>3</b> Tell your story
          </li>
        </ol>
        <div className="demo-banner">
          <strong>
            {localDemo
              ? "Local synthetic-data demo"
              : authenticated
                ? "Authenticated integration — supplied samples only"
                : "Integration required"}
          </strong>
          <span>
            {localDemo
              ? liveGemini
                ? "Gemini processes approved samples only. Edited summaries use simulated embeddings. No real résumés."
                : "Extraction and vectors are simulated fixtures. No model calls or real matching."
              : authenticated
                ? "Your account uses database storage and Gemini. Personal uploads remain disabled until release verification."
                : "Sign-in and storage are not connected yet. This preview is available in local sample mode."}
          </span>
        </div>
        {!session && localDemo && (
          <button
            className="button session-button"
            disabled={!!busy}
            onClick={() =>
              run(
                sessionExpired && profile
                  ? "Restoring your session…"
                  : "Starting sample session…",
                async () => {
                  if (
                    sessionExpired &&
                    profile &&
                    inputSignature() !== capturedInputRef.current
                  ) {
                    throw new Error(
                      "Your edits are still here. Restore the original sample/input before recovering this draft.",
                    );
                  }
                  await api("/api/demo/session", { method: "POST" });
                  if (sessionExpired && profile) await recoverAfterExpiry();
                  setSession(true);
                  setSessionExpired(false);
                },
              )
            }
          >
            {sessionExpired && profile
              ? "Start new session and restore my edits"
              : "Start sample session"}
          </button>
        )}
        <div className="feedback" aria-live="polite" aria-atomic="true">
          {busy && <p className="processing">{busy}</p>}
          {notice && <p className="notice">{notice}</p>}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            {profile && (
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() =>
                  run("Reloading…", async () =>
                    showProfile(
                      await api<PublicProfile>(
                        `${baseUrl}/${profile.profileId}`,
                      ),
                    ),
                  )
                }
              >
                Reload saved profile
              </button>
            )}
          </div>
        )}
        <div className="columns">
          <section className="card intake">
            <div className="profile-section-heading">
              <span className="section-number">01</span>
              <h2>Start with a résumé</h2>
            </div>
            <p className="profile-muted">
              Only the supplied samples are accepted in this local demo. They
              are fictional and contain no personal contact information.
            </p>
            <div className="tabs" role="group" aria-label="Résumé input method">
              {(["sample", "text", "pdf"] as const).map((value) => (
                <button
                  key={value}
                  className={mode === value ? "selected" : ""}
                  aria-pressed={mode === value}
                  disabled={!!busy}
                  onClick={() => setMode(value)}
                >
                  {value === "sample"
                    ? "Sample résumé"
                    : value === "text"
                      ? "Paste text"
                      : "Upload PDF"}
                </button>
              ))}
            </div>
            <fieldset disabled={!!busy || !session}>
              {mode === "sample" && (
                <div className="sample-list">
                  {resumeFixtures.map((sample) => (
                    <label
                      key={sample.id}
                      className={`sample-option ${sampleId === sample.id ? "chosen" : ""}`}
                    >
                      <input
                        type="radio"
                        name="sample"
                        checked={sampleId === sample.id}
                        onChange={() => {
                          setSampleId(sample.id);
                          setText(sample.text);
                        }}
                      />
                      <span>
                        <strong>{sample.title}</strong>
                        <small>{sample.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {mode === "text" && (
                <label className="field">
                  Sample résumé text
                  <textarea
                    rows={10}
                    maxLength={20000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <small>
                    {text.length.toLocaleString()} / 20,000 characters. Use the
                    supplied sample text.
                  </small>
                </label>
              )}
              {mode === "pdf" && (
                <div className="upload-box">
                  <span className="upload-icon">↥</span>
                  <label htmlFor="resume-file">
                    Choose a text-based sample PDF
                  </label>
                  <input
                    id="resume-file"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p>Up to 2 MB · 5 pages · no scanned or encrypted PDFs</p>
                  <a href={`/api/demo/fixtures/${sampleId}`}>
                    Download the selected sample PDF
                  </a>
                </div>
              )}
              <button className="button wide" onClick={extract}>
                Review my experience <span>→</span>
              </button>
            </fieldset>
            <p className="privacy-note">
              ↳ Raw files and full text are not saved. The demo stores reviewed
              facts in server memory until restart; production retention and
              login are Person C’s integration.
            </p>
          </section>
          <section className="card review">
            <div className="profile-section-heading">
              <span className="section-number">02</span>
              <h2>Make it your story</h2>
              {profile && (
                <span className="pill">
                  v{profile.version} ·{" "}
                  {dirty ? "UNSAVED" : profile.status.toUpperCase()}
                </span>
              )}
            </div>
            {!profile ? (
              <div className="empty-state">
                <span className="empty-symbol">✳</span>
                <h3>Your experience belongs here.</h3>
                <p>
                  Choose a sample to see skills, education, and projects with
                  the excerpts that support them.
                </p>
                <div className="placeholder-row" />
                <div className="placeholder-row short" />
              </div>
            ) : (
              <>
                <p className="profile-muted">
                  Review every item. Edits and additions become{" "}
                  <strong>user-reported</strong>; they are never presented as
                  original résumé evidence.
                </p>
                <fieldset disabled={!!busy} className="fact-list">
                  {edits.map((fact, index) => {
                    const evidence = sourceFor(fact);
                    return (
                      <article className="fact" key={fact.id}>
                        <div className="fact-top">
                          <span className="eyebrow">{fact.kind}</span>
                          <span className={`source ${evidence.source}`}>
                            {evidence.source === "resume"
                              ? "Résumé excerpt"
                              : "User-reported"}
                          </span>
                          <button
                            className="text-button remove"
                            aria-label={`Remove ${fact.label}`}
                            onClick={() => {
                              setEdits(edits.filter((_, i) => i !== index));
                              setDirty(true);
                              setSuggestions(null);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <label className="field">
                          {fact.kind === "skill"
                            ? "Skill"
                            : fact.kind === "education"
                              ? "Credential or study"
                              : "Project or role"}
                          <input
                            maxLength={160}
                            value={fact.label}
                            onChange={(e) =>
                              edit(index, { label: e.target.value })
                            }
                          />
                        </label>
                        {fact.kind !== "skill" && (
                          <>
                            <label className="field">
                              {fact.kind === "education"
                                ? "Institution / details"
                                : "What you did"}
                              <textarea
                                rows={2}
                                maxLength={400}
                                value={fact.detail}
                                onChange={(e) =>
                                  edit(index, { detail: e.target.value })
                                }
                              />
                            </label>
                            <label className="field">
                              Dates, if known
                              <input
                                maxLength={80}
                                value={fact.dateText ?? ""}
                                placeholder="Not specified"
                                onChange={(e) =>
                                  edit(index, {
                                    dateText: e.target.value || null,
                                  })
                                }
                              />
                            </label>
                          </>
                        )}
                        {evidence.source === "resume" && (
                          <blockquote>{evidence.excerpt}</blockquote>
                        )}
                      </article>
                    );
                  })}
                  <div className="add-fact">
                    <label className="field">
                      Add a fact
                      <select
                        value={newKind}
                        onChange={(e) =>
                          setNewKind(e.target.value as Fact["kind"])
                        }
                      >
                        <option value="skill">Skill</option>
                        <option value="experience">Experience</option>
                        <option value="education">Education</option>
                      </select>
                    </label>
                    <label className="field">
                      Fact label
                      <input
                        value={newLabel}
                        maxLength={160}
                        placeholder="Something the résumé missed"
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                    </label>
                    <button
                      className="secondary"
                      disabled={!newLabel.trim() || edits.length >= 60}
                      onClick={() => {
                        setEdits([
                          ...edits,
                          {
                            id: `new-${crypto.randomUUID()}`,
                            kind: newKind,
                            label: newLabel.trim(),
                            detail: "",
                            dateText: null,
                          },
                        ]);
                        setNewLabel("");
                        setDirty(true);
                        setSuggestions(null);
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="actions">
                    <button
                      className="secondary"
                      disabled={
                        !edits.length || edits.some((f) => !f.label.trim())
                      }
                      onClick={() => save(false)}
                    >
                      Save draft
                    </button>
                    <button
                      className="button"
                      disabled={
                        !edits.length || edits.some((f) => !f.label.trim())
                      }
                      onClick={() => save(true)}
                    >
                      Confirm reviewed profile →
                    </button>
                  </div>
                </fieldset>
                {profile.embedding && !dirty && (
                  <p className="embedding-note">
                    {profile.embedding.simulated
                      ? "Demo embedding prepared — not usable for real matching."
                      : `Profile embedding ready: ${profile.embedding.dimensions} dimensions · ${profile.embedding.model}`}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
        {profile?.status === "confirmed" && !dirty && (
          <section className="card suggestions">
            {authenticated && (
              <p>
                <Link
                  href={`/career?profileId=${profile.profileId}&profileVersion=${profile.version}`}
                >
                  Find my next career steps with Gemini
                </Link>
              </p>
            )}
            <div className="profile-section-heading">
              <span className="section-number">03</span>
              <h2>Tell an honest résumé story</h2>
            </div>
            <p className="profile-muted">
              Foreground confirmed experience for a reviewed path. These
              suggestions reuse your words without adding achievements, metrics,
              or credentials. Path requirements below are synthetic demo
              fixtures.
            </p>
            <div className="actions">
              <label className="field">
                Sample career path
                <select
                  value={pathId}
                  disabled={!!busy}
                  onChange={(e) => {
                    setPathId(e.target.value);
                    setSuggestions(null);
                  }}
                >
                  {demoPaths.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary"
                disabled={!!busy}
                onClick={() =>
                  run("Finding supported résumé suggestions…", async () => {
                    const result = await api<{
                      suggestions: ResumeSuggestion[];
                    }>(
                      `${baseUrl}/${profile.profileId}/suggestions?pathId=${pathId}&version=${profile.version}`,
                    );
                    setSuggestions(result.suggestions);
                    setDecisions({});
                    setDrafts({});
                  })
                }
              >
                Find résumé suggestions
              </button>
            </div>
            {suggestions?.length === 0 && (
              <p className="notice">
                No confirmed experience directly supports these sample
                requirements. Add missing experience if you have it; don’t
                invent it.
              </p>
            )}
            {suggestions
              ?.filter((s) => decisions[s.id] !== "dismissed")
              .map((s) => (
                <article className="suggestion" key={s.id}>
                  <p>{s.reason}</p>
                  <small>
                    {s.source === "resume"
                      ? "Original résumé evidence"
                      : "User-reported evidence"}{" "}
                    · requirement {s.requirementId}
                  </small>
                  <label className="field">
                    Editable résumé draft
                    <textarea
                      value={drafts[s.id] ?? s.proposed}
                      onChange={(e) => {
                        setDrafts({ ...drafts, [s.id]: e.target.value });
                        setDecisions({ ...decisions, [s.id]: "accepted" });
                      }}
                    />
                  </label>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() =>
                        setDecisions({ ...decisions, [s.id]: "accepted" })
                      }
                    >
                      {decisions[s.id] === "accepted"
                        ? "Selected ✓"
                        : "Accept draft"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        setDecisions({ ...decisions, [s.id]: "dismissed" })
                      }
                    >
                      Reject
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        run("Copying…", async () => {
                          await navigator.clipboard.writeText(
                            drafts[s.id] ?? s.proposed,
                          );
                          setNotice(
                            "Copied. Check that your final wording stays accurate.",
                          );
                        })
                      }
                    >
                      Copy
                    </button>
                  </div>
                </article>
              ))}
            <p className="privacy-note">
              Draft choices stay on this page and do not change your confirmed
              profile. Copy any wording you want to keep.
            </p>
          </section>
        )}
        <footer>
          EmployHER <span>Built around evidence. Guided by you.</span>
        </footer>
      </main>
    </>
  );
}
