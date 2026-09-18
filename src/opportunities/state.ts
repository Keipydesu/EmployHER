import {
  CommandSchema,
  defaultPreferences,
  type Command,
  type Plan,
  type Preferences,
  type Profile,
  type Skill,
} from "./contracts.ts";
import {
  jobs,
  paths,
  profiles,
  resources,
  snapshot,
  embeddingConfig,
  vectorFor,
} from "./catalog.ts";
import {
  assessPath,
  eligibleJobs,
  fieldContext,
  OpportunityError,
  rankJobs,
  visibleResources,
} from "./engine.ts";
export type State = {
  version: number;
  profile: Profile;
  preferences: Preferences;
  plan: Plan;
};
export function initialState(): State {
  return {
    version: 1,
    profile: structuredClone(profiles[0]),
    preferences: structuredClone(defaultPreferences),
    plan: { version: 1, pathId: "cloud", actions: [], confirmations: [] },
  };
}
export function hasConfirmation(state: State, skill: Skill) {
  const path = paths.find((p) => p.id === state.plan.pathId)!;
  return state.plan.confirmations.some(
    (c) =>
      c.skill === skill &&
      c.pathId === path.id &&
      c.profileVersion === state.profile.version &&
      c.checklistVersion === path.version,
  );
}
export const deliverables: Record<Skill, string> = {
  python:
    "Write a small Python program and document inputs, outputs and what you learned.",
  sql: "Create a small dataset and explain three useful SQL queries.",
  git: "Publish a synthetic practice repository with clear commits and a README.",
  cloud:
    "Deploy a small practice app; document setup, access controls and cleanup.",
  access:
    "Document least-privilege access for a practice app and explain the choices.",
  monitoring:
    "Add a health check and demonstrate how you would investigate a failure.",
  statistics:
    "Analyze a small public dataset and explain assumptions and uncertainty.",
  modeling:
    "Train a simple baseline on a public dataset; document validation and limitations.",
  testing:
    "Write meaningful tests for a practice project and explain failure cases.",
  research:
    "Plan a small consent-based user study and summarize non-identifying findings.",
  circuits: "Document a simple circuit, its components and measured behavior.",
};
export function applyCommand(
  current: State,
  raw: Command,
  now = new Date(),
): State {
  const command = CommandSchema.parse(raw);
  if (command.expectedVersion !== current.version)
    throw new OpportunityError(
      "STALE_VERSION",
      "Your view changed. Refresh and try again.",
      409,
    );
  const state = structuredClone(current);
  const path = paths.find((p) => p.id === state.plan.pathId)!;
  if (command.kind === "reset") {
    const reset = initialState();
    reset.version = current.version + 1;
    reset.plan.version = reset.version;
    return reset;
  }
  if (command.kind === "profile") {
    const profile = profiles.find((p) => p.id === command.profileId)!;
    state.profile = {
      ...structuredClone(profile),
      version: state.profile.version + 1,
    };
    state.plan.confirmations = [];
  } else if (command.kind === "preferences")
    state.preferences = command.preferences;
  else if (command.kind === "path") {
    if (!paths.some((p) => p.id === command.pathId))
      throw new OpportunityError("NOT_FOUND", "Path not found.", 404);
    state.plan.pathId = command.pathId;
  } else if (command.kind === "action-state") {
    const action = state.plan.actions.find((a) => a.id === command.actionId);
    if (!action)
      throw new OpportunityError("NOT_FOUND", "Action not found.", 404);
    if (command.state === "remove")
      state.plan.actions = state.plan.actions.filter((a) => a.id !== action.id);
    else action.state = "done";
  } else {
    if (state.profile.status !== "confirmed")
      throw new OpportunityError(
        "PROFILE_UNCONFIRMED",
        "Confirm the profile before updating this plan.",
      );
    if (
      !assessPath(state.profile, path, jobs).checkpoints.some(
        (c) => c.skill === command.skill,
      )
    )
      throw new OpportunityError("NOT_FOUND", "Checkpoint not found.", 404);
    if (command.kind === "add-evidence") {
      if (!state.profile.evidence.some((e) => e.skill === command.skill))
        state.profile.evidence.push({
          skill: command.skill,
          source: "user_reported",
          excerpt: `Synthetic reviewed evidence: completed a ${command.skill} practice project.`,
        });
      state.profile.version++;
      state.profile.embedding = vectorFor(
        state.profile.evidence.map((e) => e.skill),
      );
      state.plan.confirmations = [];
    } else if (command.kind === "confirm-gap") {
      if (state.profile.evidence.some((e) => e.skill === command.skill))
        throw new OpportunityError(
          "ALREADY_EVIDENCED",
          "This checkpoint already has evidence.",
        );
      state.plan.confirmations = state.plan.confirmations.filter(
        (c) => !(c.pathId === path.id && c.skill === command.skill),
      );
      state.plan.confirmations.push({
        skill: command.skill,
        pathId: path.id,
        profileVersion: state.profile.version,
        checklistVersion: path.version,
        confirmedAt: now.toISOString(),
      });
    } else if (command.kind === "select-action") {
      if (!hasConfirmation(state, command.skill))
        throw new OpportunityError(
          "CONFIRMATION_REQUIRED",
          "Clarify the learning need before selecting an action.",
        );
      const id = `${path.id}:${command.skill}:${state.profile.version}`;
      if (state.plan.actions.some((a) => a.id === id))
        throw new OpportunityError(
          "ACTION_EXISTS",
          "This action is already saved.",
        );
      if (state.plan.actions.filter((a) => a.state === "selected").length >= 3)
        throw new OpportunityError(
          "ACTION_LIMIT",
          "Keep at most three active actions. Complete or remove one first.",
          409,
        );
      if (state.plan.actions.length >= 100)
        throw new OpportunityError(
          "HISTORY_LIMIT",
          "Remove old actions before adding another.",
          409,
        );
      const resource = visibleResources(
        path.id,
        state.preferences,
        resources,
        now,
      ).find((r) => r.skill === command.skill);
      state.plan.actions.push({
        id,
        pathId: path.id,
        skill: command.skill,
        title: `Practice ${command.skill}`,
        deliverable: deliverables[command.skill],
        resourceId: resource?.id ?? null,
        state: "selected",
        profileVersion: state.profile.version,
        checklistVersion: path.version,
      });
    }
  }
  state.version++;
  state.plan.version = state.version;
  return state;
}
export function present(state: State, now = new Date()) {
  const path = paths.find((p) => p.id === state.plan.pathId)!;
  let matches: ReturnType<typeof rankJobs> = [],
    matchError: string | null = null;
  try {
    matches = rankJobs(
      state.profile,
      jobs.filter((j) => j.pathId === path.id),
      state.preferences,
    );
  } catch (error) {
    if (error instanceof OpportunityError) matchError = error.message;
    else throw error;
  }
  const assessment = assessPath(state.profile, path, jobs);
  return {
    mode: "synthetic-demo" as const,
    version: state.version,
    profile: state.profile,
    profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
    preferences: state.preferences,
    plan: state.plan,
    paths: paths.map((p) => ({
      id: p.id,
      title: p.title,
      parentId: p.parentId,
      ...(({ supported, total, coverage }) => ({ supported, total, coverage }))(
        assessPath(state.profile, p, jobs),
      ),
    })),
    assessment: {
      ...assessment,
      checkpoints: assessment.checkpoints.map((c) => ({
        ...c,
        confirmedGap: hasConfirmation(state, c.skill),
        deliverable: hasConfirmation(state, c.skill)
          ? deliverables[c.skill]
          : null,
      })),
    },
    matches: matches.map(({ job, strengths, gaps, requirementsAvailable }) => ({
      job,
      strengths,
      gaps: gaps.map((gap) =>
        hasConfirmation(state, gap.skill)
          ? {
              ...gap,
              state: "not_evidenced" as const,
              reason:
                "You confirmed this learning need. A practice action is available in the checkpoint.",
            }
          : gap,
      ),
      requirementsAvailable,
    })),
    matchError,
    filteredOut:
      jobs.filter((j) => j.pathId === path.id && j.status === "open").length -
      eligibleJobs(
        jobs.filter((j) => j.pathId === path.id),
        state.preferences,
      ).length,
    context: fieldContext(path, jobs, state.preferences),
    resources: visibleResources(path.id, state.preferences, resources, now),
    catalogVersion: snapshot,
    embeddingConfig,
    rankingVersion: "v1",
    staleActions: state.plan.actions
      .filter(
        (a) =>
          a.profileVersion !== state.profile.version ||
          a.checklistVersion !== paths.find((p) => p.id === a.pathId)?.version,
      )
      .map((a) => a.id),
  };
}
export type View = ReturnType<typeof present>;
