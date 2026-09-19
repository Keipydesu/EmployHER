import type { CareerAnalysis } from "./gemini-career.ts";
import { createHash } from "node:crypto";
import {
  CommandSchema,
  defaultPreferences,
  type Plan,
  type Preferences,
  type Profile,
} from "./contracts.ts";
import { OpportunityError } from "./engine.ts";
import { applyCommand, type PlanningCatalog } from "./state.ts";

export type SavedPlan = {
  version: number;
  profileId: string;
  profileVersion: number;
  catalogVersion: string;
  checklistVersions: Record<string, number>;
  preferenceVersion: number;
  preferences: Preferences;
  plan: Plan;
  staleActionIds: string[];
};
export type VersionedCatalog = PlanningCatalog & { version: string };
export function freshPlan(
  profile: Profile,
  catalog: VersionedCatalog,
): SavedPlan {
  const path =
    catalog.paths.find((p) => p.checkpoints.length) ?? catalog.paths[0];
  if (!path)
    throw new OpportunityError(
      "CATALOG_UNAVAILABLE",
      "Reviewed paths are unavailable.",
      503,
    );
  return {
    version: 0,
    profileId: profile.id,
    profileVersion: profile.version,
    catalogVersion: catalog.version,
    checklistVersions: Object.fromEntries(
      catalog.paths.map((p) => [p.id, p.version]),
    ),
    preferenceVersion: 1,
    preferences: structuredClone(defaultPreferences),
    plan: { version: 0, pathId: path.id, actions: [], confirmations: [] },
    staleActionIds: [],
  };
}
// A read can reconcile stale guidance without silently advancing the saved CAS version.
export function reconcilePlan(
  saved: SavedPlan,
  profile: Profile,
  catalog: VersionedCatalog,
): SavedPlan {
  const next = structuredClone(saved);
  const changed =
    saved.profileId !== profile.id ||
    saved.profileVersion !== profile.version ||
    saved.catalogVersion !== catalog.version;
  const changedPaths = new Set(
    catalog.paths
      .filter((p) => saved.checklistVersions[p.id] !== p.version)
      .map((p) => p.id),
  );
  for (const id of Object.keys(saved.checklistVersions))
    if (!catalog.paths.some((p) => p.id === id)) changedPaths.add(id);
  next.staleActionIds = [
    ...new Set([
      ...saved.staleActionIds,
      ...saved.plan.actions
        .filter((a) => changed || changedPaths.has(a.pathId))
        .map((a) => a.id),
    ]),
  ];
  next.plan.confirmations = changed
    ? []
    : next.plan.confirmations.filter((c) => !changedPaths.has(c.pathId));
  next.profileId = profile.id;
  next.profileVersion = profile.version;
  next.catalogVersion = catalog.version;
  next.checklistVersions = Object.fromEntries(
    catalog.paths.map((p) => [p.id, p.version]),
  );
  if (!catalog.paths.some((p) => p.id === next.plan.pathId))
    next.plan.pathId = freshPlan(profile, catalog).plan.pathId;
  return next;
}
export function changePlan(
  saved: SavedPlan,
  profile: Profile,
  catalog: VersionedCatalog,
  raw: unknown,
  now = new Date(),
  recommendation?: CareerAnalysis["recommendations"][number],
): SavedPlan {
  const command = CommandSchema.parse(raw);
  if (["reset", "profile", "add-evidence"].includes(command.kind))
    throw new OpportunityError(
      "INVALID_COMMAND",
      "Update profile evidence through profile review.",
      400,
    );
  if (profile.status !== "confirmed")
    throw new OpportunityError(
      "PROFILE_UNCONFIRMED",
      "Confirm the profile first.",
    );
  const next = reconcilePlan(saved, profile, catalog);
  if (command.kind === "select-recommendation") {
    if (command.expectedVersion !== next.version)
      throw new OpportunityError(
        "STALE_VERSION",
        "Your plan changed. Reload before saving.",
        409,
      );
    if (!recommendation)
      throw new OpportunityError(
        "INVALID_COMMAND",
        "Load a current verified recommendation first.",
        400,
      );
    if (next.plan.actions.filter((a) => a.state === "selected").length >= 3)
      throw new OpportunityError(
        "ACTION_LIMIT",
        "Keep at most three active actions. Complete or remove one first.",
        409,
      );
    if (next.plan.actions.length >= 100)
      throw new OpportunityError(
        "HISTORY_LIMIT",
        "Remove old actions before saving more.",
        409,
      );
    const id = createHash("sha256")
      .update(JSON.stringify([profile.id, command.contextHash, command.index]))
      .digest("hex");
    if (next.plan.actions.some((a) => a.id === id))
      throw new OpportunityError(
        "ACTION_EXISTS",
        "This recommendation is already saved.",
        409,
      );
    const path = catalog.paths.find((p) => p.id === next.plan.pathId)!;
    next.plan.actions.push({
      id,
      pathId: path.id,
      skill: recommendation.skill,
      title: recommendation.title,
      deliverable: recommendation.deliverable,
      resourceId: recommendation.resourceIds[0] ?? null,
      state: "selected",
      profileVersion: profile.version,
      checklistVersion: path.version,
      recommendation: {
        contextHash: command.contextHash,
        index: command.index,
        why: recommendation.why,
        factIds: recommendation.factIds,
        sourceIds: recommendation.sourceIds,
        resourceIds: recommendation.resourceIds,
      },
    });
    next.version++;
    next.plan.version = next.version;
    return next;
  }
  const state = applyCommand(
    {
      version: next.version,
      profile,
      preferences: next.preferences,
      plan: next.plan,
    },
    command,
    now,
    catalog,
  );
  if (
    command.kind === "preferences" &&
    JSON.stringify(next.preferences) !== JSON.stringify(state.preferences)
  ) {
    next.preferenceVersion++;
    state.plan.confirmations = [];
    next.staleActionIds = [
      ...new Set([
        ...next.staleActionIds,
        ...state.plan.actions.map((a) => a.id),
      ]),
    ];
  }
  // Scope action identity to every input version, including repeated profile version numbers.
  if (command.kind === "select-action") {
    const action = state.plan.actions.at(-1)!;
    action.id = createHash("sha256")
      .update(
        JSON.stringify([
          profile.id,
          profile.version,
          catalog.version,
          next.preferenceVersion,
          action.pathId,
          action.checklistVersion,
          action.skill,
        ]),
      )
      .digest("hex");
    if (state.plan.actions.slice(0, -1).some((a) => a.id === action.id))
      throw new OpportunityError(
        "ACTION_EXISTS",
        "This action is already saved.",
      );
  }
  next.version = state.version;
  next.preferences = state.preferences;
  next.plan = state.plan;
  next.staleActionIds = next.staleActionIds.filter((id) =>
    next.plan.actions.some((a) => a.id === id),
  );
  return next;
}
