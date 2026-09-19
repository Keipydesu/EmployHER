import { CommandSchema } from "./contracts.ts";
import type { Interests } from "./interests.ts";
import { createHash } from "node:crypto";
import type { ProfileRepository } from "../profile/ports.ts";
import type { Profile as StoredProfile } from "../profile/contracts.ts";
import type {
  CareerAnalyses,
  AnalysisScope,
} from "../server/platform/career-analyses.ts";
import {
  GeminiCareerAI,
  validateCareerAnalysis,
  type CareerContext,
} from "./gemini-career.ts";
import { bridgeProfile } from "./profile-bridge.ts";
import { careerGuidance } from "./patterns.ts";
import {
  OpportunityError,
  rankJobs,
  visibleResources,
  eligibleJobs,
} from "./engine.ts";
import type { CareerPlans } from "../server/platform/career-plans.ts";
import type { ReviewedCatalog } from "../server/platform/catalog.ts";
import type { SavedPlan } from "./saved-plan.ts";
export class CareerService {
  constructor(
    private profiles: Pick<ProfileRepository, "get">,
    private plans: Pick<CareerPlans, "read" | "update">,
    private catalog: Pick<ReviewedCatalog, "active" | "retrieve">,
    private model: string,
    private synthesis?: {
      ai: GeminiCareerAI;
      store: Pick<CareerAnalyses, "read" | "generate">;
      authorize: (profile: StoredProfile) => Promise<void>;
    },
    private interests?: { read(owner: string): Promise<Interests> },
  ) {}
  private async context(owner: string, id: string, version: number) {
    const stored = await this.profiles.get(owner, id);
    if (!stored)
      throw new OpportunityError("NOT_FOUND", "Profile unavailable.", 404);
    if (stored.version !== version)
      throw new OpportunityError(
        "STALE_VERSION",
        "Profile changed. Reload it.",
        409,
      );
    const bridge = bridgeProfile(stored, { ownerId: owner, model: this.model });
    const catalog = await this.catalog.active();
    if (
      catalog.embeddingModel !== bridge.embeddingSpace.model ||
      catalog.embeddingConfig !== bridge.embeddingSpace.config
    )
      throw new OpportunityError(
        "INVALID_VECTOR",
        "Profile and catalog embedding spaces differ.",
      );
    const interests = this.interests ? await this.interests.read(owner) : null;
    if (interests && !interests.fields.length)
      throw new OpportunityError(
        "ONBOARDING_REQUIRED",
        "Choose your fields of interest first.",
        409,
      );
    return { bridge, catalog, stored, interests };
  }
  private scopedPlan(
    context: Awaited<ReturnType<CareerService["context"]>>,
    saved: SavedPlan,
  ): SavedPlan {
    const fields = context.interests?.fields;
    if (!fields) return saved;
    const pathId = fields.includes(
      saved.plan.pathId as Interests["fields"][number],
    )
      ? saved.plan.pathId
      : fields.find((id) => context.catalog.paths.some((p) => p.id === id));
    if (!pathId)
      throw new OpportunityError(
        "CATALOG_UNAVAILABLE",
        "Your selected fields have no reviewed catalog yet.",
        503,
      );
    return { ...saved, plan: { ...saved.plan, pathId } };
  }
  private async checkInterests(owner: string, version?: number) {
    if (
      version !== undefined &&
      this.interests &&
      (await this.interests.read(owner)).version !== version
    )
      throw new OpportunityError(
        "STALE_VERSION",
        "Your interests changed. Reload your guidance.",
        409,
      );
  }
  private analysisContext(
    owner: string,
    context: Awaited<ReturnType<CareerService["context"]>>,
    saved: SavedPlan,
  ) {
    const { bridge, catalog, stored } = context;
    const path = catalog.paths.find((p) => p.id === saved.plan.pathId)!;
    const jobs = eligibleJobs(catalog.jobs, saved.preferences).filter(
      (j) => j.pathId === path.id,
    );
    const guidance = careerGuidance(
      bridge.profile,
      path,
      saved.plan,
      jobs,
      saved.preferences,
      catalog.resources,
      catalog.version,
    );
    const input: CareerContext = {
      path: { id: path.id, title: path.title },
      facts: stored.facts.map((f) => ({
        id: f.id,
        label: f.label,
        detail: f.detail,
        source: f.evidence.source,
      })),
      sources: jobs.flatMap((j) => [
        ...j.requirements.map((r) => ({
          id: `${j.id}:${r.id}`,
          jobId: j.id,
          text: r.excerpt,
          url: j.sourceUrl,
          importance: r.importance,
        })),
        ...(j.qualificationNotes ?? []).map((note, i) => ({
          id: `${j.id}:note:${i}`,
          jobId: j.id,
          text: note,
          url: j.sourceUrl,
          importance: "context",
        })),
      ]),
      resources: visibleResources(
        path.id,
        saved.preferences,
        catalog.resources,
      ).map((r) => ({
        id: r.id,
        title: r.title,
        claim: r.claim,
        eligibility: r.eligibility,
        cost: r.cost,
      })),
      confirmedSkills: guidance.checkpoints
        .filter((c) => c.state === "confirmed_learning_need")
        .map((c) => c.skill),
    };
    const model = this.synthesis?.ai.model ?? "unconfigured";
    const contextHash = createHash("sha256")
      .update(
        JSON.stringify([
          "career-v1",
          model,
          stored.profileId,
          stored.version,
          catalog.version,
          saved.preferences,
          context.interests?.version,
          input,
        ]),
      )
      .digest("hex");
    const scope: AnalysisScope = {
      owner,
      profileId: stored.profileId,
      profileVersion: stored.version,
      catalogVersion: catalog.version,
      planVersion: saved.version,
      model,
      contextHash,
      interestVersion: context.interests?.version,
    };
    return { input, scope };
  }
  private async view(
    owner: string,
    context: Awaited<ReturnType<CareerService["context"]>>,
    saved: SavedPlan,
  ) {
    saved = this.scopedPlan(context, saved);
    const { bridge, catalog } = context;
    const path = catalog.paths.find((p) => p.id === saved.plan.pathId);
    if (!path)
      throw new OpportunityError("NOT_FOUND", "Path unavailable.", 404);
    const candidates = await this.catalog.retrieve(
      catalog,
      bridge.profile.embedding,
      saved.preferences,
      path.id,
    );
    const matches = bridge.profile.evidence.length
      ? rankJobs(bridge.profile, candidates, saved.preferences)
      : [];
    const now = new Date();
    const guidance = careerGuidance(
      bridge.profile,
      path,
      saved.plan,
      catalog.jobs,
      saved.preferences,
      catalog.resources,
      catalog.version,
      now,
    );
    const analysisContext = this.analysisContext(owner, context, saved);
    const cached = this.synthesis
      ? await this.synthesis.store.read(analysisContext.scope)
      : null;
    const analysis = cached
      ? validateCareerAnalysis(cached, analysisContext.input)
      : null;
    await this.plans.read(owner, bridge.profile, catalog);
    await this.checkInterests(owner, context.interests?.version);
    return {
      mode: "authenticated" as const,
      interestVersion: context.interests?.version ?? 0,
      saved,
      profile: {
        id: bridge.profile.id,
        version: bridge.profile.version,
        evidence: bridge.profile.evidence,
        evidenceLinks: bridge.evidenceLinks,
        unmappedFacts: bridge.unmappedFacts,
      },
      paths: catalog.paths
        .filter(
          (p) =>
            !context.interests ||
            context.interests.fields.includes(
              p.id as Interests["fields"][number],
            ),
        )
        .map((p) => ({ id: p.id, title: p.title })),
      guidance,
      analysis,
      analysisContextHash: analysisContext.scope.contextHash,
      analysisSources: analysisContext.input.sources,
      matches: matches.map(
        ({ job, strengths, gaps, requirementsAvailable }) => {
          const { embedding: _embedding, ...publicJob } = job;
          void _embedding;
          return { job: publicJob, strengths, gaps, requirementsAvailable };
        },
      ),
      resources: visibleResources(
        path.id,
        saved.preferences,
        catalog.resources,
        now,
      ),
      limitation:
        "Listing mentions guide exploration; alternatives and preferred qualifications are not mandatory eligibility rules. Coverage is not a hiring probability.",
    };
  }
  async analyze(
    owner: string,
    id: string,
    version: number,
    catalogVersion: string,
    key: string,
  ) {
    if (!this.synthesis)
      throw new OpportunityError(
        "AI_NOT_CONFIGURED",
        "Career analysis is not configured.",
        503,
      );
    const context = await this.context(owner, id, version);
    if (context.catalog.version !== catalogVersion)
      throw new OpportunityError(
        "STALE_CATALOG",
        "Catalog changed. Reload guidance.",
        409,
      );
    await this.synthesis.authorize(context.stored);
    const saved = this.scopedPlan(
      context,
      await this.plans.read(owner, context.bridge.profile, context.catalog),
    );
    const { input, scope } = this.analysisContext(owner, context, saved);
    await this.synthesis.store.generate(scope, key, () =>
      this.synthesis!.ai.analyze(input, AbortSignal.timeout(20000)),
    );
    return this.view(owner, context, saved);
  }
  async read(owner: string, id: string, version: number) {
    const context = await this.context(owner, id, version);
    return this.view(
      owner,
      context,
      await this.plans.read(owner, context.bridge.profile, context.catalog),
    );
  }
  async update(
    owner: string,
    id: string,
    version: number,
    catalogVersion: string,
    command: unknown,
    key: string,
  ) {
    const context = await this.context(owner, id, version);
    if (context.catalog.version !== catalogVersion)
      throw new OpportunityError(
        "STALE_CATALOG",
        "Catalog changed. Reload guidance.",
        409,
      );
    const requested = CommandSchema.parse(command);
    let recommendation;
    if (requested.kind === "select-recommendation") {
      if (!this.synthesis)
        throw new OpportunityError(
          "AI_NOT_CONFIGURED",
          "Career analysis is unavailable.",
          503,
        );
      const plan = this.scopedPlan(
        context,
        await this.plans.read(owner, context.bridge.profile, context.catalog),
      );
      if (plan.version !== requested.expectedVersion)
        throw new OpportunityError(
          "STALE_VERSION",
          "Your plan changed. Reload before saving.",
          409,
        );
      const current = this.analysisContext(owner, context, plan);
      if (current.scope.contextHash !== requested.contextHash)
        throw new OpportunityError(
          "STALE_ANALYSIS",
          "Generate a current recommendation before saving.",
          409,
        );
      const stored = await this.synthesis.store.read(current.scope);
      if (!stored)
        throw new OpportunityError(
          "NOT_FOUND",
          "Recommendation unavailable.",
          404,
        );
      recommendation = validateCareerAnalysis(stored, current.input)
        .recommendations[requested.index];
      if (!recommendation)
        throw new OpportunityError(
          "NOT_FOUND",
          "Recommendation unavailable.",
          404,
        );
    }
    if (
      requested?.kind === "path" &&
      context.interests &&
      !context.interests.fields.includes(
        requested.pathId as Interests["fields"][number],
      )
    )
      throw new OpportunityError(
        "FIELD_NOT_SELECTED",
        "Add this field to your interests first.",
        400,
      );
    const saved = await this.plans.update(
      owner,
      context.bridge.profile,
      context.catalog,
      command,
      key,
      context.interests ?? undefined,
      recommendation,
    );
    return this.view(owner, context, saved);
  }
}
